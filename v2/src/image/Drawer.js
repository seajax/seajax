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

// Drawer.js
// defines the SDDrawer interface (package protected, not part of public API)

/*global SDCanvasDrawer, SDImgDrawer*/
/*jshint strict: false */

var
    SDDrawer_CANVAS_API_AVAILABLE =
        typeof document.createElement("canvas").getContext === "function",
    
    /**
     * The Drawer class should be treated as internal, not part of the public API.
     * It provides methods for drawing image tiles to the screen, so that
     * other classes need not know about the rendering path.
     * This constructor should never be called directly; use SDDrawer_$ to get the best
     * available Drawer. However, the base class Drawer is useful as a dummy that
     * provides all of the needed functions but doesn't do anything.
     * @class Drawer
     * @private
     * @constructor
     * @param {Element} container The HTML (or maybe SVG?) element in which to draw.
     * @param {TileSource} source The tile source to use.
     * @param {Image} sdImg The parent image.
     * @param {number} [blendInTime] Number of milliseconds for blend-in transitions.
     * @param {number} [fadeOutTime] Number of milliseconds for fade-out transitions.
     */
    SDDrawer = function(container, normHeight) {
        this.container = container;
        this.normHeight = normHeight;
    },
    
    SDDrawerPrototype = SDDrawer.prototype,
    
    /**
     * Create a new Drawer, using the best render path for the current browser.
     * @method $
     * @static
     * @param {Element} container The HTML (or maybe SVG?) element in which to draw.
     * @param {TileSource} source The tile source to use.
     * @param {Image} sdImg The parent image.
     * @param {number} [blendInTime] Number of milliseconds for blend-in transitions.
     * @param {number} [fadeOutTime] Number of milliseconds for fade-out transitions.
     */
    SDDrawer_$ = function (container, normHeight) {
        if (SDDrawer_CANVAS_API_AVAILABLE) {
            return new SDCanvasDrawer(container, normHeight);
        } else {
            return new SDImgDrawer(container, normHeight);
        }
    },
    
    // A dummy Drawer that does nothing.
    SDDrawer_nullDrawer = new SDDrawer();

/**
 * Draw a tile immediately at a specified location in the sdimg.
 * @method drawTile
 * @private
 * @param {ImgElement} img The source image.
 * @param {Tile} tile The Tile representing the area to draw.
 * @param {object} levelView The level to draw on.
 * @return {object} the Drawer's state for the Tile.
 */
SDDrawerPrototype.drawTile = function (img, tile, levelView) {
    // Whatever gets returned here will be stored in the Tile's view attribute.
    // For the basic Drawer, just remember the source image. Other implementations
    // may need to store more state.
    return img;
};

/**
 * Add a new level to the view, so it will be visible in front of all others.
 * @method addLevelOnTop
 * @private
 * @return {object} the Drawer's representation of the new level.
 */
SDDrawerPrototype.addLevelOnTop = function () {
    return true;
};

/**
 * Add a new level, behind an existing level in the Drawer.
 * @method addLevelBehind
 * @private
 * @param {object} oldLevelView The existing level, which should be in front of the new one.
 * @return {object} the Drawer's representation of the new level.
 */
SDDrawerPrototype.addLevelBehind = function (oldLevelView) {
    return true;
};

/**
 * Remove a level without fading.
 * @method removeLevel
 * @private
 * @param {object} levelView The level to remove.
 */
SDDrawerPrototype.removeLevel = function (levelView) {};

/**
 * Update the current opacity of a tile, for manual blend-in transitions.
 * @method updateBlend
 * @private
 * @param {Tile} tile The tile that is blending.
 * @param {object} levelView The current level.
 * @param {number} opacity The current opacity.
 */
SDDrawerPrototype.updateBlend = function (tile, levelView, opacity) {};

/**
 * Update the current opacity of a level, for manual fade-out transitions.
 * @method updateFade
 * @private
 * @param {object} levelView The level that is fading.
 * @param {number} opacity The current opacity.
 */
SDDrawerPrototype.updateFade = function (levelView, opacity) {};

/**
 * Remove a tile from the view.
 * @param {Tile} tile The tile to remove.
 * @param {Object} levelView The level containing the tile.
 */
SDDrawerPrototype.discardTile = function (tile, levelView) {
    // default: do nothing
    // ImgDrawer would want to remove the tile from the container, etc.
};

/**
 * Set the canvas bounds of a particular level in the Drawer.
 * @method setLevelDimensions
 * @private
 * @param {Level} The level to resize and repaint if necessary.
 */
SDDrawerPrototype.setLevelDimensions = function (levelData) {
    // by default, do nothing. CanvasDrawer overrides this method
    // so it can also resize the canvas for the level.
};
