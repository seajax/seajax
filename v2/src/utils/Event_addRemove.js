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

// Event_addRemove.js
// Defines the Seadragon2.Event.add() and remove() methods.

/*global SDEvent, SDDebug_error, SDFunction_EMPTY, event, attachEvent, detachEvent */
/*jslint strict: false */

// these comments are copied from Event.js, so that they YUI doc correctly.
/**
 *  A utility class for working with DOM and custom events.
 *  @class Event
 *  @namespace Seadragon2
 *  @static
 */
/**
 *  Given the argument to an event handler, retrieve the event object.
 *  @method $
 *  @static
 *  @param {Event} e? The argument passed to the event handler.
 *  @return {Event} The event that has been raised.
 */

var

    /**
     *  Add an event handler. In browsers that properly handle capture and
     *  bubble phases, the handler will go on the specified phase.
     *  @method add
     *  @static
     *  @param {Element} elmt The element on which to add a handler.
     *  @param {string} eventName The name of the event (without "on").
     *  @param {function} handler The function to call when the event is fired.
     *  @param {boolean} capture Whether to register on capture phase, in regular
     *  browsers, or whether to setCapture in old versions of IE (two completely
     *  different things, unfortunately). This argument is optional, defaulting to
     *  the more sensible bubble phase.
     */
    SDEvent_add = SDEvent.add = (function () {

        // using a closure so that we do the cross-browser (i.e. IE) checks
        // only and exactly once instead of on every event add.

        // note: addEventListener() and attachEvent() are both methods on the
        // elements themselves, but they're also methods on window, which means
        // that they're global variables, so we can check for them as such.

        // case 1: W3C standard method
        if (typeof addEventListener === "function") {
            return function (elmt, eventName, handler, capture) {
                capture = capture || false;
                elmt.addEventListener(eventName, handler, capture);

                // special cases for mouse wheel: W3C standard event name is
                // DOMMouseScroll, but opera uses same mousewheel name as IE.
                if (eventName === "mousewheel") {
                    elmt.addEventListener("DOMMouseScroll", handler, capture);
                } else if (eventName === "DOMMouseScroll") {
                    elmt.addEventListener("mousewheel", handler, capture);
                }
            };
        }

        // case 2: IE method
        // IE8 and below somehow think that this type is "object", not "function",
        // so we'll just check for existence.
        if (typeof attachEvent !== "undefined") {
            return function (elmt, eventName, handler, capture) {
                elmt.attachEvent("on" + eventName, handler);

                // special case for mouse wheel: IE uses mousewheel name.
                if (eventName === "DOMMouseScroll") {
                    elmt.attachEvent("onmousewheel", handler);
                }

                if (capture && elmt.setCapture) {
                    elmt.setCapture();
                }
            };
        }

        // case 3: nothing to do, return empty function
        SDDebug_error("Seadragon2.Event: no add ability.");
        return SDFunction_EMPTY;

    }()),

    /**
     *  Remove an event handler that was added with Event.add.
     *  @method remove
     *  @static
     *  @param {Element} elmt The HTML element.
     *  @param {string} eventName The name of the event (without "on").
     *  @param {function} handler The callback function to remove.
     *  @param {boolean} capture Whether the event handler was registered
     *  on the capture phase earlier, or (IE) whether to releaseCapture.
     */
    SDEvent_remove = SDEvent.remove = (function () {

        // using a closure so that we do the cross-browser (i.e. IE) checks
        // only and exactly once instead of on every event remove.

        // note: removeEventListener() and detachEvent() are both methods on the
        // elements themselves, but they're also methods on window, which means
        // that they're global variables, so we can check for them as such.

        // case 1: W3C standard method
        if (typeof removeEventListener === "function") {
            return function (elmt, eventName, handler, capture) {
                capture = capture || false;
                elmt.removeEventListener(eventName, handler, capture);

                // special cases for mouse wheel: W3C standard event name is
                // DOMMouseScroll, but opera uses same mousewheel name as IE.
                if (eventName === "mousewheel") {
                    elmt.removeEventListener("DOMMouseScroll", handler, capture);
                } else if (eventName === "DOMMouseScroll") {
                    elmt.removeEventListener("mousewheel", handler, capture);
                }
            };
        }

        // case 2: IE method
        if (typeof detachEvent !== "undefined") {
            return function (elmt, eventName, handler, capture) {
                elmt.detachEvent("on" + eventName, handler);

                // special case for mouse wheel: IE uses mousewheel name.
                if (eventName === "DOMMouseScroll") {
                    elmt.detachEvent("onmousewheel", handler);
                }

                if (capture && elmt.releaseCapture) {
                    elmt.releaseCapture();
                }
            };
        }

        // case 3: nothing to do, return empty function
        SDDebug_error("Seadragon2.Event: no remove ability.");
        return SDFunction_EMPTY;

    }());
