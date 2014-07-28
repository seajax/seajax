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

// ImgDrawer.js
// Defines the ImgDrawer class, which extends Drawer
/*global SDDrawer, SDDebug_error, SDElement_setOpacity*/
/*jshint strict: false */

var
    // IE by default uses nearest-neighbor interpolation for stretched or
    // shrunk images. IE7 introduced bicubic interpolation. if the page is at a
    // zoom other than 100%, bicubic is the default interpolation in IE7+.
    // otherwise, bicubic must be specified via a CSS property. unfortunately,
    // it results in tile seams in IE7 -- but not in IE8, even in compat mode!
    // so we apply it in IE8 only, by detection of the document.documentMode
    // property introduced in IE8 that's present in all modes.
    SDImgDrawer_MS_INTERPOLATION_MODE =
        document.documentMode ? "bicubic" : "nearest-neighbor",

    /**
     * A drawer that uses a div element for each level, with img elements inside.
     * @class ImgDrawer
     * @extends Drawer
     * @private
     */
    SDImgDrawer = function () {
        SDDrawer.apply(this, arguments);
    },
    
    SDImgDrawerPrototype = SDImgDrawer.prototype = new SDDrawer();

SDImgDrawerPrototype.drawTile = function (img, tile, levelView) {
    var
        srcRect = tile.crop,
        destRect = tile.bounds,
        blend = tile.opacity,
        imgCopy,
        imgStyle,
        div,
        divStyle;
    
    // check that the level exists
    if (!levelView) {
        SDDebug_error("SDImgDrawer: nonexistent level");
    }
    
    imgCopy = document.createElement("img");
    imgStyle = imgCopy.style;

    // create and use a copy of the image, not the original
    imgCopy.src = img.src;
    imgStyle.position = "absolute";
    imgStyle.msInterpolationMode = SDImgDrawer_MS_INTERPOLATION_MODE;
    
    if (srcRect) {
        
        // css clip doesn't support percent values. use hidden overflow instead: outer div contains img.
        div = document.createElement("div"); 
        divStyle = div.style;
        divStyle.position = "absolute";
        divStyle.overflow = "hidden";

        // place img inside div with percents, so scales with div
        imgStyle.left = (-100 * srcRect.x / srcRect.width).toFixed(8) + "%";
        imgStyle.top = (-100 * srcRect.y / srcRect.height).toFixed(8) + "%";
        imgStyle.width = (100 * img.width / srcRect.width).toFixed(8) + "%";
        imgStyle.height = (100 * img.height / srcRect.height).toFixed(8) + "%";

        div.appendChild(imgCopy);
        
    } else {
    
        // no cropping necessary
        div = imgCopy;
        divStyle = imgStyle;
    }

    // place div at expected position and size
    divStyle.left = (100 * destRect.x).toFixed(8) + "%";
    divStyle.top = (100 * destRect.y / this.normHeight).toFixed(8) + "%";
    divStyle.width = (100 * destRect.width).toFixed(8) + "%";
    divStyle.height = (100 * destRect.height / this.normHeight).toFixed(8) + "%";

    levelView.appendChild(div);
    
    // blend is an optional parameter specifying opacity.
    if (typeof blend === "number") {
        SDElement_setOpacity(div, blend);
    }
    
    // and return the info for the newly created tile
    return div;
};

SDImgDrawerPrototype.updateBlend = function (tile, levelView, opacity) {
    SDElement_setOpacity(tile.view, opacity);
};

SDImgDrawerPrototype.updateFade = function (levelView, opacity) {
    SDElement_setOpacity(levelView, opacity);
};

/**
 * Create and style a new div element for the given level.
 * @method makeDiv
 * @private
 * @param {Object} newLevelData the level for which to create a div.
 */
SDImgDrawerPrototype.makeDiv = function () {
    var
        div = document.createElement("div"),
        divStyle = div.style;
    divStyle.display = "block";
    divStyle.position = "absolute";
    divStyle.overflow = "visible";
    divStyle.width = "100%";
    divStyle.height = "100%";
    return div;
};

SDImgDrawerPrototype.addLevelOnTop = function () {
    var levelView = this.makeDiv();
    this.container.appendChild(levelView);
    return levelView;
};

SDImgDrawerPrototype.addLevelBehind = function (oldLevelView) {
    var levelView = this.makeDiv();
    this.container.insertBefore(levelView, oldLevelView);
    return levelView;
};

SDImgDrawerPrototype.removeLevel = function (levelView) {
    this.container.removeChild(levelView);
};

SDImgDrawerPrototype.discardTile = function (tile, levelView) {
    levelView.removeChild(tile.view);
};
