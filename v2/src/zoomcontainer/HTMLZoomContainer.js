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

/*global SD, SDPoint, SDElement_transform*/
/*jshint strict: false */

/**
 * A ZoomContainer for HTML content. It provides zooming capabilities for HTML markup.
 * @class HTMLZoomContainer
 * @namespace Seadragon2
 * @constructor
 * @param container {HTMLElement} The container element. This element must be block-level,
 * positioned with something other than position:static, and have overflow hidden.
 */
var SDHTMLZoomContainer = SD.HTMLZoomContainer = function (container) {
    // we need to make a sub-container to hold all of this container's contents,
    // so that we can move around a single object with CSS.
    var subContainer = document.createElement("div"),
        subContainerStyle = subContainer.style,
        sizeRatio = 1,
        lastBounds,
        lastZoom;

    (function () {
        var cur;

        // set up the new container to fill the original one
        subContainerStyle.width = "100%";
        subContainerStyle.height = "100%";
        subContainerStyle.position = "relative";

        // move all children of the container into the new sub-container
        container.appendChild(subContainer);
        while ((cur = container.firstChild) !== subContainer) {
            subContainer.appendChild(cur);
        }
    }());

    /**
     * Set the ratio of content coordinates to the size at which this HTML layer
     * should be naturally rendered. If we only used content coordinates, we would
     * often lose precision because many CSS properties only use integer pixel values.
     * Instead, we represent the HTML at its maximum size, as set by this size ratio,
     * and use CSS transforms to shrink it to whatever dimensions we need.
     * Note that the position of the layer won't get properly adjusted until the next
     * time you call the update method.
     * @method setSizeRatio
     * @param newRatio {number} The ratio between natural CSS size and the content size
     * of the viewport. For instance, if we are using 160x160 pixel HTML templates on
     * an area that is 16x16 in content coordinates, newRatio would be 10.
     */
    this.setSizeRatio = function (newRatio, updateImmediately) {
        sizeRatio = newRatio;
        newRatio = (newRatio * 100) + "%";
        subContainerStyle.width = newRatio;
        subContainerStyle.height = newRatio;
        if (updateImmediately && lastBounds !== undefined) {
            this.update(lastBounds, lastZoom);
        }
    };

    /**
     * Based on the current size ratio, position the given element at the given location
     * in content coordinates.
     * @method setLocation
     * @param elmt {HTMLElement} The element to be positioned. It must already have style
     * position:absolute.
     * @param location {SDRect} The location, in content coordinates, where the element
     * should go.
     */
    this.setLocation = function (elmt, location) {
        var style = elmt.style;
        style.left = (location.x * sizeRatio) + "px";
        style.top = (location.y * sizeRatio) + "px";
        style.width = (location.width * sizeRatio) + "px";
        style.height = (location.height * sizeRatio) + "px";
    };

    /**
     * Change the content's CSS transform to fit the given bounds.
     * @method update
     * @param bounds {SDRect} The bounds (in content coordinates) of what is showing
     * @param zoom {number} The current zoom ratio
     */
    this.update = function (bounds, zoom) {
        lastBounds = bounds;
        lastZoom = zoom;
        SDElement_transform(subContainer, -bounds.x * zoom, -bounds.y * zoom, zoom / sizeRatio);
    };

    /**
     * Destroy the zoom container. No other operation will be valid on this container afterward.
     * @method dispose
     */
    this.dispose = function () {
        var cur;
        container.removeChild(subContainer);
        while (cur = subContainer.firstChild) {
            container.appendChild(cur);
        }
    };
};
