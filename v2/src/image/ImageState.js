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

/*global SDRect, SDTimer, window, SDPoint, SDMath_clamp, SDMath_ceil, SDMath_log2, SDMath_max,
 SDRect_nullRect, SDFunction_EMPTY, Level, SDDebug_error, Tile, SDTileLoader_nominate,
 SDTileLoader_getImgInfo, SDDrawer_nullDrawer, SDPoint_origin*/
 /*jshint strict: false */

var
    /**
     * The Model portion of the Image.
     * @class ImageState
     * @private
     * @constructor
     * @param {TileSource} source
     * @param {Drawer} drawer
     * @param {number} blendInTime
     * @param {number} fadeOutTime
     */
    SDImageState = function (source, drawer, blendInTime, fadeOutTime) {

        // times in ms for blend and fade transitions
        this.blendInTime = blendInTime || 0;
        this.fadeOutTime = fadeOutTime || 0;

        // TileSource associated with this image
        this.source = source;

        // the Drawer (view) to draw to. It must exist, but may be a null drawer that doesn't do anything.
        this.drawer = drawer;

        // topmost drawn level
        this.maxLevel = source.minLevel - 1;

        // clipping bounds, normalized to width 1
        this.clip = new SDRect(0, 0, 1, source.normHeight);

        // keyed by level number, values include but are not limited to
        // {levelBounds, tiles} where tiles is a column-major 2d array,
        // and levelBounds is a Rect in tile numbers.
        // each entry in tiles is {tileData, covers, nomination}, where
        // tileData is implementation-specific, covers is a boolean specifying
        // whether that tile (or content above it) covers the tile below,
        // and nomination is set only while waiting for the tile to load.
        this.levels = {};

        // the position of this image, in foviation coordinates (centered at (0,0))
        this.position = SDRect_nullRect;
    },

    SDImageStatePrototype = SDImageState.prototype,

    SDImageState_animator = SDTimer;

/// static methods:

/**
 * Update a running blend animation.
 * @method blendCallback
 * @static
 * @private
 * @param {Object} callbackArgs Data about the blending tile.
 * @param {number} now The current time, in milliseconds.
 * @return {boolean} True if the animation is continuing, false if it is finished.
 */
function SDImageState_blendCallback (callbackArgs, now) {
    var levelData = callbackArgs.levelData,
        tile = callbackArgs.tile,
        blend,
        startTime = callbackArgs.startTime,
        state = callbackArgs.state,
        lastUpdated = callbackArgs.last || startTime;

    // check: does the level still exist? is the tile in bounds? is the tile covered? is the level fading?
    if (!levelData.visible ||
        !tile.inBounds ||
        tile.isCovered() ||
        levelData.fading ||
        tile.drawnOpaque) {
        return false; // notify the animator that this function is done
    }

    // calculate the blend value
    // note: if blendInTime is 0, blend becomes Infinity, which is > 1, so we're okay.
    // If the frame rate is bad (less than 15fps), we'll try to help out by skipping
    // to the end of this blend immediately.
    blend = (now - startTime) / state.blendInTime;
    if (blend > 1 || now - lastUpdated > 67) {
        blend = 1;
    }

    // change the opacity onscreen
    state.drawer.updateBlend(tile, levelData.view, blend);

    // save the new opacity value in the Tile
    tile.opacity = blend;

    // check: are we done?
    if (blend === 1) {
        // now the tile is drawn at full opacity, so it covers tiles below
        if (!levelData.fading) {
            state.onDrawn(tile);
        }
        return false;
    }

    // keep track of when we last updated this blend state
    callbackArgs.last = now;

    // return true to keep the animation going
    return true;
}

/**
 * Update a running fade animation.
 * @method fadeCallback
 * @static
 * @private
 * @param {Object} callbackArgs Data about the fading level.
 * @param {number} now The current time, in milliseconds.
 * @return {boolean} True if the animation is continuing, false if it is finished.
 */
function SDImageState_fadeCallback(callbackArgs, now) {
    var
        state = callbackArgs.state,
        levelData = callbackArgs.levelData,
        level = callbackArgs.level,
        levels = state.levels,
        startTime = callbackArgs.startTime,
        fade,
        lastUpdated = callbackArgs.last || startTime;

    // check: does the level still exist?
    if (levels[level] !== levelData) {
        return false;
    }

    // calculate the fade value
    fade = 1 - (now - startTime) / state.fadeOutTime;

    // if the frame rate is under 15fps, skip fading since we have bigger problems
    if (now - lastUpdated > 67) {
        fade = 0;
    }

    // if the level is invisible (!levelData.visible), be careful
    // to not try to do anything involving the drawer!

    if (fade <= 0) {
        // the level has fully faded, get rid of it
        if (levelData.visible) {
            state.drawer.removeLevel(levelData.view);
        }
        delete levels[level];
        return false;
    } else {
        if (levelData.visible) {
            // update the opacity
            levelData.opacity = fade;
            state.drawer.updateFade(levelData.view, fade);
        }
        // remember when we last updated
        callbackArgs.last = now;
        // and keep the animation running
        return true;
    }
}

/**
 * Begin blending the newly loaded tile, if it is still needed onscreen.
 * @method onTileLoad
 * @param {Object} callbackInfo the object that was given to the TileLoader during nomination
 * @param {Object} imgInfo the TileLoader's object containing the image and metadata
 */
function SDImageState_onTileLoad(callbackInfo, tile, imgInfo) {
    var
        levelData = callbackInfo.levelData,
        levelBounds = levelData.bounds,
        state = callbackInfo.state;

    // mark the tile as no longer loading
    tile.loading = false;

    // check if we should (still?) draw this tile...
    // Reasons to abort:
    // 1. image download failed
    // 2. no longer in clipping bounds
    // 3. level doesn't exist
    if (imgInfo.failed ||
        !levelBounds ||
        !tile.inBounds ||
        !levelData.visible ||
        levelData.fading) {
        return;     // nothing we can do with this tile
    }

    // 4. tile is covered
    if (tile.isCovered()) {
        return;
    }

    // otherwise, draw this tile!
    state.blendTile(imgInfo.img, tile);
}

SDImageStatePrototype.update = function (position, clip, blur) {
    var
        source = this.source,
        levelNum,
        lastPosition = this.position,
        normHeight = source.normHeight;

    // blur is an optional parameter
    blur = blur || 0;

    if (position && !lastPosition.equals(position)) {
        this.position = position;
    }

    // scale the clip bounds to image coordinates
    if (clip) {
        clip = new SDRect(
            clip.x / position.width,
            clip.y * normHeight / position.height,
            clip.width / position.width,
            clip.height * normHeight / position.height);
    }

    // derive the highest level to draw. comments:
    // 1. levels are integers; ceil() errs on shrinking high-res levels while
    // floor() errors on stretching low-res levels.
    // 2. unlike viewport, which is normalized to the width only, regardless of
    // aspect ratio, levels are determined by the bigger of width and height.
    // 3. the width and height of the full image are determined by taking the
    // inverse of the viewport and scaling it by the current canvas dimensions.
    // 4. levels should always be clamped to the source's min and max levels.
    // 5. source content tiles are often much smaller than the maximum possible
    // size; for instance, a level-7 image may only be 68x40. we must adjust
    // accordingly.
    if (position) {
        levelNum =
            SDMath_clamp(
                SDMath_ceil(
                    SDMath_log2(
                        SDMath_max(
                            position.width,
                            position.height
                        )
                    ) - blur + source.sharpen
                ),
                source.minLevel,
                source.maxLevel
            );

        // Special case for DZC images! Expand to DZI if needed.
        if (source.isDzc) {
            if (levelNum > source.dzcMaxLevel) {
                source.expand();
            } else {
                source.contract();
            }
        }

        // There's no point in using a nonexistent level as the top one.
        while (!source.levelExists(levelNum)) {
            levelNum--;
        }
    } else {
        // if size wasn't specified, we assume it hasn't changed
        levelNum = this.maxLevel;
    }

    // if things changed, update accordingly
    if (levelNum !== this.maxLevel) {
        this.setLevel(levelNum);
    }
    if (clip && !clip.equals(this.clip)) {
        this.setClipBounds(clip);
    }
};

/**
 * Set the highest-resolution level.
 * @method setLevel
 * @param {number} level the new highest level
 */
SDImageStatePrototype.setLevel = function (level) {
    var curLevel = this.maxLevel,
        i,
        levelData,
        imgClipBounds = this.clip,
        lowestFadingLevel;
    this.maxLevel = level;

    // if we zoomed in
    if (curLevel < level) {
        // set up each of the new levels we will need
        for (i = curLevel + 1; i <= level; i++) {
            // set up the level's data object
            levelData = this.initLevelData(i);
            // set the tile bounds
            this.setLevelClipBounds(levelData, imgClipBounds);
            // start fetching and/or blending tiles for the level
            this.drawLevel(levelData, null, true);
        }
    }

    // if we zoomed out
    else if (curLevel > level) {
        // get rid of levels that are too high
        for (i = curLevel; i > level; i--) {
            levelData = this.levels[i];
            if (levelData && levelData.visible) {
                lowestFadingLevel = this.levels[i];
            }
            // begin the fading transition
            this.fadeLevel(i);
            // update coverage for the level below
            this.setLevelClipBounds(levelData, SDRect_nullRect);
        }
        // redraw the rest now that we know what's covered
        this.redrawAllLevels(lowestFadingLevel);
    }
};

SDImageStatePrototype.redrawAllLevels = function (levelAbove) {
    var maxLevel = this.maxLevel,
        minLevel = this.source.minLevel,
        i,
        levels = this.levels;

    // redraw all levels, starting at the highest one.
    for (i = maxLevel; i >= minLevel; i--) {
        this.drawLevel(levels[i], levelAbove);
        // if that level was drawn visible, remember it to pass to the next iteration.
        if (levels[i].visible) {
            levelAbove = levels[i];
        }
    }
};

/**
 * Update the top level to fit inside the specified clipping.
 * Depending on the situation, it might
 * request new tiles from the tileloader,
 * remove tiles that are no longer visible,
 * remove lower levels if the current level provides coverage, and/or
 * create lower levels if the current level does not provide coverage
 * @method setClipBounds
 * @param {Rect} imgClipBounds
 */
SDImageStatePrototype.setClipBounds = function (imgClipBounds) {
    var minLevel = this.source.minLevel,
        maxLevel = this.maxLevel,
        levels = this.levels,
        i;

    // save the image's clip bounds
    this.clip = imgClipBounds;

    // first, set the bounds of each level, which may change their coverage info.
    for (i = minLevel; i <= maxLevel; i++) {
        this.setLevelClipBounds(levels[i], imgClipBounds);
    }

    // next, redraw them.
    this.redrawAllLevels();
};

/**
 * Destroy the ImageState.
 * @method destroy
 */
SDImageStatePrototype.destroy = function () {
    var i,
        levels = this.levels;

    // remove each level from the container sdimg
    for (i = this.minLevel; i <= this.maxLevel; i++) {
        if (levels[i].view) {
            this.drawer.removeLevel(levels[i].view);
        }
    }
    this.levels = null;

    // modify our callbacks so that we don't attempt to draw to nonexistent levels,
    // since TileLoader might still have some references to this State.
    this.blendTile = SDFunction_EMPTY;
    this.onTileDrawn = SDFunction_EMPTY;
    this.getTilePriority = function () { return 0; };

    // release reference to the Drawer
    this.drawer = null;
};

/**
 * Blend in a new tile, in the specified level at the specified location.
 * This default implementation assumes that declarative animations are not supported.
 * @method blendTile
 * @private
 * @param {ImgElement} img The image tile.
 * @param {Rect} srcRect The cropping rectangle for the image source.
 * @param {number} level The level number that the tile should be in.
 * @param {Rect} destRect The normalized destination rectangle.
 * @param {Owner} owner The owner of the level, which should provide an onTileDrawn() callback.
 * @param {object} [callbackArg] Any argument to be passed to the callback function.
 */
SDImageStatePrototype.blendTile = function (img, tile) {
    var
        startTime = new Date().getTime(),
        levelData = this.levels[tile.level];

    // draw the starting image at zero opacity
    tile.opacity = 0;
    tile.view = this.drawer.drawTile(img, tile, levelData.view);

    // register our blend callback function in the animation timer
    SDImageState_animator.register(SDImageState_blendCallback, {
        levelData: levelData,
        tile: tile,
        startTime: startTime,
        state: this
    });
};

/**
 * Fade out a level.
 * This default implementation assumes that declarative animations are not supported.
 * @method fadeLevel
 * @private
 * @param {number} level The level number to fade out.
 */
SDImageStatePrototype.fadeLevel = function (level) {
    var
        levelData = this.levels[level],
        startTime = new Date().getTime();

    // mark the level as fading, so blending tiles won't call onTileDrawn
    levelData.fading = true;

    // register the fade routine in the animation timer
    SDImageState_animator.register(SDImageState_fadeCallback, {
        state: this,
        level: level,
        startTime: startTime,
        levelData: levelData
    });
};

/**
 * Set up the data structures to contain data for the given level number.
 * @method initLevelData
 * @private
 * @param {number} level
 * @return The initialized levelData object.
 */
SDImageStatePrototype.initLevelData = function (level) {
    var levels = this.levels,
        levelData = levels[level];
    if (levelData && levelData.visible) {
        // the level currently exists, so it must have been fading!
        // remove it and start over fresh.
        this.drawer.removeLevel(levelData.view);
        levelData.visible = false;
    }

    // make a new Level object to represent the level's state
    levels[level] = levelData = new Level(level, this.source);
    return levelData;
};

SDImageStatePrototype.checkRemoveLevel = function (levelData) {
    if (levelData.tilesVisible < 0) {
        SDDebug_error("coverage is broken");
    }

    // If the level has no more visible tiles, we can remove it
    if (levelData.tilesVisible === 0 && !levelData.fading) {
        levelData.visible = false;
        if (levelData.view) {
            this.drawer.removeLevel(levelData.view);
            levelData.view = null;
        }
    }
};

SDImageStatePrototype.onUncover = function (tile) {
    if (tile.uncover()) {
        // The tile was previously hidden and now is showing. Since the tile is currently
        // not drawn at full opacity, we have to propagate this change to lower levels.
        if (tile.inBounds) {
            this.levels[tile.level].tilesVisible++;
        }
        if (tile.tileBelow) {
            this.onUncover(tile.tileBelow);
        }
    }
};

SDImageStatePrototype.onCover = function (tile) {
    var levelData;
    if (tile.cover()) {
        // The tile was previously showing, and now isn't.

        levelData = this.levels[tile.level];

        // If it has a view component, discard it.
        if (tile.view) {
            this.drawer.discardTile(tile, levelData.view);
            tile.view = null;
        }

        // check whether the tile already covered content below it
        if (tile.drawnOpaque) {

            // The tile was already drawn at full opacity, but no longer is.
            tile.drawnOpaque = false;

        } else {
            if (tile.tileBelow) {
                // The tile was transparent before; we need to propagate coverage
                // since the tile now covers.
                this.onCover(tile.tileBelow);
            }
            // TODO un-nominate it?
            //if (tile.loading) {}
        }

        // update the Level to represent the covered tile
        levelData.tilesVisible--;
        this.checkRemoveLevel(levelData);
    }
};

SDImageStatePrototype.onDrawn = function (tile) {
    tile.drawn();

    // notify the tile below that it is covered!
    if (tile.tileBelow) {
        this.onCover(tile.tileBelow);
    }
};

/**
 * Set the clipping bounds for a particular level, and revise its coverage.
 * Note that this method does not attempt to fetch uncovered tiles or even
 * draw them if they are already available.
 * @method setLevelClipBounds
 * @private
 * @param {Object} levelData The level to re-clip.
 * @param {Object} imgClipBounds The new clip bounds, normalized so that full image width is 1.
 */
SDImageStatePrototype.setLevelClipBounds = function (levelData, imgClipBounds) {
    var level = levelData.num,
        source = this.source,
        oldLevelBounds = levelData.bounds,
        levelBounds = source.getTilesInRect(level, imgClipBounds),
        tiles = levelData.tiles,
        column,
        tile,
        i,
        j,
        newLeft = levelBounds.x,
        newTop = levelBounds.y,
        newBottom = levelBounds.height + newTop,
        newRight = levelBounds.width + newLeft,
        oldLeft = oldLevelBounds.x,
        oldTop = oldLevelBounds.y,
        oldRight = oldLeft + oldLevelBounds.width,
        oldBottom = oldTop + oldLevelBounds.height,
        tileBelowCoords,
        tileBelow,
        // if the view isn't keeping the fading level, we have to in the ImageState instead.
        keepFading = levelData.fading && this.drawer === SDDrawer_nullDrawer;

    if (!tiles || !oldLevelBounds) {
        // we have no info for this level, which shouldn't happen
        SDDebug_error("uninitialized level " + level);
        return;
    }

    // check whether the real clip bounds for this level have changed
    if (levelBounds.equals(oldLevelBounds)) {
        // nothing interesting has changed.
        return;
    }

    // set up the tiles matrix to include all of the tile objects it needs
    for (i = newLeft; i <= newRight; i++) {
        column = tiles[i];

        // if the column doesn't exist, make it
        if (!column) {
            tiles[i] = {};
            column = tiles[i];
        }
        for (j = newTop; j <= newBottom; j++) {
            tile = column[j];

            // if the tile doesn't exist, make it
            if (!tile) {

                // first, find the tile below it.
                tileBelowCoords = source.getTileBelow(level, i, j);
                if (tileBelowCoords) {
                    tileBelow = this.levels[level-1].tiles[tileBelowCoords.x][tileBelowCoords.y];
                    if (!tileBelow) {
                        SDDebug_error("coverage is broken");
                    }
                } else {
                    tileBelow = null;
                }

                // then actually create the new Tile
                column[j] = new Tile(levelData.num, i, j, source, tileBelow);

                // and then update the Level's count of visible tiles.
                levelData.tilesVisible++;
            }
        }
    }

    // remove tiles that are no longer in bounds, and update the coverage info
    // for tiles under them if necessary.
    for (i = oldLeft; i <= oldRight; i++) {
        column = tiles[i];
        for (j = oldTop; j <= oldBottom; j++) {

            // if we're inside a block of new tiles, skip to the edge of it
            if (i >= newLeft && i <= newRight && j >= newTop && j <= newBottom) {
                j = newBottom;
                continue;
            }
            tile = column[j];

            // remove the tile from the view, if necessary
            if (tile.view && !levelData.fading) {
                this.drawer.discardTile(tile, levelData.view);
            }

            // update the Level's count of visible tiles
            if (!tile.isCovered()) {
                levelData.tilesVisible--;
            }

            // change the Tile object to show that it is out of bounds
            tile.inBounds = false;

            // notify tiles below that this tile no longer covers
            if (tile.drawnOpaque) {
                this.onUncover(tile.tileBelow);
            }

            // delete the tile object
            if (!keepFading) {
                delete column[j];
            }
        }

        // prune empty columns
        if (!keepFading && (i < newLeft || i > newRight)) {
            delete tiles[i];
        }
    }

    // store the new level bounds
    if (!keepFading) {
        levelData.bounds = levelBounds;
    }

    // If no tiles are visible in this level, we can remove it now
    this.checkRemoveLevel(levelData);

    // the CanvasDrawer implementation needs to know the clip bounds and corresponding canvas size.
    if (levelData.visible && !levelData.fading) {
        this.drawer.setLevelDimensions(levelData);
    }
};

/**
 * Draw any needed tiles in the given level, and propagate coverage to lower levels.
 * Best practice is to call this method on each level in decreasing order, so we don't try
 * to draw low-level tiles unless they're actually needed.
 * @param {Object} levelData The current level.
 * @param {Object} levelAbove The next higher level, if one exists.
 * @param {Object} doBlending If true, all tiles should be blended rather than drawn opaque.
 */
SDImageStatePrototype.drawLevel = function (levelData, levelAbove, doBlending) {
    var levelBounds = levelData.bounds,
        level = levelData.num,
        left = levelBounds.x,
        right = left + levelBounds.width,
        top = levelBounds.y,
        bottom = top + levelBounds.height,
        col,
        row,
        source = this.source,
        drawer = this.drawer,
        tilePosition,
        tile,
        imgInfo,
        tileBounds,
        fovBounds;

    // if this level has no tiles showing, skip it
    if (levelData.tilesVisible === 0) {
        return;
    }
    if (levelData.tilesVisible < 0) {
        SDDebug_error("coverage is broken");
    }

    // if this level is invisible but has tiles showing, create it!
    if (!levelData.visible) {
        levelData.visible = true;
        // insert behind the level above, if it exists
        if (levelAbove) {
            levelData.view = drawer.addLevelBehind(levelAbove.view);
        }
        // insert in front, if we're the top level
        else {
            levelData.view = drawer.addLevelOnTop();
        }

        // set canvas size for the new level
        drawer.setLevelDimensions(levelData);
    }

    // draw any new tiles in the level
    for (col = left; col <= right; col++) {
        for (row = top; row <= bottom; row++) {
            // if the tile doesn't exist (sparse images), just skip it
            if (!source.tileExists(level, col, row)) {
                continue;
            }

            tilePosition = new SDPoint(col, row);

            // a couple of cases where we can skip the tile:
            // 1. it has already been fetched, and is blending (tile.view exists, tile.covers() is false)
            // 2. it is covered by tiles above, or drawn at full opacity (tile.covers() is true)
            // 3. it has already been nominated (tile.loading is true)
            tile = levelData.tiles[col][row];
            if (tile.covers() || tile.view || tile.loading) {
                continue;
            }

            // fetch the tile's data from the tile loader
            imgInfo = SDTileLoader_getImgInfo(tile.url);

            if (imgInfo.failed) {
                // if this tile failed, nothing we can do but skip.
                continue;
            }

            tileBounds = tile.bounds;

            // if we've gotten here, then we're ready to either draw the
            // tile if it's ready or nominate it for download if it's not.
            if (imgInfo.loaded) {

                // draw this tile onto this level!
                if (doBlending) {
                    // this is the top level, so we blend all tiles
                    this.blendTile(imgInfo.img, tile);
                } else {
                    // this is not the top level, so draw the tile immediately
                    // in case the tile was still blending, jump to full opacity
                    tile.opacity = 1;
                    tile.view = drawer.drawTile(imgInfo.img, tile, levelData.view);
                    // since we drew at full opacity, the tile covers those below
                    this.onDrawn(tile);
                }

            } else {

                // calculate the nomination values for the tile: area and foviation distance.
                // start by finding the tile's bounds in foviation coordinates.
                fovBounds = this.position;
                tileBounds = tileBounds.intersect(this.clip);
                tileBounds = new SDRect(
                    tileBounds.x * fovBounds.width + fovBounds.x,
                    tileBounds.y * fovBounds.height / source.normHeight + fovBounds.y,
                    tileBounds.width * fovBounds.width,
                    tileBounds.height * fovBounds.height / source.normHeight
                );
                // now we can easily get its onscreen size and distance to center.
                tile.area = tileBounds.getArea();
                tile.distance = tileBounds.getCenter().distanceTo(SDPoint_origin);

                // nominate this tile to be loaded!
                tile.loading = true;
                SDTileLoader_nominate(tile,
                SDImageState_onTileLoad, // callback function
                { // tile's callback info
                    levelData: levelData,
                    state: this // owner
                });
            }
        }
    }
};
