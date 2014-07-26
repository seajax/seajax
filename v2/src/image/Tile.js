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

/*global SDDebug_error, SDTileInfo_$ */
/*jshint strict: false */

function Tile(level, col, row, source, tileBelow) {
    var info = SDTileInfo_$(source.getTileInfo(level, col, row));
    
    // the quadtree position of this Tile:
    this.level = level;
    this.col = col;
    this.row = row;
    
    // the tile immediately below this one
    this.tileBelow = tileBelow;
    
    // the url to fetch from
    this.url = info.url;
    
    // the clipping coordinates in the source image (null means no crop)
    this.crop = info.crop;
    
    // the rectangle of image that this tile represents
    this.bounds = source.getTileBounds(level, col, row);
    
    // doesn't yet cover content below it
    this.drawnOpaque = false;
    
    // the number of tiles that need to be drawn above this one before it's covered
    this.tilesAbove = source.getNumTilesAbove(level, col, row);
    
    // the number of tiles above that have been drawn at full opacity
    this.covered = 0;
    
    // the tile is not loading yet (that we know of)
    this.loading = false;
    
    // values that are important only for prioritizing nominations.
    // we don't know them yet.
    this.area = 0;
    this.distance = 0;
    
    // might change if the tile needs to blend in
    this.opacity = 1;
    
    // If this tile gets clipped out of bounds, we'll need to know
    this.inBounds = true;
    
    // the view's state corresponding to this tile (varies by Drawer)
    this.view = null;
}

Tile.prototype.resetCoverage = function () {
    this.covered = 0;
};

Tile.prototype.covers = function () {
    return this.drawnOpaque || (this.tilesAbove === this.covered);
};

Tile.prototype.isCovered = function () {
    return this.covered === this.tilesAbove;
};

/// The following functions update coverage. If a tile above this tile is
/// drawn or covered, the ImageState is expected to call cover(). If a tile
/// above this tile is removed or [uncovered and not drawn], ImageState is
/// expected to call uncover(). And any time a tile is drawn at full
/// opacity, ImageState must call onDrawn().

Tile.prototype.cover = function () {
    this.covered++;
    if (this.covered > this.tilesAbove) {
        SDDebug_error("tile coverage is broken!");
    }
    
    // return true if the tile is now covered
    return (this.covered === this.tilesAbove);
};

Tile.prototype.uncover = function () {
    this.covered--;
    if (this.covered < 0) {
        SDDebug_error("tile coverage is broken");
    }
    
    // if the tile used to cover and doesn't anymore, we need to propagate the change!
    return (this.covered + 1 === this.tilesAbove);
};

Tile.prototype.drawn = function () {
    if (this.drawnOpaque || this.isCovered()) {
        SDDebug_error("tile coverage is broken");
    }
    this.drawnOpaque = true;
    
    // since the tile didn't cover and does now, the change must propagate
    return true;
};
