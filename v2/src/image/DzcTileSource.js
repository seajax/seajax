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

// DzcTileSource.js
// Defines the Seadragon2.DzcTileSource class.

/*global SD, SDRect, SDTileInfo, SDTileSource, SDMath_reverseMorton, SDDeepZoom_fetchTileSource*/
/*jshint strict: false */

/**
 * A TileSource representing a single item in a deep zoom collection.
 * @class DzcTileSource
 * @extends Seadragon2.TileSource
 * @constructor
 * @param {number} width The total width of this image, in pixels
 * @param {number} height The total height of this image, in pixels
 * @param {number} dzcTileSize The width and height of each collection tile, in pixels
 * @param {number} dzcMaxLevel The maximum level which is on collection tiles, as opposed to per-item images
 * @param {number} dzcItemId The unique ID of the item
 * @param {string} dzcTilesUrl The root folder URL for collection image tiles, must end with a slash
 * @param {string} dzcImageFormat The extension of the format, like "png" or "jpg"
 * @param {number} dzcItemN The item's position in the collection's z-order
 * @param {string} dzcExpansionUrl Optional. The DZI file which describes the higher-resolution levels of this image.
 */
var SDDzcTileSource = SD.DzcTileSource = function (width, height, dzcTileSize,
    dzcMaxLevel, dzcItemId, dzcTilesUrl, dzcImageFormat, dzcItemN, dzcExpansionUrl) {

    // inherits from SDTileSource
    this.base(width, height, dzcTileSize);
    this.base = this.base.prototype;

    // specified properties
    this.dzcTileSize = dzcTileSize;
    this.dzcMaxLevel = dzcMaxLevel;
    this.dzcItemId = dzcItemId;
    this.dzcTilesUrl = dzcTilesUrl;
    this.dzcImageFormat = dzcImageFormat;
    
    // DZI expansion
    this.dzcExpansionUrl = dzcExpansionUrl;
    this.dziSource = null;
    this.dziSourceRequested = false;
    
    // derived properties
    this.dzcItemCoords = SDMath_reverseMorton(dzcItemN);
    
};

var SDDzcTileSource$ = SDDzcTileSource.$ = function (obj) {
    if (obj instanceof SDDzcTileSource) {
        return obj;
    }

    return new SDDzcTileSource(
        obj.width, obj.height, obj.dzcTileSize, obj.dzcMaxLevel,
        obj.dzcItemId, obj.dzcTilesUrl, obj.dzcImageFormat, obj.dzcItemN,
        obj.dzcExpansionUrl);
};

var SDDzcTileSourcePrototype = SDDzcTileSource.prototype = new SDTileSource();

SDDzcTileSourcePrototype.base = SDTileSource;

// since we special-case DZC expansion, it's useful to know whether this source
// is from a DZC image.
SDDzcTileSourcePrototype.isDzc = true;

SDDzcTileSourcePrototype.getTileInfo = function (level) {
    /*jshint bitwise: false */
    var itemSize = 1 << level,
        numItems = this.dzcTileSize / (1 << level),
        scale = this.getLevelScale(level),
        itemCol = this.dzcItemCoords.y,     // yes, NOT other way around!
        itemRow = this.dzcItemCoords.x,     // DZC mortons are reversed
        tileCol = Math.floor(itemCol / numItems),
        tileRow = Math.floor(itemRow / numItems);
    /*jshint bitwise: true */
    
    return new SDTileInfo(
        // tile url:
        [ this.dzcTilesUrl, level, '/', tileCol, '_', tileRow, '.',
            this.dzcImageFormat ].join(''),
        // tile crop:
        new SDRect(
            (itemCol % numItems) * itemSize,
            (itemRow % numItems) * itemSize,
            Math.max(1, Math.floor(scale * this.width)),    // DZC thumbs are
            Math.max(1, Math.floor(scale * this.height)))); // always >= 1px
};

SDDzcTileSourcePrototype.levelExists = function (level) {
    return level <= this.dzcMaxLevel;
};

SDDzcTileSourcePrototype.getTilesAbove = function (level, col, row, upperLevel) {
    if (upperLevel === undefined) {
        upperLevel = level + 1;
    }
    
    // check whether this request should be dependent on the expansion DZI
    if (upperLevel > this.dzcMaxLevel) {
        var dziSource = this.dziSource,
            size;
        if (dziSource) {
            size = this.getNumTiles(upperLevel);
            if (size) {
                return new SDRect(0, 0, size.width - 1, size.height - 1);
            }
        }
        
        // we don't know yet how big the level will be, so we won't speculate about it.
        return null;
    }
    
    // DZC files don't do multiple tiles per level
    return new SDRect(0, 0, 0, 0);
};

// In order to support expansion, we need to correctly redirect all
// function calls on this DZC source to its associated DZI source,
// if one exists. Conveniently, all TileSource functions start with
// a level argument, so we'll intercept them all with the same logic.
/*jshint -W089 */
(function () {
    var key;
    for (key in SDDzcTileSourcePrototype) {
        // we need to bind by value inside new the function we're building,
        // so we declare a new scope here.
        /*jshint loopfunc: true */
        (function () {
            var name = key,
                func = SDDzcTileSourcePrototype[name];
            if (name !== "base" && typeof func === "function") {
                SDDzcTileSourcePrototype[name] = function (level, a, b, c) {
                    // this could be written a bit more cleanly using the arguments array,
                    // but it's painfully slow in IE, Safari, and Opera. Instead, we pass
                    // arguments directly. Note that this depends on no function in TileSource
                    // taking more than four arguments (true right now, but could change!).
                    var source = this.dziSource;
                    if (level > this.dzcMaxLevel && source) {
                        return source[name](level, a, b, c);
                    } else {
                        return func.call(this, level, a, b, c);
                    }
                };
            }
        }());
        /*jshint loopfunc: false */
    }
}());
/*jshint +W089 */

// Functions to request DZC->DZI expansion, or undo it if the
// image zooms back out

/**
 * Fetch the DZI for this image, if one exists. Once it has been fetched, this tile
 * source's other methods will react based on the combined tile info for the DZI and
 * DZC.
 * @method expand
 */
SDDzcTileSourcePrototype.expand = function () {
    var that;
    
    // common case: nothing to do
    if (this.dziSource || this.dziSourceRequested || !this.dzcExpansionUrl) {
        return;
    }
    
    // get the DZI!
    this.dziSourceRequested = true;
    that = this;
    SDDeepZoom_fetchTileSource(this.dzcExpansionUrl, function (source) {
        that.dziSource = source;
        source.dzcMaxLevel = that.dzcMaxLevel;
    });
};

/**
 * If the DZI for this image has been fetched, forget about it. Future calls to this
 * tile source's other methods will react as if the higher-resolution levels didn't
 * exist.
 * @method contract
 */
SDDzcTileSourcePrototype.contract = function () {
    this.dziSource = null;
    // make sure we ignore the expansion source if we already requested it
    this.dziSourceRequested = false;
};
