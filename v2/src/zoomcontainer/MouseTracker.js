// Copyright (c) Microsoft Corporation
// All rights reserved. 
// BSD License
//
// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
// following conditions are met:
//
// Redistributions of source code must retain the above copyright notice, this list of conditions and the following
// disclaimer.
//
// Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following
// disclaimer in the documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS ""AS IS"" AND ANY EXPRESS OR IMPLIED WARRANTIES,
// INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
// WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE

/*global SD, SDDebug_warn, addEventListener, SDMouse_getPosition, SDElement_getPosition, SDEvent_add, window, SDEvent_remove, SDEvent_cancel, SDEvent_stop, SDMouse_getScroll, SDEventManager*/
/*jshint strict: false */

(function () {

    // DUPLICATION CHECK -- necessary here because of private static state
    if (SD.MouseTracker) {
        return;
    }

    // Constants

    // update: IE9 implements the W3C standard event model! =)
    var lteIE8 = typeof addEventListener !== "function",

    // Static fields

        buttonDownAny = false,

        mousedown,
        mouseup,
        mouseover,
        mouseout,
        mousemove,

        ieCapturingAny = false,
        ieTrackersActive = {},      // dictionary from hash to MouseTracker
        ieTrackersCapturing = [];   // list of trackers interested in capture

    // Choose appropriate event names for the platform
    if (navigator.msPointerEnabled) {
        mousedown = "MSPointerDown";
        mouseup = "MSPointerUp";
        mouseover = "MSPointerOver";
        mouseout = "MSPointerOut";
        mousemove = "MSPointerMove";
    } else {
        mousedown = "mousedown";
        mouseup = "mouseup";
        mouseover = "mouseover";
        mouseout = "mouseout";
        mousemove = "mousemove";
    }

    // Static helpers

    function getMouseAbsolute(event) {
        return SDMouse_getPosition(event);
    }

    function getMouseRelative(event, elmt) {
        var mouse = SDMouse_getPosition(event),
            offset = SDElement_getPosition(elmt);

        return mouse.minus(offset);
    }

    /*
     * Returns true if elmtB is a child node of elmtA, or if they're equal.
     */
    function isChild(elmtA, elmtB) {
        var body = document.body;
        while (elmtB && elmtA !== elmtB && body !== elmtB) {
            try {
                elmtB = elmtB.parentNode;
            } catch (e) {
                // Firefox sometimes fires events for XUL elements, which throws
                // a "permission denied" error. so this is not a child.
                return false;
            }
        }
        return elmtA === elmtB;
    }

    function onGlobalMouseDown() {
        buttonDownAny = true;
    }

    function onGlobalMouseUp() {
        buttonDownAny = false;
    }

    // the W3C event model lets us listen to the capture phase of events, so
    // to know if the mouse is globally up or down, we'll listen to the
    // capture phase of the window's events. we can't do this in IE, so
    // we'll give it a best effort by listening to the regular bubble phase,
    // and on the document since window isn't legal in IE for mouse events.
    if (lteIE8) {
        SDEvent_add(document, mousedown, onGlobalMouseDown, false);
        SDEvent_add(document, mouseup, onGlobalMouseUp, false);
    } else {
        SDEvent_add(window, mousedown, onGlobalMouseDown, true);
        SDEvent_add(window, mouseup, onGlobalMouseUp, true);
    }

    // Class

    /**
     * A mouse tracker, which listens for mouse events on the given element
     * and raises custom events which have been sanitized to avoid browser
     * incompatibilities. Events that will be raised:
     * <dl>
     * <dt>enter</dt><dd>function(tracker, id, position, buttonDownElmt, buttonDownAny)</dd>
     * <dt>exit</dt><dd>function(tracker, id, position, buttonDownElmt, buttonDownAny)</dd>
     * <dt>press</dt><dd>function(tracker, id, position)</dd>
     * <dt>release</dt><dd>function(tracker, id, position, insideElmtPress, insideElmtRelease)</dd>
     * <dt>click</dt><dd>function(tracker, id, position, quick, shift, isInputElmt)</dd>
     * <dt>drag</dt><dd>function(tracker, id, position, delta, shift)</dd>
     * <dt>scroll</dt><dd>function(tracker, position, scroll, shift)</dd>
     * </dl>
     * @class MouseTracker
     * @namespace Seadragon2
     * @extends Seadragon2.EventManager
     * @constructor
     * @param elmt {HTMLElement} the element on which this mouse tracker must
     * listen for input
     * @param options {object?} may contain:
     * <dl>
     * <dt>clickTimeThreshold</dt>
     * <dd>number - the maximum time between mousedown and mouseup to count as
     * a click event</dd>
     * <dt>clickDistThreshold</dt>
     * <dd>number - the maximum number of pixels the pointer may move between
     * mousedown and mouseup to count as a click event</dd>
     * </dl>
     */
    SD.MouseTracker = function (elmt, options) {
        options = options || {};

        // Fields

        var self = this,
            ieSelf,

            hash = Math.random(),     // a unique hash for this tracker

            tracking = false,
            capturing = 0,
            buttonDownElmt = {},
            insideElmt = {},

            lastPoint = {},           // position of last mouse down/move
            lastMouseDownTime = {},   // time of last mouse down
            lastMouseDownPoint = {},  // position of last mouse down

            // a list of tag names we want to ignore click events for, since
            // these mouse trackers will often be used on HTML content.
            ignorables = {
                A: 1,
                INPUT: 1,
                TEXTAREA: 1,
                SELECT: 1,
                OPTION: 1,
                OPTGROUP: 1,
                BUTTON: 1,
                LABEL: 1
            },

            // Config options

            clickTimeThreshold = options.clickTimeThreshold || 500,
            clickDistThreshold = options.clickDistThreshold || 5;

        // Properties

        this.target = elmt;

        // IE-specific helpers

        function triggerOthers(eventName, event) {
            // update: protecting against properties added to the Object class's
            // prototype, which can and does happen (e.g. through js libraries)
            var trackers = ieTrackersActive,
                otherHash;
            for (otherHash in trackers) {
                if (trackers.hasOwnProperty(otherHash) && hash !== otherHash) {
                    trackers[otherHash][eventName](event);
                }
            }
        }

        function hasMouse() {
            var prop;
            for (prop in insideElmt) {
                if (insideElmt.hasOwnProperty(prop) && insideElmt[prop]) {
                    return true;
                }
            }
            return false;
        }

        // Listeners

        function onMouseOver(event) {
            event = event || window.event;

            // IE capturing model doesn't raise or bubble the events on any
            // other element if we're capturing currently. so pass this event to
            // other elements being tracked so they can adjust if the element
            // was from them or from a child. however, IE seems to always fire
            // events originating from parents to those parents, so don't double
            // fire the event if the event originated from a parent.
            if (lteIE8 && capturing && !isChild(event.srcElement, elmt)) {
                triggerOthers("onMouseOver", event);
            }

            // similar to onMouseOut() tricky bubbling case...
            var to = event.target || event.srcElement,
                from = event.relatedTarget || event.fromElement,
                id = event.pointerId || 0;
            if (!isChild(elmt, to) || isChild(elmt, from)) {
                // the mouseover needs to end on this or a child node, and it
                // needs to start from this or an outer node.
                return;
            }

            insideElmt[id] = true;

            self.trigger("enter", self, id, getMouseRelative(event, elmt),
                !!buttonDownElmt[id], buttonDownAny);
        }

        function onMouseOut(event) {
            event = event || window.event;

            // similar to onMouseOver() case for IE capture model
            if (lteIE8 && capturing && !isChild(event.srcElement, elmt)) {
                triggerOthers("onMouseOut", event);
            }

            // we have to watch out for a tricky case: a mouseout occurs on a
            // child element, but the mouse is still inside the parent element.
            // the mouseout event will bubble up to us. this happens in all
            // browsers, so we need to correct for this.
            var from = event.target || event.srcElement,
                to = event.relatedTarget || event.toElement,
                id = event.pointerId || 0;
            if (!isChild(elmt, from) || isChild(elmt, to)) {
                // the mouseout needs to start from this or a child node, and it
                // needs to end on this or an outer node.
                return;
            }

            insideElmt[id] = false;

            self.trigger("exit", self, id, getMouseRelative(event, elmt),
                !!buttonDownElmt[id], buttonDownAny);
        }

        function onMouseDown(event) {
            event = event || window.event;

            // don't consider right-clicks (fortunately this is cross-browser)
            if (event.button === 2) {
                return;
            }

            var id = event.pointerId || 0;
            buttonDownElmt[id] = true;

            // this shouldn't be necessary, but experience suggests that Chrome
            // doesn't always fire the mouseover event when we'd expect it to.
            // since the user is clicking inside the element, the mouse must have
            // gotten here somehow.
            insideElmt[id] = true;

            lastMouseDownPoint[id] = lastPoint[id] = getMouseAbsolute(event);
            lastMouseDownTime[id] = new Date().getTime();

            self.trigger("press", self, id, getMouseRelative(event, elmt));

            if (self.listListeners("press") || self.listListeners("drag")) {
                // if a press or drag handler is registered, don't drag-drop images, etc.
                SDEvent_cancel(event);
            }

            if (!lteIE8 || !ieCapturingAny) {
                captureMouse();
                ieCapturingAny = true;
                ieTrackersCapturing = [ieSelf];     // reset to empty & add us
            } else if (lteIE8) {
                ieTrackersCapturing.push(ieSelf);   // add us to the list
            }
        }

        function handleMouseClick(event) {
            event = event || window.event;

            // don't consider right-clicks (fortunately this is cross-browser)
            if (event.button === 2) {
                return;
            }

            var id = event.pointerId || 0,
                time = new Date().getTime() - lastMouseDownTime[id],
                point = getMouseAbsolute(event),
                distance = lastMouseDownPoint[id].distanceTo(point),
                quick = time <= clickTimeThreshold &&
                    distance <= clickDistThreshold,
                target = event.target,
                body = document.body,
                isInputElmt = false;

            for (target = event.target; target && target !== elmt && target !== body; target = target.parentNode) {
                if (ignorables.hasOwnProperty(target.tagName)) {
                    // the user is interacting with some sort of input element; most apps will want to ignore this click.
                    isInputElmt = true;
                }
            }

            self.trigger("click", self, id, getMouseRelative(event, elmt),
                quick, event.shiftKey, isInputElmt);
        }

        function onMouseUp(event) {
            event = event || window.event;
            var id = event.pointerId || 0,
                insideElmtPress = !!buttonDownElmt[id],
                insideElmtRelease = !!insideElmt[id];

            // don't consider right-clicks (fortunately this is cross-browser)
            if (event.button === 2) {
                return;
            }

            buttonDownElmt[id] = false;

            self.trigger("release", self, id, getMouseRelative(event, elmt),
                insideElmtPress, insideElmtRelease);

            // some browsers sometimes don't fire click events when we're also
            // listening for mouseup events. i'm not sure why, it could be
            // something i'm doing. in the meantime, this is a temporary fix.
            if (insideElmtPress && insideElmtRelease) {
                handleMouseClick(event);
            }
        }

        /*
         * Only triggered once by the deepest element that initially received
         * the mouse down event. We want to make sure THIS event doesn't bubble.
         * Instead, we want to trigger the elements that initially received the
         * mouse down event (including this one) only if the mouse is no longer
         * inside them. Then, we want to release capture, and emulate a regular
         * mouseup on the event that this event was meant for.
         */
        function onMouseUpIE(event) {
            event = event || window.event;
            var i, tracker;

            // don't consider right-clicks (fortunately this is cross-browser)
            if (event.button === 2) {
                return;
            }

            // first trigger those that were capturing
            for (i = 0; i < ieTrackersCapturing.length; i++) {
                tracker = ieTrackersCapturing[i];
                if (!tracker.hasMouse()) {
                    tracker.onMouseUp(event);
                }
            }

            // then release capture and emulate a regular event
            releaseMouse();
            ieCapturingAny = false;
            event.srcElement.fireEvent("on" + event.type,
                document.createEventObject(event));

            // make sure to stop this event -- shouldn't bubble up
            SDEvent_stop(event);
        }

        /*
         * Only triggered in W3C browsers by elements within which the mouse was
         * initially pressed, since they are now listening to the window for
         * mouseup during the capture phase. We shouldn't handle the mouseup
         * here if the mouse is still inside this element, since the regular
         * mouseup handler will still fire.
         */
        function onMouseUpWindow(event) {
            if (!insideElmt[event.pointerId || 0]) {
                onMouseUp(event);
            }

            releaseMouse();
        }

        function onMouseMove(event) {
            event = event || window.event;
            var id = event.pointerId || 0,
                point = getMouseAbsolute(event),
                delta = point.minus(lastPoint[id] || point);

            lastPoint[id] = point;

            if (delta.x || delta.y) {
                self.trigger("drag", self, id, getMouseRelative(event, elmt),
                    delta, event.shiftKey);
            }

            if (self.listListeners("drag")) {
                // since a drag handler was registered, don't allow highlighting, etc.
                SDEvent_cancel(event);
            }
        }

        /*
         * Only triggered once by the deepest element that initially received
         * the mouse down event. Since no other element has captured the mouse,
         * we want to trigger the elements that initially received the mouse
         * down event (including this one).
         */
        function onMouseMoveIE(event) {
            // manually trigger those that are capturing
            var i;
            for (i = 0; i < ieTrackersCapturing.length; i++) {
                ieTrackersCapturing[i].onMouseMove(event);
            }

            // make sure to stop this event -- shouldn't bubble up. note that at
            // the time of this writing, there is no harm in letting it bubble,
            // but a minor change to our implementation would necessitate this.
            SDEvent_stop(event);
        }

        function onMouseScroll(event) {
            event = event || window.event;
            var delta = SDMouse_getScroll(event);

            // FF2 and FF3/Mac (possibly others) seem to sometimes fire
            // extraneous scroll events. check for those.
            if (delta) {
                self.trigger("scroll", self, getMouseRelative(event, elmt),
                    delta, event.shiftKey);
            }

            if (self.listListeners("scroll")) {
                // since a scroll handler was registered, don't scroll the page, etc.
                SDEvent_cancel(event);
            }
        }

        // Helpers

        function startTracking() {
            if (!tracking) {
                SDEvent_add(elmt, mouseover, onMouseOver, false);
                SDEvent_add(elmt, mouseout, onMouseOut, false);
                SDEvent_add(elmt, mousedown, onMouseDown, false);
                SDEvent_add(elmt, mouseup, onMouseUp, false);
                SDEvent_add(elmt, "mousewheel", onMouseScroll, false);

                tracking = true;
                ieTrackersActive[hash] = ieSelf;
            }
        }

        function stopTracking() {
            if (tracking) {
                SDEvent_remove(elmt, mouseover, onMouseOver, false);
                SDEvent_remove(elmt, mouseout, onMouseOut, false);
                SDEvent_remove(elmt, mousedown, onMouseDown, false);
                SDEvent_remove(elmt, mouseup, onMouseUp, false);
                SDEvent_remove(elmt, "mousewheel", onMouseScroll, false);

                while (capturing) {
                    releaseMouse();
                }
                tracking = false;
                delete ieTrackersActive[hash];
            }
        }

        function captureMouse() {
            if (!capturing) {
                // IE lets the element capture the mouse directly, but other
                // browsers use the capture phase on the highest element.
                if (lteIE8) {
                    // we need to capture the mouse, but we also don't want to
                    // handle mouseup like normally (special case for bubbling)
                    SDEvent_remove(elmt, mouseup, onMouseUp, false);
                    SDEvent_add(elmt, mouseup, onMouseUpIE, true);
                    SDEvent_add(elmt, mousemove, onMouseMoveIE, true);
                } else {
                    SDEvent_add(window, mouseup, onMouseUpWindow, true);
                    SDEvent_add(window, mousemove, onMouseMove, true);
                }
            }
            ++capturing;
        }

        function releaseMouse() {
            if (capturing === 1) {
                // similar reasoning as captureMouse()
                if (lteIE8) {
                    // we need to release the mouse, and also go back to handling
                    // mouseup like normal (no longer a hack for capture phase)
                    SDEvent_remove(elmt, mousemove, onMouseMoveIE, true);
                    SDEvent_remove(elmt, mouseup, onMouseUpIE, true);
                    SDEvent_add(elmt, mouseup, onMouseUp, false);
                } else {
                    SDEvent_remove(window, mousemove, onMouseMove, true);
                    SDEvent_remove(window, mouseup, onMouseUpWindow, true);
                }
            }
            --capturing;
        }

        // constructor

        ieSelf = {
            hasMouse: hasMouse,
            onMouseOver: onMouseOver,
            onMouseOut: onMouseOut,
            onMouseUp: onMouseUp,
            onMouseMove: onMouseMove
        };

        // inherit from EventManager, since we'll trigger named events
        SDEventManager.call(this);

        // Methods

        /**
         * Returns true if this mouse tracker is currently active.
         * @method isTracking
         * @return {boolean}
         */
        this.isTracking = function () {
            return tracking;
        };

        /**
         * Enable or disable tracking the mouse.
         * @method setTracking
         * @param track {boolean}
         */
        this.setTracking = function (track) {
            if (track) {
                startTracking();
            } else {
                stopTracking();
            }
        };

    };

}());

var SDMouseTracker = SD.MouseTracker;
