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

/*global SD, SDPoint, SDSpring, SDMath_log2, SDMath_clamp, SDRect, SDEventManager, SDTimer*/
/*jshint strict: false */

/**
 * The viewport handles resizing math, zooming about a given point, etc.
 * It contains Springs for the position and zoom of the content, and is capable
 * of using them to provide appropriate animations for zooming and panning
 * behavior. This class raises the following events:
 * <dl>
 * <dt>change</dt>
 * <dd>function(viewport): The viewport's zoom or center values
 * have changed as a result of the current call to update().</dd>
 * </dl>
 * @class Viewport
 * @namespace Seadragon2
 * @extends Seadragon2.EventManager
 * @constructor
 * @param containerSize {Seadragon2.Point} The size of the viewport's container
 * onscreen, in pixels. It may be modified later by calling the resize method.
 * @param contentSize {Seadragon2.Point} The size of the content, in user-defined
 * coordinates. The user of this viewport should choose a coordinate space that
 * makes sense for the elements being displayed (a single image could be normalized
 * to width 1, for instance). It is assumed that the scaling factor is the same
 * in both directions. For example, a contentSize of (x:2, y:1) should be displayed
 * twice as wide as its height, regardless of the container size.
 * @param options {object} (optional) May contain any of the following:
 * <dl>
 * <dt>panSpringOptions</dt>
 * <dd>An options object to be passed to this Viewport's pan Springs when they are created.</dd>
 * <dt>zoomSpringOptions</dt>
 * <dd>An options object to be passed to this Viewport's zoom Springs when they are created.</dd>
 * <dt>visibilityRatio</dt>
 * <dd>The amount of content which must stay onscreen when applyConstraints is called.
 * A visibilityRatio of 0 allows the content to move entirely offscreen, whereas a
 * visibilityRatio of 1 requires that the entire container area be covered with content,
 * if possible. Default is 0.8.</dd>
 * <dt>wrapHorizontal</dt>
 * <dd>Whether the content should connect at the right and left sides, such as 360-degree
 * panoramas. Default is false.</dd>
 * <dt>wrapVertical</dt>
 * <dd>Whether the content should connect at the top and bottom edges.</dd>
 * <dt>selfUpdating</dt>
 * <dd>Whether the Viewport is responsible for listening for the global timer and updating
 * itself on every tick. Default is true. Otherwise, the application using this Viewport
 * is responsible for calling its update() method periodically.</dd>
 * <dt>maxZoom</dt>
 * <dd>The maximum allowable zoom ratio for the content. Default is 2.</dd>
 * <dt>minZoom</dt>
 * <dd>The minimum allowable zoom ratio for the content. Default is 0.8.</dd>
 * </dl>
 */
var SDViewport = SD.Viewport = function (containerSize, contentSize, options) {
    containerSize = new SDPoint(containerSize.x, containerSize.y); // copy
    options = options || {};

    // Fields

    var self = this,

        contentAspect,
        contentHeight,
        contentWidth,

        panSpringOptions = options.panSpringOptions || {
            animationTime: 0.35
        },
        centerSpringX = new SDSpring(panSpringOptions),
        centerSpringY = new SDSpring(panSpringOptions),
        zoomSpring = new SDSpring(options.zoomSpringOptions),
        zoomPoint = null,

        homeBounds,

        containerAspect = containerSize.x / containerSize.y,
        widthRatio,

        // options
        wrapHorizontal = options.wrapHorizontal || false,
        wrapVertical = options.wrapVertical || false,
        selfUpdating = (options.selfUpdating !== false),

        timerToken = {}, // just some object, all it must do is === itself

        // optimizations (stored values for getters)
        dirtyFlag = true,
        currentZoom,
        targetZoom,
        currentExpZoom,
        targetExpZoom,
        currentWidthZoom,
        targetWidthZoom,
        currentZoomPercent,
        targetZoomPercent,
        currentCenter,
        targetCenter,
        currentBounds,
        targetBounds;

    // Properties

    /**
     * The maximum zoom ratio allowed whenever applyConstraints is called.
     * @property maxZoom
     * @type number
     * @default 2
     */
    this.maxZoom = typeof options.maxZoom === "number" ? options.maxZoom : 2;

    /**
     * The minimum zoom ratio allowed whenever applyConstraints is called.
     * @property minZoom
     * @type number
     * @default 0.8
     */
    this.minZoom = typeof options.minZoom === "number" ? options.minZoom : 0.8;

    /**
     * The minimum amount of the viewport that should contain content, between 0 and 1.
     * @property visibilityRatio
     * @type number
     * @default 0.8
     */
    this.visibilityRatio = typeof options.visibilityRatio === "number" ? options.visibilityRatio : 0.8;

    // Helpers

    function init() {
        // inherit from EventManager, since we'll trigger named events:
        // change     function(viewport, center, zoom)
        SDEventManager.call(self);

        self.resizeContent(contentSize);

        self.goHome(true);
        self.update();
        if (selfUpdating) {
            SDTimer.register(self.update, timerToken);
        }
    }

    function pow2(x) {
        return Math.pow(2, x);
    }

    function clampPointToRect(point, rect) {
        var xOld = point.x,
            yOld = point.y,
            xNew = SDMath_clamp(xOld, rect.x, rect.x + rect.width),
            yNew = SDMath_clamp(yOld, rect.y, rect.y + rect.height);

        return (xOld === xNew && yOld === yNew) ? point :
            new SDPoint(xNew, yNew);
    }

    function getCenterConstraintRect(current) {
        var zoom = self.getWidthZoom(current),
            width = contentWidth / zoom,
            height = width / containerAspect,
            xMin = (self.visibilityRatio - 0.5) * width,
            yMin = (self.visibilityRatio - 0.5) * height,
            xDelta = contentWidth - 2 * xMin,
            yDelta = contentHeight - 2 * yMin;

        if (xDelta < 0) {
            xMin += (0.5 * xDelta);
            xDelta = 0;
        }

        if (yDelta < 0) {
            yMin += (0.5 * yDelta);
            yDelta = 0;
        }

        return new SDRect(xMin, yMin, xDelta, yDelta);
    }

    // Helpers -- OPTIMIZATION
    // Basically, pre-compute every possible getter result.

    function generateZooms() {
        var currentSpring = zoomSpring.getCurrent(),
            targetSpring = zoomSpring.getTarget();
        currentExpZoom = currentSpring;
        targetExpZoom = targetSpring;
        currentZoom = pow2(currentSpring);
        targetZoom = pow2(targetSpring);
        currentWidthZoom = currentZoom * widthRatio;
        targetWidthZoom = targetZoom * widthRatio;
        var minZoom = SDMath_log2(self.minZoom),
            maxZoom = SDMath_log2(self.maxZoom);
        currentZoomPercent = (currentExpZoom - minZoom) / (maxZoom - minZoom) * 100;
        targetZoomPercent = (targetExpZoom - minZoom) / (maxZoom - minZoom) * 100;
    }

    function generateCenter(current) {
        var centerCurrent = new SDPoint(
            centerSpringX.getCurrent(),
            centerSpringY.getCurrent()
        );
        var centerTarget = new SDPoint(
            centerSpringX.getTarget(),
            centerSpringY.getTarget()
        );

        if (current) {
            return centerCurrent;
        } else if (!zoomPoint) {
            // no adjustment necessary since we're not zooming
            return centerTarget;
        }

        // to get the target center, we need to adjust for the zoom point.
        // we'll do this in the same way as the update() method.

        // manually calculate bounds based on this unadjusted target center.
        // this is mostly a duplicate of getBounds() above. note that this is
        // based on the TARGET zoom but the CURRENT center.
        var zoom = self.getWidthZoom();
        var width = contentWidth / zoom;
        var height = width / containerAspect;
        var bounds = new SDRect(
            centerCurrent.x - width / 2,
            centerCurrent.y - height / 2,
            width,
            height
        );

        // the conversions here are identical to the pixelFromPoint() and
        // deltaPointsFromPixels() methods.
        var oldZoomPixel = self.pixelFromPoint(zoomPoint, true);
        var newZoomPixel = zoomPoint.minus(bounds.getTopLeft()).times(containerSize.x / bounds.width);
        var deltaZoomPixels = newZoomPixel.minus(oldZoomPixel);
        var deltaZoomPoints = deltaZoomPixels.divide(containerSize.x / contentWidth * zoom);

        // finally, shift center to negate the change.
        return centerTarget.plus(deltaZoomPoints);
    }

    function generateBounds(current) {
        var center = self.getCenter(current),
            width = contentWidth / self.getWidthZoom(current),
            height = width / containerAspect;

        return new SDRect(center.x - width / 2, center.y - height / 2,
            width, height);
    }

    function generateAll() {
        dirtyFlag = false;
        // this order is important: generating center may depend on
        // calling pixelFromPoint, which in turn depends on current bounds!
        generateZooms();
        currentCenter = generateCenter(true);
        currentBounds = generateBounds(true);
        targetCenter = generateCenter();
        targetBounds = generateBounds();
    }

    function copyRect(rect) {
        return new SDRect(rect.x, rect.y, rect.width, rect.height);
    }

    function copyPoint(point) {
        return new SDPoint(point.x, point.y);
    }

    // Methods -- ACCESSORS

    /**
     * Get a copy of the current container dimensions, in pixels.
     * @method getContainerSize
     * @return {Seadragon2.Point}
     */
    this.getContainerSize = function () {
        return copyPoint(containerSize);
    };

    /**
     * Get the bounds of the displayed content, in content coordinates.
     * @method getBounds
     * @param current {bool} True to get the current value, false to get
     * the target value (at the end of the current animation).
     * @return {Seadragon2.Rect}
     */
    this.getBounds = function (current) {
        if (dirtyFlag) {
            generateAll();
        }
        return copyRect(current ? currentBounds : targetBounds);
    };

    /**
     * Get the center of the displayed content, in content coordinates.
     * @method getCenter
     * @param current {bool} True for current value, or false for target value.
     * @return {Seadragon2.Point}
     */
    this.getCenter = function (current) {
        if (dirtyFlag) {
            generateAll();
        }
        return copyPoint(current ? currentCenter : targetCenter);
    };

    /**
     * Get the zoom factor, with home zoom = 1.
     * @method getZoom
     * @param current {bool} True for current, false for target
     * @return {number}
     */
    this.getZoom = function (current) {
        if (dirtyFlag) {
            generateAll();
        }
        return current ? currentZoom : targetZoom;
    };

    /**
     * Get the viewport's zoom as an exponential number (home zoom = 0, 2x zoom = 1, 4x zoom = 2, etc.).
     * This is the way zoom is tracked internally so that animations and percentages look right.
     * @method getExpZoom
     * @param current {bool} True for current, false for target
     * @return {number}
     */
    this.getExpZoom = function (current) {
        if (dirtyFlag) {
            generateAll();
        }
        return current ? currentExpZoom : targetExpZoom;
    };

    /**
     * Get the ratio of the content's width to the viewport's width. In many cases, this will
     * be the same as the number returned by getZoom(), but it will be different if the
     * content's aspect ratio is smaller than the viewport's.
     * @method getWidthZoom
     * @param current {bool} True for current, false for target
     * @return {number}
     */
    this.getWidthZoom = function (current) {
        if (dirtyFlag) {
            generateAll();
        }
        return current ? currentWidthZoom : targetWidthZoom;
    };

    /**
     * Get the viewport's exponential zoom, scaled so that 0 is min zoom and 100 is max zoom.
     * This is useful for zoom sliders and such.
     * @method getZoomPercent
     * @param current {bool} True for current, false for target
     * @return {number}
     */
    this.getZoomPercent = function (current) {
        if (dirtyFlag) {
            generateAll();
        }
        return current ? currentZoomPercent : targetZoomPercent;
    };

    // Methods -- MODIFIERS

    /**
     * Ensure that the minZoom, maxZoom, and visibilityRatio are respected.
     * @method applyConstraints
     * @param immediately {bool} True to move right away, false to animate.
     */
    this.applyConstraints = function (immediately) {
        // first, apply zoom constraints
        var oldZoom = self.getZoom();
        var newZoom = SDMath_clamp(oldZoom, self.minZoom, self.maxZoom);
        if (oldZoom !== newZoom) {
            self.zoomTo(newZoom, zoomPoint, immediately);
        }

        // transform newZoom to be a width zoom, not an absolute zoom
        newZoom *= widthRatio;

        // then, apply pan constraints -- but do so via fitBounds() in order to
        // account for (and adjust) the zoom point! also ignore constraints if
        // content is being wrapped! but differentiate horizontal vs. vertical.
        var oldCenter = self.getCenter();
        var newCenter = clampPointToRect(oldCenter, getCenterConstraintRect());
        if (wrapHorizontal) {
            newCenter.x = oldCenter.x;
        }
        if (wrapVertical) {
            newCenter.y = oldCenter.y;
        }
        if (!oldCenter.equals(newCenter)) {
            var width = contentWidth / newZoom,
                height = width / containerAspect;
            self.fitBounds(new SDRect(
                newCenter.x - 0.5 * width,
                newCenter.y - 0.5 * height,
                width,
                height
            ), immediately);
        }
    };

    /**
     * Move the viewport so that the specified bounds are displayed.
     * @method fitBounds
     * @param bounds {Seadragon2.Rect} the new bounds, in content coordinates.
     * @param immediately {bool} True to move right now, false to animate the transition
     */
    this.fitBounds = function (bounds, immediately) {
        var aspect = containerAspect;
        var center = bounds.getCenter();

        // resize bounds to match viewport's aspect ratio, maintaining center.
        // note that zoom = 1/width, and width = height*aspect.
        var newBounds = new SDRect(bounds.x, bounds.y, bounds.width, bounds.height);
        if (newBounds.getAspectRatio() >= aspect) {
            // width is bigger relative to viewport, resize height
            newBounds.height = bounds.width / aspect;
            newBounds.y = center.y - newBounds.height / 2;
        } else {
            // height is bigger relative to viewport, resize width
            newBounds.width = bounds.height * aspect;
            newBounds.x = center.x - newBounds.width / 2;
        }

        // stop movement first! this prevents the operation from missing
        self.panTo(self.getCenter(true), true);
        self.zoomTo(self.getZoom(true), null, true);

        // capture old values for bounds and width. we need both, but we'll
        // also use both for redundancy, to protect against precision errors.
        // note: use target bounds, since update() hasn't been called yet!
        var oldBounds = self.getBounds();
        var oldZoom = self.getWidthZoom();

        // if we're already at the correct zoom, just pan and we're done.
        // we'll check whether the zoom values are "close enough", to protect against
        // precision errors (see note below).
        var newZoom = contentWidth / newBounds.width;
        if (newZoom * 1.000001 > oldZoom && newZoom * 0.999999 < oldZoom) {
            self.panTo(center, immediately);
            return;
        }

        // otherwise, we need to zoom about the only point whose pixel transform
        // is constant between the old and new bounds. this is just tricky math.
        var refPoint = oldBounds.getTopLeft().times(containerSize.x / oldBounds.width).minus(
                newBounds.getTopLeft().times(containerSize.x / newBounds.width)
            ).divide(
                containerSize.x / oldBounds.width - containerSize.x / newBounds.width
            );

        // note: that last line (cS.x / oldB.w - cS.x / newB.w) was causing a
        // divide by 0 in the case that oldBounds.width == newBounds.width.
        // that should have been picked up by the zoom check, but in certain
        // cases, the math is slightly off and the zooms are different. so now,
        // the zoom check has an extra check added.

        self.zoomTo(newZoom / widthRatio, refPoint, immediately);
    };

    /**
     * Return to the home zoom. This is the same as calling fitBounds on the entire
     * size of the content, unless the viewport is using wrapping.
     * @method goHome
     * @param immediately {bool} True to jump, false to animate
     */
    this.goHome = function (immediately) {
        // calculate center adjusted for zooming
        var center = self.getCenter();

        // if we're wrapping horizontally, "unwind" the horizontal spring
        if (wrapHorizontal) {
            // this puts center.x into the range e.g. [0, 1) always
            center.x = (contentWidth + (center.x % contentWidth)) % contentWidth;
            centerSpringX.resetTo(center.x);
            centerSpringX.update();
        }

        // if we're wrapping vertically, "unwind" the vertical spring
        if (wrapVertical) {
            // this puts center.y into the range e.g. [0, 0.75) always
            center.y = (contentHeight + (center.y % contentHeight)) % contentHeight;
            centerSpringY.resetTo(center.y);
            centerSpringY.update();
        }

        self.fitBounds(homeBounds, immediately);
    };

    /**
     * Pan the viewport by the specified amount.
     * @method panBy
     * @param delta {Seadragon2.Point} The amount to pan, in content coordinates.
     * @param immediately {bool} Whether to move immediately, as opposed to animating.
     */
    this.panBy = function (delta, immediately) {
        self.panTo(self.getCenter().plus(delta), immediately);
    };

    /**
     * Pan the viewport to the specified center point.
     * @method panTo
     * @param center {Seadragon2.Point} The point on the content which should move to
     * the center of the viewport.
     * @param immediately {bool} True to move immediately, false to use springs.
     */
    this.panTo = function (center, immediately) {
        // we have to account for zoomPoint here, i.e. if we're in the middle
        // of a zoom about some point and panTo() is called, we should be
        // spring to some center that will get us to the specified center.
        // the logic here is thus the exact inverse of the getCenter() method.

        if (immediately) {
            centerSpringX.resetTo(center.x);
            centerSpringY.resetTo(center.y);
            dirtyFlag = true;
            return;
        }

        if (!zoomPoint) {
            centerSpringX.springTo(center.x);
            centerSpringY.springTo(center.y);
            dirtyFlag = true;
            return;
        }

        // manually calculate bounds based on this unadjusted target center.
        // this is mostly a duplicate of getBounds() above. note that this is
        // based on the TARGET zoom but the CURRENT center.
        var zoom = self.getWidthZoom();
        var width = contentWidth / zoom;
        var height = width / containerAspect;
        var bounds = new SDRect(
            centerSpringX.getCurrent() - width / 2,
            centerSpringY.getCurrent() - height / 2,
            width,
            height
        );

        // the conversions here are identical to the pixelFromPoint() and
        // deltaPointsFromPixels() methods.
        var oldZoomPixel = self.pixelFromPoint(zoomPoint, true);
        var newZoomPixel = zoomPoint.minus(bounds.getTopLeft()).times(containerSize.x / bounds.width);
        var deltaZoomPixels = newZoomPixel.minus(oldZoomPixel);
        var deltaZoomPoints = deltaZoomPixels.divide(containerSize.x / contentWidth * zoom);

        // finally, shift center to negate the change.
        var centerTarget = center.minus(deltaZoomPoints);

        centerSpringX.springTo(centerTarget.x);
        centerSpringY.springTo(centerTarget.y);
        dirtyFlag = true;
    };

    /**
     * Zoom by the specified factor, about the specified point.
     * @method zoomBy
     * @param factor {number} The zoom factor to apply
     * @param refPoint {Seadragon2.Point} (optional) the point (in content coordinates)
     * which should stay stationary onscreen during this zoom operation.
     * @param immediately {bool} Whether to move right away
     */
    this.zoomBy = function (factor, refPoint, immediately) {
        self.zoomTo(self.getZoom() * factor, refPoint, immediately);
    };

    /**
     * Zoom to the specified zoom ratio, about the specified point.
     * @method zoomTo
     * @param zoom {number} The target zoom (scaling factor where 1 is home zoom).
     * @param refPoint {Seadragon2.Point} (optional) the point (in content coordinates)
     * which shouldn't move during the transition.
     * @param immediately {bool} True to move immediately, false to move on springs
     */
    this.zoomTo = function (zoom, refPoint, immediately) {
        // we used to constrain zoom automatically here; now it needs to be
        // explicitly constrained, via applyConstraints().
        //zoom = SDMath_clamp(zoom, self.getMinZoom(), self.getMaxZoom());

        if (immediately) {
            zoomSpring.resetTo(SDMath_log2(zoom));
        } else {
            zoomSpring.springTo(SDMath_log2(zoom));
        }

        zoomPoint = refPoint instanceof SDPoint ? refPoint : null;

        // target values are changing, so we'll recompute getter values
        dirtyFlag = true;
    };

    /**
     * Let the pan position of the viewport glide to rest based on its current
     * velocity. This is provided in the hopes that it will be useful on touch
     * devices, where springs should be very short but momentum is expected.
     * During this slide, the Viewport will automatically applyConstraints on
     * each update cycle, so that it doesn't drift out of bounds.
     * @method toss
     */
    this.toss = function () {
        // let go of x and y springs
        centerSpringX.toss();
        centerSpringY.toss();
    };

    /**
     * Resize the container, but keep the content's coordinate space the same.
     * @method resize
     * @param newContainerSize {Seadragon2.Point} The new size (in pixels) of the container.
     * @param maintain {bool} True to preserve the apparent size of the content onscreen,
     * false to make sure all of the same content is visible onscreen.
     */
    this.resize = function (newContainerSize, maintain) {
        // default behavior: just ensure the visible content remains visible.
        // note that this keeps the center (relative to the content) constant.
        var oldBounds = self.getBounds();
        var newBounds = oldBounds;
        var widthDeltaFactor = newContainerSize.x / containerSize.x;

        // update container size, but make copy first
        containerSize = new SDPoint(newContainerSize.x, newContainerSize.y);

        // update some other constants
        containerAspect = containerSize.x / containerSize.y;
        widthRatio = (containerAspect > contentAspect) ?
            contentAspect / containerAspect :
            1;

        if (maintain) {
            // no resize relative to screen, resize relative to viewport.
            // keep origin constant, zoom out (increase bounds) by delta factor.
            newBounds.width = oldBounds.width * widthDeltaFactor;
            newBounds.height = newBounds.width / containerAspect;
        }

        self.fitBounds(newBounds, true);
    };

    /**
     * Modify the content size, but not the container's dimensions.
     * @method resizeContent
     * @param newSize {Seadragon2.Point} The new size (in content dimensions) of the content.
     */
    this.resizeContent = function (newSize) {
        // should this supply options for keeping points constant through the resize?
        // perhaps content size should be not a size but a Rect, so that the
        // user can choose coordinates that don't start at (0,0)?

        var oldBounds;
        oldBounds = self.getBounds();

        contentSize = newSize;
        contentAspect = contentSize.x / contentSize.y;
        contentHeight = contentSize.y;
        contentWidth = contentSize.x;
        homeBounds = new SDRect(0, 0, contentWidth, contentHeight);
        widthRatio = (containerAspect > contentAspect) ?
            contentAspect / containerAspect :
            1;
        dirtyFlag = true;

        self.fitBounds(oldBounds, true);
    };

    /**
     * Adjust the zoom to a percentage value (measured exponentially between minZoom and maxZoom).
     * @method zoomToPercent
     * @param percent {number} A value in [0, 100] specifying the new zoom. 0 corresponds to minZoom
     * and 100 corresponds to maxZoom.
     * @param immediately True to move right away, false to animate on springs
     */
    this.zoomToPercent = function (percent, immediately) {
        var minZoom = SDMath_log2(self.minZoom);
        self.zoomTo(pow2(percent * (SDMath_log2(self.maxZoom) - minZoom) / 100 + minZoom), null, immediately);
    };

    /**
     * Update the viewport's zoom and position. As a user of Viewport, you should only call this
     * function if you didn't set its selfUpdating option to true. Otherwise, this function will
     * automatically be called from a timer, and you should listen for the "change" events which
     * fire whenever the update function changed anything.
     * @method update
     * @param arg {object} Used internally for if the function was put on a timer.
     * @param now {number} (optional) The current time in milliseconds.
     * @return {bool} true if the Viewport changed as a result of this update,
     * or if the function was called from a timer.
     */
    this.update = function (arg, now) {
        // Note: this function may not be called in the proper context since it was put on a timer,
        // so don't use the this keyword.

        var oldCenterX = centerSpringX.getCurrent();
        var oldCenterY = centerSpringY.getCurrent();
        var oldZoom = zoomSpring.getCurrent();
        var oldZoomPixel, sliding;

        // get the current time only once, rather than once for each spring
        now = now || new Date().getTime();

        // remember position of zoom point
        if (zoomPoint) {
            oldZoomPixel = self.pixelFromPoint(zoomPoint, true);
        }

        // now update zoom only, don't update pan yet
        zoomSpring.update(now);

        // since current values have changed, mark pre-computed values as dirty
        dirtyFlag = true;

        // adjust for change in position of zoom point, if we've zoomed
        if (zoomPoint && zoomSpring.getCurrent() !== oldZoom) {
            var newZoomPixel = self.pixelFromPoint(zoomPoint, true);
            var deltaZoomPixels = newZoomPixel.minus(oldZoomPixel);
            var deltaZoomPoints = self.deltaPointsFromPixels(deltaZoomPixels, true);

            // shift pan to negate the change
            centerSpringX.shiftBy(deltaZoomPoints.x);
            centerSpringY.shiftBy(deltaZoomPoints.y);
        } else {
            // don't try to adjust next time; this improves performance
            zoomPoint = null;
        }

        // now after adjustment, update pan
        sliding = centerSpringX.update(now);
        sliding = centerSpringY.update(now) || sliding;
        dirtyFlag = true;

        // if either pan spring is sliding, we have to apply constraints to keep it from drifting
        // out of bounds.
        if (sliding) {
            self.applyConstraints();
        }

        // return true only if the viewport changed as a result of this update.
        // the timer will automatically unregister this update function if it returns false,
        // so we must re-register any time something begins changing.
        var hasChanged = centerSpringX.getCurrent() !== oldCenterX ||
            centerSpringY.getCurrent() !== oldCenterY ||
            zoomSpring.getCurrent() !== oldZoom;
        if (hasChanged) {
            self.trigger("change", self);
        }
        return hasChanged || arg === timerToken;
    };

    // Methods -- CONVERSION HELPERS

    /**
     * Scale a distance in content coordinates to pixel coordinates.
     * @method deltaPixelsFromPoints
     * @param deltaPoints {Seadragon2.Point} A 2-D distance in content coordinates
     * @param current {bool} True for current zoom level, false for target zoom level.
     * @return {Seadragon2.Point} The same vector in pixel coordinates.
     */
    this.deltaPixelsFromPoints = function (deltaPoints, current) {
        return deltaPoints.times(containerSize.x / contentWidth * self.getWidthZoom(current));
    };

    /**
     * Scale a distance in pixel coordinates to content coordinates.
     * @method deltaPointsFromPixels
     * @param deltaPixels {Seadragon2.Point} A 2-D distance in pixel coordinates
     * @param current {bool} True for current zoom level, false for target zoom level.
     * @return {Seadragon2.Point} The same vector in content coordinates.
     */
    this.deltaPointsFromPixels = function (deltaPixels, current) {
        return deltaPixels.divide(containerSize.x / contentWidth * self.getWidthZoom(current));
    };

    /**
     * Convert a point in content coordinates to a point in pixel coordinates.
     * @method pixelFromPoint
     * @param point {Seadragon2.Point} A point in content coordinates
     * @param current {bool} whether to use current viewport position (true) or target
     * viewport position (false)
     * @return {Seadragon2.Point}
     */
    this.pixelFromPoint = function (point, current) {
        var bounds = self.getBounds(current);
        return point.minus(bounds.getTopLeft()).times(containerSize.x / bounds.width);
    };

    /**
     * Convert a point in pixel coordinates to a point in content coordinates.
     * @method pointFromPixel
     * @param pixel {Seadragon2.Point} A point in pixel coordinates
     * @param current {bool} whether to use current viewport position (true) or target
     * viewport position (false)
     * @return {Seadragon2.Point}
     */
    this.pointFromPixel = function (pixel, current) {
        var bounds = self.getBounds(current);
        return pixel.divide(containerSize.x / bounds.width).plus(bounds.getTopLeft());
    };

    /**
     * Convert a Rect in content coordinates to pixel coordinates.
     * @method rectPixelsFromPoints
     * @param rect {Seadragon2.Rect} The content rectangle
     * @param current {bool} true for current position, false for target
     * @param centered {bool} Whether to offset the resulting position by
     * half of the container width, so that (0,0) corresponds to the center of the
     * Viewport.
     * @return {Seadragon2.Rect}
     */
    this.rectPixelsFromPoints = function (rect, current, centered) {
        var bounds = self.getBounds(current),
            zoom = containerSize.x / bounds.width;
        return new SDRect(
            (rect.x - bounds.x) * zoom - (centered ? containerSize.x / 2 : 0),
            (rect.y - bounds.y) * zoom - (centered ? containerSize.y / 2 : 0),
            rect.width * zoom,
            rect.height * zoom
        );
    };

    // Constructor

    init();

};
