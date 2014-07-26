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

// DziTileSource.js
// Defines the Seadragon2.DziTileSource.js class.

/*global SD, SDTileSource, SDTileSourcePrototype, SDPoint_origin*/
/*jshint strict: false, plusplus: false */

/**
 *  A subclass of TileSource that describes Deep Zoom Images (DZIs). DZIs are
 *  tiled images that have a defined structure and hierarchy. This class also
 *  supports sparse images (called "compositions" in Deep Zoom Composer), where
 *  some parts of an image are deeper than others.
 *  @class DziTileSource
 *  @namespace Seadragon2
 *  @extends Seadragon2.TileSource
 *  @see http://msdn.microsoft.com/en-us/library/cc645077%28VS.95%29.aspx#Single_Images
 */

var

    /**
     *  Constructs a DziTileSource for a DZI of the given width and height, having
     *  the given tile size and tile overlap. Its tiles are in the directory at the
     *  given URL, and they're of the given image format. If the DZI is sparse, the
     *  sparseness is described by the given display rects.
     *  @param {number} width
     *  @param {number} height
     *  @param {number} tileSize The length of the square tiles' sides. All DZIs
     *  have square tiles. DZIs usually have a tile size of 254 or 510, assuming a
     *  tile overlap of 1.
     *  @param {number} tileOverlap DZIs usually have a tile overlap of 1. 
     *  @param {string} tilesUrl The URL to the directory containing the tiles. This
     *  is usually of the format "{XmlBase}_files/", where {XmlBase} is the URL to
     *  the DZI's XML file minus the file extension. For example, "my/image.dzi"
     *  will usually have its tiles at "my/image_files/".
     *  @param {string} imageFormat The image format of the tiles. This is usually
     *  "jpg" or "png". This value should be the tiles' file extension minus the
     *  leading dot. Capitalization may matter; it should match the tiles.
     *  @param {DisplayRect[]} displayRects? If given, describes the sparseness of
     *  the DZI. Note that there must be at least two separate display rects for
     *  them to have any meaning; a single display rect by itself is ignored.
     */
    SDDziTileSource = SD.DziTileSource = function (width, height, tileSize,
        tileOverlap, tilesUrl, imageFormat, displayRects) {
    
        // inherits from SDTileSource
        this.base(width, height, tileSize, tileSize, tileOverlap);
        this.base = this.base.prototype;
    
        // specified properties
        /**
         *  
         *  @property tilesUrl
         *  @type string
         *  @final
         */
        this.tilesUrl = tilesUrl;
        /**
         *  
         *  @property imageFormat
         *  @type string
         *  @final
         */
        this.imageFormat = imageFormat;
        /**
         *  
         *  @property displayRects
         *  @type DisplayRect[]
         *  @final
         */
        this.displayRects = displayRects;
    
        // derived properties
        /**
         *  
         *  @property isSparse
         *  @type boolean
         *  @final
         */
        this.isSparse = !!(displayRects && displayRects.length > 1);
        /**
         *  
         *  @property displayRectsByLevel
         *  @type object
         *  @final
         */
        this.displayRectsByLevel = (function () {
            var i, rect, rects = this.displayRects,
                level, minLevel, maxLevel, rectsByLevel = {};
    
            if (!this.isSparse) {
                return null;
            }
    
            for (i = 0; i < rects.length; i++) {
                rect = rects[i];
                minLevel = Math.max(rect.minLevel, this.minLevel);
                maxLevel = Math.min(rect.maxLevel, this.maxLevel);
                for (level = minLevel; level <= maxLevel; level++) {
                    if (rectsByLevel[level]) {
                        rectsByLevel[level].push(rect);
                    } else {
                        rectsByLevel[level] = [rect];
                    }
                }
            }
    
            return rectsByLevel;
        }.call(this));
    
    },

    SDDziTileSource$ = SDDziTileSource.$ = function (obj) {
        var tileSize;
    
        if (obj instanceof SDDziTileSource) {
            return obj;
        }
    
        // special case for tile size
        tileSize = obj.tileSize;
        if (typeof tileSize === "object") {
            tileSize = tileSize.width || tileSize.height;
        }
    
        return new SDDziTileSource(
            obj.width, obj.height, tileSize || obj.tileWidth || obj.tileHeight,
            obj.tileOverlap, obj.tilesUrl, obj.imageFormat, obj.displayRects);
    },

    SDDziTileSourcePrototype = SDDziTileSource.prototype = new SDTileSource();

SDDziTileSourcePrototype.base = SDTileSource;

SDDziTileSourcePrototype.getTileInfo = function (level, col, row) {
    return [
        this.tilesUrl, level, '/', col, '_', row, '.', this.imageFormat
    ].join('');
};

SDDziTileSourcePrototype.tileExists = function (level, col, row) {
    var i, rect, rects, scale, xMin, xMax, yMin, yMax, colMin, colMax, rowMin, rowMax;

    // if this isn't a sparse image, every tile in the pyramid should exist
    if (!this.isSparse) {
        return true;
    }

    rects = this.displayRectsByLevel[level];

    // if no display rects include this level, this tile doesn't exist
    if (!rects || !rects.length) {
        return false;
    }

    // otherwise, check if any of the rects for this level include this tile
    for (i = 0; i < rects.length; i++) {
        rect = rects[i];

        // scale display rect's coordinates to this level
        scale = this.getLevelScale(level);
        xMin = rect.x * scale;
        yMin = rect.y * scale;
        xMax = xMin + rect.width * scale;
        yMax = yMin + rect.height * scale;

        // convert to rows and columns -- note that we're ignoring tile
        // overlap, but it's a reasonable approximation. it errs on the side
        // of false positives, which is much better than false negatives.
        colMin = Math.floor(xMin / this.tileWidth);
        rowMin = Math.floor(yMin / this.tileHeight);
        colMax = Math.ceil(xMax / this.tileWidth);
        rowMax = Math.ceil(yMax / this.tileHeight);
        
        if (colMin <= col && col < colMax && rowMin <= row && row < rowMax) {
            return true;
        }
    }
    
    // found no display rect containing this tile
    return false;
};

SDDziTileSourcePrototype.getTileBelow = function (level, col, row, lowerLevel) {
    if (lowerLevel === undefined) {
        lowerLevel = level - 1;
    }
    // check whether we're falling off of the lower end of this DZI into its related DZC
    if (lowerLevel <= this.dzcMaxLevel) {
        if (lowerLevel < this.minLevel || !this.levelExists(lowerLevel)) {
            return null;
        }
        return SDPoint_origin;
    }
    // otherwise fall back on the default implementation
    return SDTileSourcePrototype.getTileBelow.call(this, level, col, row, lowerLevel);
};