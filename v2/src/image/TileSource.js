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

// TileSource.js
// Defines the Seadragon2.TileSource class.

/*global SD, SDPoint, SDPoint_$, SDSize, SDRect, SDMath, SDMath_clamp, SDMath_log2, SDMath_round*/
/*jslint strict: false, bitwise: false */

/**
 *  An abstract class that describes tiled content. This class handles common
 *  tiling math, but all of its properties and methods can be overridden by
 *  subclasses.
 *  @class TileSource
 *  @namespace Seadragon2
 */

var

    /*  YUI doc only allows one constructor, and the other one is more useful.
     *  Constructs a TileSource of the given width and height with no tile overlap.
     *  If the given tile size is a number, the tiles are square, otherwise the
     *  tiles have the dimensions of the given Size instance or size literal. The
     *  minimum level is zero, and the overview level is automatically derived.
     *  @constructor
     *  @param {number} width
     *  @param {number} height
     *  @param {number,Size} tileSize If number, describes the side length of the
     *  square tiles, otherwise if Size instance or size literal, describes the
     *  dimensions of the tiles.
     */
    /**
     *  Constructs a TileSource of the given width and height whose tiles have the
     *  given tile width and tile height. Tile overlap can optionally be specified,
     *  otherwise it defaults to zero. The minimum level can also optionally be
     *  specified, otherwise it also defaults to zero. The overview level can also
     *  optionally be specified, otherwise it's automatically derived.
     *  @constructor
     *  @param {number} width
     *  @param {number} height
     *  @param {number} tileWidth
     *  @param {number} tileHeight
     *  @param {number} tileOverlap?
     *  @param {number} minLevel?
     *  @param {number} overviewLevel?
     */
    SDTileSource = SD.TileSource = function (width, height, tileWidth,
        tileHeight, tileOverlap, minLevel, overviewLevel) {

        // special case for tile size
        if (arguments.length === 3 && typeof tileWidth === "object") {
            tileHeight = tileWidth.height;  // must come before next statement!
            tileWidth = tileWidth.width;
        }

        var idealLevel = SDMath_log2(Math.max(width, height)),
            maxLevel = SDMath_ceil(idealLevel),
            maxSingleTileLevel = SDMath_log2(tileWidth);

        // specified properties

        /**
         *  The total width of this tiled content.
         *  @property width
         *  @type number
         *  @final
         */
        this.width = width;

        /**
         *  The total height of this tiled content.
         *  @property height
         *  @type number
         *  @final
         */
        this.height = height;

        /**
         *  The width of this content's tiles.
         *  @property tileWidth
         *  @type number
         *  @final
         */
        this.tileWidth = tileWidth || tileHeight;

        /**
         *  The height of this content's tiles.
         *  @property tileHeight
         *  @type number
         *  @final
         */
        this.tileHeight = tileHeight || tileWidth;

        /**
         *  The shared overlap on the edges between neighboring tiles. If not specified,
         *  the default is zero.
         *  @property tileOverlap
         *  @type number
         *  @final
         */
        this.tileOverlap = tileOverlap || 0;

        /**
         *  The minimum level at which tiles exist for this content. If not specified,
         *  the default is level zero.
         *  @property minLevel
         *  @type number
         *  @final
         */
        this.minLevel = SDMath_clamp(minLevel || 0, 0, maxLevel);

        /**
         *  The best level for showing an overview of this content. If not specified,
         *  it's automatically derived to be as close to the maximum single-tiled level
         *  as possible, while remaining at or above the minimum level.
         *  @property overviewLevel
         *  @type number
         *  @final
         */
        this.overviewLevel = SDMath_clamp((typeof overviewLevel === "number" ?
            overviewLevel : maxSingleTileLevel), this.minLevel, maxLevel);

        // derived properties

        /**
         *  The total dimensions of this tiled content, expressed as a Size instance.
         *  @property dimensions
         *  @type Size
         *  @final
         */
        this.dimensions = new SDSize(width, height);

        /**
         *  The total aspect ratio (width / height) of this tiled content.
         *  @property aspectRatio
         *  @type number
         *  @final
         */
        this.aspectRatio = width / height;

        /**
         *  The total width-normalized height (height / width) of this tiled content.
         *  @property normHeight
         *  @type number
         *  @final
         */
        this.normHeight = height / width;

        /**
         *  The dimensions of this content's tiles, expressed as a Size instance.
         *  @property tileSize
         *  @type Size
         *  @final
         */
        this.tileSize = new SDSize(this.tileWidth, this.tileHeight);

        /**
         *  The maximum level at which tiles exist for this content. This is
         *  automatically derived from the content's total dimensions.
         *  @property maxLevel
         *  @type number
         *  @final
         */
        this.maxLevel = maxLevel;

        /**
         *  The logarithmic amount by which this tile's content should be
         *  sharpened because it doesn't fill its tile levels. For instance, if
         *  the content is 384x256, it only fills 3/4 the width of the 512x512
         *  level, so sharpen would be log2(4/3) = 0.415.
         *  @property sharpen
         *  @type number
         *  @final
         */
        this.sharpen = maxLevel - idealLevel;

    },

    /**
     *  Create a new TileSource from the given object literal.
     *  @method $
     *  @static
     *  @private
     *  @param {object} obj
     */
    SDTileSource_$ = SDTileSource.$ = function (obj) {
        var tileSource, prop, tileWidth, tileHeight;

        if (obj instanceof SDTileSource) {
            return obj;
        }

        // special cases for tile size
        if (typeof obj.tileSize === "object") {
            tileWidth = obj.tileSize.width;
            tileHeight = obj.tileSize.height;
        } else if (typeof obj.tileSize === "number") {
            tileWidth = tileHeight = obj.tileSize;
        }

        tileSource = new SDTileSource(obj.width, obj.height,
            obj.tileWidth || tileWidth, obj.tileHeight || tileHeight,
            obj.tileOverlap, obj.minLevel, obj.maxLevel);

        // copy over added functions, e.g. getTileInfo()
        for (prop in obj) {
            // again special casing for tile size
            if (obj.hasOwnProperty(prop) && prop !== "tileSize") {
                tileSource[prop] = obj[prop];
            }
        }

        return tileSource;
    },

    SDTileSourcePrototype = SDTileSource.prototype;

/**
 *  Get the scaling factor for a level. For instance, if the uppermost
 *  level of content is level 12, tileSource.getLevelScale(10) would
 *  return 0.25.
 *  @method getLevelScale
 *  @param {number} level
 *  @return {number}
 */
SDTileSourcePrototype.getLevelScale = function (level) {
    // optimize for 32-bit, but support more
    var diff = this.maxLevel - level;
    if (diff < 31) {
        return 1 / (1 << diff);
    } else {
        return Math.pow(0.5, diff);
    }
};

/**
 *  Get the Size of a level, by tile count in each direction.
 *  @method getNumTiles
 *  @param {number} level
 *  @return {Size} The height and width of the level.
 */
SDTileSourcePrototype.getNumTiles = function (level) {
    var scale = this.getLevelScale(level);

    return new SDSize(
        Math.ceil(scale * this.width / this.tileWidth),
        Math.ceil(scale * this.height / this.tileHeight));
};

/**
 *  Return the reciprocal of the level's dimensions, in pixels.
 *  For instance, if a level is 488x505 pixels, this method would
 *  return a Size of {width:1/488, height:1/505}.
 *  @method getPixelRatio
 *  @param {number} level
 *  @return {Size} The level's pixel ratio.
 */
SDTileSourcePrototype.getPixelRatio = function (level) {
    var imageSizeScaled = this.getLevelDimensions(level);

    return new SDSize(
        1.0 / imageSizeScaled.width, 1.0 / imageSizeScaled.height);
};

/**
 *  Get the tile indices of the tile covering the given point.
 *  @method getTileAtPoint
 *  @param {number} level
 *  @param {Point} point The point, in coordinates normalized to width 1.
 *  @return {Point} The tile coordinates (x is the column, y the row).
 */
SDTileSourcePrototype.getTileAtPoint = function (level, point, favorUpperLeft) {
    // note that isotropic coordinates ==> scaling based on width only!
    var pixel = SDPoint_$(point).times(this.getLevelDimensions(level).width);

    // If the favorUpperLeft argument is supplied and true, it means that we should
    // choose the left or upper tile when the given point is exactly on a tile seam.
    if (favorUpperLeft) {
        if (pixel.x % 1 === 0) {
            pixel.x--;
        }
        if (pixel.y % 1 === 0) {
            pixel.y--;
        }
    }

    return new SDPoint(
        Math.floor(pixel.x / this.tileWidth),
        Math.floor(pixel.y / this.tileHeight));
};

/**
 * Get a Rect specifying the tiles that are needed to cover the
 * given rectangle. Width and height are one less than the number
 * of tiles in each direction, so note that the rectangle [0,0|0,0]
 * corresponds to just the tile (0,0).
 * @param {Object} level
 * @param {Object} rect
 */
SDTileSourcePrototype.getTilesInRect = function (level, rect) {
    var tileTL = this.getTileAtPoint(level, rect.getTopLeft()),
        tileBR = this.getTileAtPoint(level, rect.getBottomRight(), true),
        numTiles = this.getNumTiles(level),
        left,
        right,
        top,
        bottom;

    // clamp it to the bounds
    left = SDMath_max(tileTL.x, 0);
    top = SDMath_max(tileTL.y, 0);
    right = SDMath_min(tileBR.x, numTiles.width - 1);
    bottom = SDMath_min(tileBR.y, numTiles.height - 1);

    return new SDRect(left, top, right - left, bottom - top);
};

/**
 *  Get the bounds of a tile, in image coordinates (top-left is (0,0) and
 *  top-right is (1,0)).
 *  @method getTileBounds
 *  @param {number} level
 *  @param {number} col
 *  @param {number} row
 *  @return {Rect} The bounds of the tile.
 */
SDTileSourcePrototype.getTileBounds = function (level, col, row) {
    // work in scaled pixels for this level. also note that isotropic
    // coordinates ==> scaling based on width only!
    var dimensionsScaled = this.getLevelDimensions(level),
        pixelScaleX = 1.0 / dimensionsScaled.width,
        pixelScaleY = this.normHeight / dimensionsScaled.height,
        x, y;

    // 1. adjust both tile position and tile size if this tile is on the top or
    // left, as there is no overlap data on top and left edges.
    // 2. adjust tile size for single-tile levels where the image size is
    // smaller than normal, and for tiles on the bottom and right edges that
    // would exceed the image bounds.
    // 3. normalize everything to this level's scale.

    x = (col === 0) ? 0 : (this.tileWidth * col - this.tileOverlap);
    y = (row === 0) ? 0 : (this.tileHeight * row - this.tileOverlap);

    return new SDRect(
        pixelScaleX * x,
        pixelScaleY * y,
        pixelScaleX * Math.min(
            this.tileWidth + (col === 0 ? 1 : 2) * this.tileOverlap,
            dimensionsScaled.width - x),
        pixelScaleY * Math.min(
            this.tileHeight + (row === 0 ? 1 : 2) * this.tileOverlap,
            dimensionsScaled.height - y));
};

/**
 *  Get the tile's URL and source cropping information.
 *  @method getTileInfo
 *  @param {number} level
 *  @param {number} col
 *  @param {number} row
 *  @return {TileInfo}
 */
SDTileSourcePrototype.getTileInfo = function (level, col, row) {
    return null;
};

/**
 *  Get whether the level exists in the deep zoom content. This function's
 *  behavior is undefined if the level passed in is greater than the source's
 *  maxLevel or less than its minLevel.
 *  @method levelExists
 *  @param {number} level
 *  @return {boolean} True if the level exists, false otherwise.
 */
SDTileSourcePrototype.levelExists = function (level) {
    return true;
};

/**
 *  Query whether the requested tile exists in the deep zoom content.
 *  @method tileExists
 *  @param {number} level
 *  @param {number} col
 *  @param {number} row
 *  @return {boolean} True if the tile exists.
 */
SDTileSourcePrototype.tileExists = function (level, col, row) {
    return true;
};

/**
 * Get the pixel dimensions of a level's full resolution.
 * @method getLevelDimensions
 * @param {number} level
 * @return {Size} The full size of the level.
 */
SDTileSourcePrototype.getLevelDimensions = function (level) {
    return this.dimensions.times(this.getLevelScale(level)).apply(SDMath_ceil);
};

// getTileBelow and getNumTilesAbove are provided to help with coverage.
// However, the current implementations are wrong for any tile source that
// has zero overlap, since levels can shift slightly.

/**
 * Find the tile immediately below, for helping with tile coverage.
 * @method getTileBelow
 * @param {number} level
 * @param {number} col
 * @param {number} row
 * @param {number} [lowerLevel]
 * @return {Point} The (x:col, y:row) indices of the tile below.
 */
SDTileSourcePrototype.getTileBelow = function (level, col, row, lowerLevel) {
    var scale, lowerScale, ratio;
    if (typeof lowerLevel === "undefined") {
        lowerLevel = level - 1;
    }
    if (lowerLevel < this.minLevel || !this.levelExists(lowerLevel)) {
        return null;
    }
    scale = this.getLevelScale(level);
    lowerScale = this.getLevelScale(lowerLevel);
    ratio = lowerScale / scale;
    return new SDPoint(SDMath_floor(col * ratio), SDMath_floor(row * ratio));
};

/**
 * <p>
 * Get a Rect specifying the tiles in the level above that, together, would
 * cover the given tile. The edges of the Rect are inclusive, so a Rect with
 * height 1 and width 1 actually includes 4 tiles!
 * </p>
 * <p>
 * Note: getTilesAbove(l, c, r, u) may return different results than
 * getTilesInRect(u, getTileBounds(l, c, r)). That is by design!
 * It is because getTileBounds includes the overlap borders and thus
 * needs to cover a bigger area. This method is intended only as a
 * coverage helper, whereas getTilesInRect is intended for helping
 * with clipping bounds.
 * </p>
 * @method getTilesAbove
 * @param {number} level
 * @param {number} col
 * @param {number} row
 * @param {number} [upperLevel]
 * @return {Rect} The tiles that cover this tile.
 */
SDTileSourcePrototype.getTilesAbove = function (level, col, row, upperLevel) {
    var scale, upperScale, ratio, result, numTilesAbove;

    if (typeof upperLevel === "undefined") {
        upperLevel = level + 1;
    }

    if (upperLevel > this.maxLevel || !this.levelExists(upperLevel)) {
        return null;
    }

    numTilesAbove = this.getNumTiles(upperLevel);
    scale = this.getLevelScale(level);
    upperScale = this.getLevelScale(upperLevel);
    ratio = upperScale / scale; // Assuming this is an integer!

    result = new SDRect(col * ratio, row * ratio, ratio - 1, ratio - 1);

    // clamp to image boundary
    if (result.x + result.width >= numTilesAbove.width) {
        result.width = numTilesAbove.width - result.x - 1;
    }
    if (result.y + result.height >= numTilesAbove.height) {
        result.height = numTilesAbove.height - result.y - 1;
    }

    return result;
};

/**
 * Get the number of tiles that must be drawn above the given tile for it to
 * be fully covered.
 * @method getNumTilesAbove
 * @param {number} level
 * @param {number} col
 * @param {number} row
 * @param {number} [upperLevel]
 * @return {number} The number of tiles above.
 */
SDTileSourcePrototype.getNumTilesAbove = function (level, col, row, upperLevel) {
    var above = this.getTilesAbove(level, col, row, upperLevel);
    return above ? ((above.width + 1) * (above.height + 1)) : Infinity;
};
