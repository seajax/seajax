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

/*global SD, SDPoint, SDObject_extend, SDViewport, SDMouseTracker, SVGSVGElement, window,
SDSVGZoomContainer, HTMLCanvasElement, SDCanvasZoomContainer, SDHTMLZoomContainer,
SDElement_getStyle, SDTimer, SDEventManager, SDMath_max*/
/*jshint strict: false */

/**
 * <p>A basic Viewer. It will set up a MouseTracker on the specified container object,
 * and a Viewport to handle basic zooming interaction. It may contain any number of
 * ZoomContainers, and update each of them during each "change" event from the Viewport.
 * Alternately, the user of this Viewer may specify that it should ignore the change
 * event, and instead call its redraw method when appropriate (this flow is best for
 * any Viewer whose content will be animating as well as zooming).</p>
 * <p>Some apps may wish to subclass Viewer, to give it more abilities or override
 * the default behaviors for mouse inputs and viewport handling. For example, a
 * zoom.it-style photo viewer would need to add some buttons, and a pivot-style
 * viewer would need to manage collection layout and zoom to a selected item on click.</p>
 * <p>Viewer is an EventManager which triggers the following event:</p>
 * <dl>
 * <dt>resize</dt>
 * <dd>function(width, height): The Viewer has been resized onscreen, and has automatically
 * adjusted its container coordinates.</dd>
 * </dl>
 * @class Viewer
 * @namespace Seadragon2
 * @extends Seadragon2.EventManager
 * @constructor
 * @param container {HTMLElement} The onscreen container in which this viewer exists.
 * @param options {object} Optional, may contain any of the Viewer's writeable properties,
 * as well as the following:
 * <dl>
 * <dt>viewportOptions</dt>
 * <dd>An object containing any Viewport options that should be applied when building
 * the Viewport associated with this Viewer.</dd>
 * </dl>
 */
var SDViewer = SD.Viewer = function (container, options) {
    options = options || {};

    var viewport,
        tracker,
        self = this,
        mouseDownPixel = {},
        mouseDownCenter,
        mousePosition = {},
        documentElementStyle = document.documentElement.style,
        goodCursorBrowser = !window.opera,
        containerWidth,
        containerHeight,
        padding,
        lastResizeCheck = 0,
        moveCursorSet,
        contactPoints = 0,
        pinchStartPixel, // center point of pinch gesture in screen pixels
        pinchStartSize, // distance between touch points, in pixels, at beginning of pinch
        pinchStartZoom, // zoom factor at beginning of pinch
        pinchStartPoint, // center point of pinch gesture in viewport coordinates
        disableMomentum,
        timerToken;

    // default options. we would put these on the object's prototype
    // if we were building many of them.
    /**
     * The factor by which the zoom level should increase when the user clicks.
     * Shift-clicking will zoom out by the same factor.
     * @property zoomPerClick
     * @type number
     * @default 2
     */
    self.zoomPerClick = 2;
    /**
     * The factor by which the zoom level should increase when the user scrolls
     * the mouse wheel forward once. Scrolling it backward will have the inverse
     * effect. Default value is set so that three consecutive scrolls
     * doubles the onscreen size of content.
     * @property zoomPerScroll
     * @type number
     * @default 2^(1/3)
     */
    self.zoomPerScroll = Math.pow(2, 1 / 3);
    /**
     * Whether the Viewer zooms in toward the mouse's position. If false, it will
     * zoom in toward the center of the displayed content.
     * @property zoomInToPoint
     * @type bool
     * @default true
     */
    self.zoomInToPoint = true;
    /**
     * Whether the Viewer zooms out around the mouse's current position. If false,
     * it zooms from the center of the displayed content.
     * @property zoomOutToPoint
     * @type bool
     * @default true
     */
    self.zoomOutToPoint = true;
    /**
     * Whether the user can pan the viewport by dragging their mouse (or touch point).
     * @property isPannable
     * @type bool
     * @default true
     */
    self.isPannable = true;
    /**
     * Whether the user can zoom the content by scrolling, clicking, pinching, etc.
     * @property isZoomable
     * @type bool
     * @default true
     */
    self.isZoomable = true;
    /**
     * Whether the Viewer should prevent the user from panning out of bounds during
     * a pan movement. If false, the Viewer will still move the content back in bounds
     * after the user releases.
     * @property constrainDuringPan
     * @type bool
     * @default false
     */
    self.constrainDuringPan = false;
    /**
     * Whether the Viewer should ignore "change" events raised by its Viewport. If false,
     * the Viewer will listen for "change" events and update all attached ZoomContainers
     * whenever the event is raised.
     * @property ignoreChange
     * @type bool
     * @default false
     */
    self.ignoreChange = false;
    /**
     * Whether to let the Viewport begin sliding to rest whenever the user releases a
     * pan movement. Works well when combined with a short spring duration, such as
     * options.viewportOptions.springOptions.animationTime = .05 seconds.
     * @property useMomentum
     * @type bool
     * @default true
     */
    self.useMomentum = true;
    /**
     * The CSS mouse cursor to set during a drag operation. If empty/null/undefined,
     * none will be set.
     * @property dragCursor
     * @type string
     * @default "move"
     */
    self.dragCursor = "move";

    /**
     * An object specifying how much extra space (in pixels) to use on each side of the
     * Viewport, inside the container object. Contains properties top, right, bottom,
     * and left, which are all numbers.
     * @property padding
     * @type object
     * @default {top:0,right:0,bottom:0,left:0}
     */
    self.padding = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    };

    /**
     * The collection of ZoomContainers that this Viewer manages.
     * @property zoomContainers
     * @type array of Seadragon2.ZoomContainer
     */

    // overwrite defaults with custom options
    SDObject_extend(self, options);

    // helpers

    function zoom(factor, position) {
        var zoomIn = factor > 1;
        viewport.zoomBy(
            factor,
            (zoomIn && self.zoomInToPoint) || (!zoomIn && self.zoomOutToPoint) ?
                viewport.pointFromPixel(position.minus(new SDPoint(self.padding.left, self.padding.top)), true) :
                null
        );
        viewport.applyConstraints();
    }

    function calculateDistance(points) {
        // we'll use average distance between all touch points. not super efficient implementation.
        var i, j, point, count = 0, total = 0, totalX = 0, totalY = 0;
        for (i in points) {
            if (points.hasOwnProperty(i)) {
                ++count;
                point = points[i];
                totalX += point.x;
                totalY += point.y;

                // add distances to each other point
                for (j in points) {
                    if (points.hasOwnProperty(j) && j !== i) {
                        total += point.distanceTo(points[j]);
                    }
                }
            }
        }
        return {
            center: new SDPoint(totalX / count, totalY / count),
            size: total / count / (count - 1)
        };
    }

    // Mouse interaction with zoomable area

    function onClick(tracker, id, position, quick, shift, input) {
        // ignore clicks where mouse moved, or clicks on HTML input elements
        if (quick && self.isZoomable && !input) {
            var zoomPerClick = self.zoomPerClick;
            var factor = shift ? 1 / zoomPerClick : zoomPerClick;
            zoom(factor, position);
        }
    }

    function onPress(tracker, id, position) {
        mouseDownPixel[id] = mousePosition[id] = position;
        ++contactPoints;
        mouseDownCenter = viewport.getCenter();
        if (contactPoints > 1) {
            var pinchStartInfo = calculateDistance(mouseDownPixel);
            position = pinchStartInfo.center;
            pinchStartPixel = position;
            pinchStartSize = pinchStartInfo.size;
            pinchStartZoom = viewport.getZoom();
            pinchStartPoint =
                viewport.pointFromPixel(position.minus(new SDPoint(self.padding.left, self.padding.top)), true);
        }
    }

    function onDrag(tracker, id, position, delta) {
        mousePosition[id] = position;

        var startPixel, size = -1;
        if (contactPoints > 1) {
            var pinchInfo = calculateDistance(mousePosition);
            position = pinchInfo.center;
            size = pinchInfo.size;
            startPixel = pinchStartPixel;
        } else {
            startPixel = mouseDownPixel[id];
        }

        if (self.isZoomable && size >= 0) {
            // choose a new zoom level and zoom to it
            var zoomRatio = size / pinchStartSize;
            var zoom = zoomRatio * pinchStartZoom;
            viewport.zoomTo(zoom, undefined, true);

            // compute the distance we've dragged at the starting zoom level
            var dragDistance = viewport.deltaPointsFromPixels(position.minus(startPixel)).times(zoomRatio);

            // apply an inverse scale-and-translate transformation about the pinch point
            // so that pinchStartPoint can remain the center of the pinch as it moves
            var center = mouseDownCenter.minus(dragDistance).minus(pinchStartPoint).divide(zoomRatio).plus(pinchStartPoint);

            // set the center
            viewport.panTo(center, true);

            viewport.applyConstraints();
        } else if (self.isPannable) {
            // note that in both cases, we're negating delta pixels since
            // dragging is opposite of panning. analogy is adobe viewer,
            // dragging up scrolls down.
            var deltaPixels = position.minus(startPixel);
            var deltaPoints = viewport.deltaPointsFromPixels(deltaPixels.negate(), true);
            viewport.panTo(mouseDownCenter.plus(deltaPoints));
            if (self.constrainDuringPan) {
                viewport.applyConstraints();
            }

            // opera has some weird quirks with dynamically changing cursor styles,
            // and tends to fail to reset the cursor to a pointer afterward, which
            // looks bad.
            var dragCursor = self.dragCursor;
            if (goodCursorBrowser && !moveCursorSet && dragCursor) {
                moveCursorSet = true;
                documentElementStyle.cursor = dragCursor;
            }
        }
    }

    function onRelease(tracker, id, position, insideElmtPress) {
        if (insideElmtPress) {
            --contactPoints;
            delete mousePosition[id];
            delete mouseDownPixel[id];
            if (!contactPoints) {
                if (self.useMomentum && !disableMomentum) {
                    viewport.toss();
                }
                disableMomentum = false;
                viewport.applyConstraints();
            } else if (contactPoints === 1) {
                // figure out which touch ID is still in contact
                for (id in mousePosition) {
                    if (mousePosition.hasOwnProperty(id)) {
                        break;
                    }
                }
                // go back to panning behavior
                mouseDownPixel[id] = mousePosition[id];
                mouseDownCenter = viewport.getCenter();
                // disable momentum so it doesn't trigger accidentally on the end of pinching
                disableMomentum = true;
            }
        }
        if (moveCursorSet) {
            moveCursorSet = false;
            documentElementStyle.cursor = "";
        }
    }

    function onScroll(tracker, position, delta) {
        if (self.isZoomable) {
            var factor = Math.pow(self.zoomPerScroll, delta);
            zoom(factor, position);
        }
    }

    function onChange() {
        if (!self.ignoreChange) {
            self.redraw();
        }
    }

    // constructor

    function getPaddedSize(width, height) {
        return new SDPoint(
            SDMath_max(width - self.padding.right - self.padding.left, 1),
            SDMath_max(height - self.padding.top - self.padding.bottom, 1)
        );
    }

    function paddingChanged(padding, newPadding) {
        return Object.keys(padding).some(key => padding[key] !== newPadding[key])
    }

    (function () {
        containerWidth = SDMath_max(container.clientWidth, 1);
        containerHeight = SDMath_max(container.clientHeight, 1);
        padding = Object.assign({}, self.padding);
        var containerSize = new SDPoint(containerWidth, containerHeight),
            contentSize = self.contentSize || containerSize.times(1), // default is the container's pixel size
            zoomContainer,
            scaledContainerSize;

        // if the user supplied a zoomContainers option, skip this step. otherwise, set up
        // a zoom container based on the type of HTML element provided as the container
        // onscreen.
        if (!self.zoomContainers) {
            if (window.SVGSVGElement && container instanceof SVGSVGElement) {
                // due to a bug in firefox 4.0, it reports 0 for container.clientWidth and container.clientHeight.
                // work around it by using the measurement from getComputedStyle instead.
                var style = SDElement_getStyle(container);
                containerSize = new SDPoint(parseFloat(style.width), parseFloat(style.height));
                if (!self.contentSize) {
                    // for a SVG container, it makes the most sense to use whatever coordinate system
                    // was already in place for the SVG content.
                    contentSize = new SDPoint(container.viewBox.baseVal.width, container.viewBox.baseVal.height);
                    if (contentSize.x === 0 && contentSize.y === 0) {
                        // SVG element didn't have a viewBox explicitly set, so we can use
                        // its width and height instead.
                        contentSize = new SDPoint(container.width.baseVal.value, container.height.baseVal.value);
                    }
                }
                zoomContainer = new SDSVGZoomContainer(container);
            } else if (window.HTMLCanvasElement && container instanceof HTMLCanvasElement) {
                if (!self.contentSize) {
                    // the obvious default content size for a canvas element is its pixel dimensions
                    contentSize = new SDPoint(container.width, container.height);
                }
                zoomContainer = new SDCanvasZoomContainer(container);
            } else {
                zoomContainer = new SDHTMLZoomContainer(container);
            }
            self.zoomContainers = [zoomContainer];
        }

        // scale the container and content sizes if we're using padding
        scaledContainerSize = getPaddedSize(containerSize.x, containerSize.y);
        contentSize.x *= scaledContainerSize.x / containerSize.x;
        contentSize.y *= scaledContainerSize.y / containerSize.y;

        // initialize the viewport
        viewport = new SDViewport(scaledContainerSize, contentSize, options.viewportOptions);

        // inherit from EventManager
        SDEventManager.call(self);

        // In IE10, we have to block manipulation events that would otherwise scroll or zoom the entire document.
        container.style.msTouchAction = "none";
    }());
    tracker = new SDMouseTracker(container);
    tracker.addListener("click", onClick);
    tracker.addListener("press", onPress);
    tracker.addListener("drag", onDrag);
    tracker.addListener("release", onRelease);
    tracker.addListener("scroll", onScroll);
    tracker.setTracking(true);
    viewport.addListener("change", onChange);

    // periodically check the bounds of the Viewer, and react to changes as necessary.
    timerToken = SDTimer.register(function () {
        // only do this every 30 frames because it is quite expensive.
        lastResizeCheck = (lastResizeCheck + 1) % 30;

        if (lastResizeCheck === 0) {
            var newContainerWidth = SDMath_max(container.clientWidth, 1),
                newContainerHeight = SDMath_max(container.clientHeight, 1);

            if (newContainerWidth !== containerWidth || newContainerHeight !== containerHeight || paddingChanged(padding, self.padding)) {
                containerWidth = newContainerWidth;
                containerHeight = newContainerHeight;
                padding = Object.assign({}, self.padding);
                viewport.resize(getPaddedSize(newContainerWidth, newContainerHeight), true);
                self.trigger("resize", newContainerWidth, newContainerHeight);
            }
        }

        return true;
    });

    // methods

    /**
     * Get the bounds of the Viewer, in content coordinates. For most cases, this will
     * be the same result as directly calling the Viewport's getBounds method. However,
     * if the viewer is using padding, the viewer's bounds will be larger than those of
     * the viewport.
     * @method getBounds
     * @param current whether to use the current position, as opposed to the target of
     * an in-progress movement
     * @return {Seadragon2.Rect}
     */
    self.getBounds = function (current) {
        var bounds = viewport.getBounds(current),
            containerSize = viewport.getContainerSize();

        // adjust the bounds outward to include the padding area
        bounds.x -= bounds.width * self.padding.left / containerSize.x;
        bounds.y -= bounds.height * self.padding.top / containerSize.y;
        bounds.width *= 1 + (self.padding.left + self.padding.right) / containerSize.x;
        bounds.height *= 1 + (self.padding.top + self.padding.bottom) / containerSize.y;

        return bounds;
    };

    /**
     * Update any attached ZoomContainers, using the current position of the Viewport.
     * @method redraw
     */
    self.redraw = function () {
        // fetch any useful values from the viewport
        var bounds = self.getBounds(true),
            zoom = viewport.getZoom(true),
            zoomContainers = self.zoomContainers,
            i;

        // iterate through attached ZoomContainers and update them
        for (i = zoomContainers.length - 1; i >= 0; i--) {
            zoomContainers[i].update(bounds, zoom);
        }
    };

    /**
     * Dispose the Viewer. No other operation on the Viewer is valid afterward.
     * @method dispose
     * @param keepContainers {bool} Whether to avoid disposing of the attached zoom containers
     */
    self.dispose = function (keepContainers) {
        // stop checking for resizes
        SDTimer.unregister(timerToken);

        if (!keepContainers) {
            var containers = self.zoomContainers, i, n = containers.length, cur;
            for (i = 0; i < n; ++i) {
                cur = containers[i];
                if (cur.dispose) {
                    cur.dispose();
                }
            }
        }
    };

    // call it once so that ZoomContainers set their initial positions
    self.redraw();

    // public getters. these should be treated as read-only and constant.
    // they are provided so that subclasses (or any other user of this class)
    // can change mouse behaviors or programatically modify the viewport.

    /**
     * The viewport associated with this viewer.
     * @property viewport
     * @final
     * @type Seadragon2.Viewport
     */
    self.viewport = viewport;

    /**
     * The mouse tracker associated with this viewer.
     * @property tracker
     * @final
     * @type Seadragon2.MouseTracker
     */
    self.tracker = tracker;
};
