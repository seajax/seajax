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

/*global SD, SDPoint*/

/**
 * A ZoomContainer for 2D canvas content.
 * @class CanvasZoomContainer
 * @namespace Seadragon2
 * @constructor
 * @param container {HTMLCanvasElement} The container element. It must have width and height
 * that match its CSS width and height.
 */
var SDCanvasZoomContainer = SD.CanvasZoomContainer = function (container) {
    var ctx = container.getContext("2d");
    
    /**
     * Change the canvas context's transform to fit the given bounds, and clear the canvas.
     * The viewer or app calling this function must draw new content onto the canvas during
     * the same event, or risk nasty flickeriness.
     * @method update
     * @param bounds {SDRect} The bounds (in content coordinates) of what is showing
     */
    this.update = function (bounds) {
        var width = container.width,
            height = container.height,
            zoom = width / bounds.width;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.setTransform(zoom, 0, 0, zoom, -bounds.x * zoom, -bounds.y * zoom);
    };
};
