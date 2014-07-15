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

// CanvasDrawer.js
// defines the CanvasDrawer implementation of Drawer.
/*global SDDrawer, SDDebug_warn, SDRect, SDMath_round, SDPoint, SDElement_setOpacity, SDDebug_error*/

var
    /**
     * A Drawer that uses a Canvas element for each visible level.
     * @class CanvasDrawer
     * @extends Drawer
     * @private
     */
    SDCanvasDrawer = function () {
        SDDrawer.apply(this, arguments);
    },
    
    SDCanvasDrawerPrototype = SDCanvasDrawer.prototype = new SDDrawer();

SDCanvasDrawerPrototype.drawTile = function (img, tile, levelView, blend) {
    var
        canvas,
        context2d,
        fullSize,
        normalizedBounds,
        destRectOnCanvas,
        widthRatio,
        heightRatio,
        srcRect = tile.crop,
        destRect = tile.bounds,
        prevBlend = 0;
    
    // the HTML5 canvas spec says that if the image hasn't loaded yet (via
    // the img.complete property), don't draw it. unfortunately in IE, that
    // property remains false during the img.onload event, only becoming
    // true after the event. however, for our own internal use, we defer
    // the onload event handling anyway, since IE incorrectly raises events
    // in the middle of ongoing javascript execution. so at least for now,
    // we'll go ahead and ignore seemingly incomplete images.
    // TODO remove this check, if SDNetwork is setting handlers correctly!
    if (!img.complete) {
        SDDebug_warn(
            "Seadragon2.Canvas.drawImage: ignoring incomplete image: " +
            img.src);
        return;
    }
    
    // blend is an optional parameter, where 0 is a meaningful value.
    if (typeof blend !== "number") {
        blend = tile.opacity;
    } else {
        prevBlend = tile.opacity;
    }
    
    // check that the level exists
    if (!levelView.canvas) {
        SDDebug_warn("SDCanvasDrawer: nonexistent level");
        return;
    }
    
    canvas = levelView.canvas;
    context2d = canvas.getContext("2d");
    fullSize = levelView.fullSize;
    normalizedBounds = levelView.normalizedBounds;
    
    if (blend !== 1) {
        context2d.save();
        prevBlend = prevBlend || 0;
        context2d.globalAlpha = (blend - prevBlend) / (1 - prevBlend);
    }
    
    // we should be able to use translate and scale operations, but both
    // chrome and ie have shown bugs in drawing images on scaled coordinates.
    // instead, use basic canvas coordinates.
    widthRatio = fullSize.width / normalizedBounds.width;
    heightRatio = fullSize.height / normalizedBounds.height;
    destRectOnCanvas = new SDRect(
        (destRect.x - normalizedBounds.x) * widthRatio,
        (destRect.y - normalizedBounds.y) * heightRatio,
        destRect.width * widthRatio,
        destRect.height * heightRatio
    );
    
    if (srcRect) {
        context2d.drawImage(img,
            srcRect.x, srcRect.y, srcRect.width, srcRect.height,
            destRectOnCanvas.x, destRectOnCanvas.y, destRectOnCanvas.width, destRectOnCanvas.height);
    } else {
        context2d.drawImage(img,
            destRectOnCanvas.x, destRectOnCanvas.y, destRectOnCanvas.width, destRectOnCanvas.height);
    }
    
    if (blend !== 1) {
        context2d.restore();
    }

    // return tile data
    return img;
};

SDCanvasDrawerPrototype.updateBlend = function (tile, levelView, blend) {
    if (!levelView.canvas) {
        // this level no longer exists
        SDDebug_error("CanvasDrawer: Attempting to blend tile on nonexistent level!");
    }
    this.drawTile(tile.view, tile, levelView, blend);
};

SDCanvasDrawerPrototype.updateFade = function (levelView, fade) {
    SDElement_setOpacity(levelView.canvas, fade);
};

SDCanvasDrawerPrototype.positionLevel = function (levelData) {
    var canvas = levelData.canvas,
        normalizedBounds = levelData.normalizedBounds,
        canvasStyle = canvas.style;
    canvasStyle.left = (normalizedBounds.x * 100).toFixed(8) + "%";
    canvasStyle.top = (normalizedBounds.y / this.normHeight * 100).toFixed(8) + "%";
    canvasStyle.width = (normalizedBounds.width * 100).toFixed(8) + "%";
    canvasStyle.height = (normalizedBounds.height / this.normHeight * 100).toFixed(8) + "%";
};

SDCanvasDrawerPrototype.setLevelDimensions = function (levelData) {
    var
        canvas = levelData.view.canvas,
        levelBounds = levelData.bounds,
        cols = levelData.tiles,
        tiles,
        tile,
        leftCol = levelBounds.x,
        topRow = levelBounds.y,
        rightCol = levelBounds.width + leftCol,
        bottomRow = levelBounds.height + topRow,
        i,
        j,
        fullSize = levelData.dimensions,
        normalizedBounds;
    
    // find the clipping bounds of the tiles, which could be bigger than the image's clip bounds
    normalizedBounds = cols[leftCol][topRow].bounds.union(cols[rightCol][bottomRow].bounds);
    
    // we're interested in the full size of the clipped level
    fullSize = normalizedBounds.scale(fullSize.width, new SDPoint(0, 0));

    // use integers for canvas dimensions
    fullSize.width = SDMath_round(fullSize.width) || 1;
    fullSize.height = SDMath_round(fullSize.height) || 1;
    
    // set canvas dimensions
    canvas.width = fullSize.width;
    canvas.height = fullSize.height;
    
    levelData.view.fullSize = fullSize;
    levelData.view.normalizedBounds = normalizedBounds;
    this.positionLevel(levelData.view);
    
    // repaint all of the currently available images, to act like retain mode!
    if (cols) {
        for (i = leftCol; i <= rightCol; i++) {
            tiles = cols[i];
            for (j = topRow; j <= bottomRow; j++) {
                tile = tiles[j];
                if (tile.view) {
                    this.drawTile(tile.view, tile, levelData.view);
                }
            }
        }
    }
};

/**
 * Create a new canvas with standard attributes.
 * @method makeCanvas
 * @private
 * @param {Object} newLevelData the data object for the level
 */
SDCanvasDrawerPrototype.makeCanvas = function (newLevelData) {
    var
        canvas = document.createElement("canvas"),
        canvasStyle = canvas.style;
    canvasStyle.display = "block";
    canvasStyle.position = "absolute";
    canvasStyle.overflow = "hidden";
    canvasStyle.width = "100%";
    canvasStyle.height = "100%";
    newLevelData.canvas = canvas;
    newLevelData.normalizedBounds = new SDRect(0, 0, 1, this.normHeight);
    return canvas;
};

SDCanvasDrawerPrototype.addLevelOnTop = function () {
    var newLevelData = {};
    this.container.appendChild(this.makeCanvas(newLevelData));
    return newLevelData;
};

SDCanvasDrawerPrototype.addLevelBehind = function (oldLevelData) {
    var newLevelData = {};
    this.container.insertBefore(this.makeCanvas(newLevelData), oldLevelData.canvas);
    return newLevelData;
};

SDCanvasDrawerPrototype.removeLevel = function (levelView) {
    this.container.removeChild(levelView.canvas);
    delete levelView.canvas;
};
