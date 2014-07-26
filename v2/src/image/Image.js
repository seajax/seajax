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

// Image.js
// Defines the Seadragon2.Image class.

/*global SD, SDObject_extend, SDDebug_error, SDRect, SDRect_$, SDXml_fetch, SDDebug_warn,
  SDPoint, devicePixelRatio, SDDrawer_$, SDDeepZoom_getTileSource, SDTileSource_$,
  SDElement_getClippingBounds, SDImageManager, SDElement_dce, SDElement_getWindowDimensions,
  SDElement_registerCustomElement, SDMath_log2, SDElement_getBoundingClientRect,
  SDDrawer_nullDrawer, SDImageState, SDEvent_raise, SDMath_floor, SDDeepZoom_fetchTileSource,
  SDTileSource*/
/*jshint strict: false */

var

    // Just a function, defined here to make JSLint happy
    SDImage_init,

    /**
     * A Deep Zoom image element. Images created this way are HTML elements with
     * tag sdimg that can be placed in a web page and used like a regular img
     * element. In particular, the developer can set the src property of an
     * Image to any deep zoom content, and the Image will get a load event
     * when its XML content has been loaded. Images can also be constructed
     * via document.createElement("sdimg").
     * @class Image
     * @namespace Seadragon2
     * @constructor
     * @param {Object} opts An object that can override the default properties
     * of the Image. Any property specified in this object will be applied to
     * the Image during its construction. Note that the manualUpdates property
     * is unique in that it can only be specified in the opts argument. By
     * default, the new Image is set up for automatic updates in the constructor.
     * @param {HTMLElement} element? (optional) An existing HTML element to augment.
     */
    SDImage = SD.Image = function (opts, element) {

        // override the default options (defined by this class's prototype) with
        // the given ones:
        SDObject_extend(this, opts);

        // The image state. Will be empty until the TileSource is ready.
        this.state = null;

        // "Private" properties
        this.lastSrc = "";          // the starting and previously read src value
        this.container = document.createElement("div");     // container for canvases

        // <img> properties
        if (element && element.attributes.src) {
            this.src = element.attributes.src.value;
        } else {
            this.src = this.lastSrc;
        }

        this.complete = true;
        // keep in mind we don't have settable width/height.

        // boilerplate code to extend and initialize a regular HTML element with
        // the properties and methods of this class and instance:
        if (!element) {
            // it's important that we use the original document.createElement, not
            // the overwritten one.
            element = SDElement_dce.call(document, "sdimg");
        }
        return SDImage_init(SDObject_extend(
            element, this, true));

    },

    SDImagePrototype = SDImage.prototype,

    // device pixel ratio: some platforms like iPhone4 report fewer CSS pixels
    // than they actually have on the screen, so we'll use higher-res accordingly
    SDImage_pixelRatio = 0;

if (typeof devicePixelRatio !== "undefined") {
    SDImage_pixelRatio = SDMath_log2(devicePixelRatio);
}

// set up document.createElement to make sdimg tags
SDElement_registerCustomElement("sdimg", SDImage);

// Default options:

/**
 * The time, in ms, to blend in new tiles.
 * @property blendTime
 * @type number
 * @default 500
 */
SDImagePrototype.blendTime = 500;
/**
 * The time, in ms, to fade out levels during zoom-out.
 * @property fadeTime
 * @type number
 * @default 500
 */
SDImagePrototype.fadeTime = 500;
/**
 * Whether this Image will be updated manually.
 * If this property is true during construction of the Image,
 * the app using the Image will be responsible for calling the
 * Image's update function periodically.
 * If this property is left false, calling the update function
 * manually is discouraged.
 * If you intend to draw this image onto a canvas using the drawImage
 * call, you must set manualUpdates to true and call the Image's update
 * function, passing it the onscreen size of the location where it will
 * be rendered.
 * @property manualUpdates
 * @type boolean
 * @default false
 */
SDImagePrototype.manualUpdates = false;
/**
 * The element that this Image should automatically clip to.
 * If not provided, the Image will clip itself to the window.
 * @property clipParent
 * @type HTMLElement
 * @default null
 */
SDImagePrototype.clipParent = null;
/**
 * Whether this Image will be rendered in immediate mode,
 * using the drawImage call to draw its contents to a canvas element.
 * This property will get updated to false whenever the element is
 * added to the DOM, at which point a Drawer will be attached.
 * If you intend to use the drawImage call, it is best to never put
 * your sdimg in the DOM, since that will create a Drawer and updates
 * will become much more expensive.
 * @property immediateMode
 * @private
 * @type boolean
 * @default true
 */
SDImagePrototype.immediateMode = true;
/**
 * The amount by which the image should be blurred (using lower-level content).
 * 1 would blur by 2x, 2 would blur by 4x, -1 would sharpen by 2x, etc.
 * @property blur
 * @type number
 * @default 0
 */
SDImagePrototype.blur = 0;

/**
 * The tile source for the image. This can be set to a string value, which will
 * be interpreted as a URL for a DZC or DZI file. It can also be set to a TileSource
 * object directly. If you set it to a falsy value, it will remove the current tile
 * source, if one exists. The image's state doesn't change immediately using a setter
 * when the src property is set; instead, it detects the change on the next update
 * cycle.
 * @property src
 * @type object
 */

// Also set up a stylesheet specifying any standard styles:

(function() {
    var head, style, text,
        selector = "sdimg",
        styleRules = "display:inline-block",
        styleString = selector + " {" + styleRules + "}";

    if (document.createStyleSheet) {
        // The IE way. Unfortunately document.createStyleSheet(undefined, 0)
        // doesn't create a blank style and put it first, it creates a link
        // element with href="undefined". So to ensure that our rule always
        // is first, we'll try to hijack an existing stylesheet, and
        // only create a new one if there aren't any others yet.

        try {
            if (document.styleSheets.length > 0) {
                // put the rule into an existing style sheet
                style = document.styleSheets[0];
            } else {
                // if no style sheets exist yet, create a new one
                style = document.createStyleSheet();
            }
            // insert our new rule into the sheet
            style.addRule(selector, styleRules, 0);
        } catch (e) {
            // It's possible to fail here since pages are limited to 31 stylesheets
            // and 4095 rules per sheet.
            SDDebug_warn("Error while creating default styles: " + e.message);
        }

    } else {
        // The basic DOM manipulation way. Create a style, make it be
        // the first thing in <head>.

        head = document.documentElement.firstChild;

        style = document.createElement("style");
        text = document.createTextNode(styleString);
        style.appendChild(text);
        head.insertBefore(style, head.firstChild);
    }
}());

// Pseudo-instance methods for tracking high-level state:

function SDImage_onSrcClear(sdImg) {
    // clear and reset the state
    if (sdImg.state) {
        sdImg.state.destroy();
    }
    sdImg.state = null;
}

// when a TileSource instance is ready to be drawn, e.g. if src was set to a
// DZI/DZC URL, and the tile source for that DZI/DZC is now loaded.
function SDImage_onTileSourceLoad(sdImg, source, error) {
    // check whether the node is in the DOM
    if (sdImg.immediateMode && sdImg.parentNode) {
        sdImg.immediateMode = false;
    } else {
        // turns out checking for parentNode is pretty expensive (like every other DOM operation),
        // so we'll skip it more often than not. We'll keep a counter tracking how many times
        // we've skipped it, so that we still periodically check whether the image should
        // be set up with a Drawer.
        sdImg.skippedParentCheck = SDMath_floor(Math.random() * 30);
    }

    // If the Image was created for immediate mode rendering, then it will
    // be drawn onscreen via method calls, not automatically.
    var drawer = (sdImg.immediateMode) ?
        SDDrawer_nullDrawer :
        SDDrawer_$(sdImg.container, source.normHeight);

    sdImg.state = new SDImageState(
        source,
        drawer,
        sdImg.blendTime,
        sdImg.fadeTime
    );

    // Now fire a load event so that any user-defined logic can happen.
    // Note that standard load events, such as on the img element,
    // capture but don't bubble.
    SDEvent_raise(sdImg, "load", false);

    // then begin drawing!
    // We'll skip it for now, someone will call update soon enough.
    /*if (!sdImg.manualUpdates) {
        SDImage_onTickSrcSet(sdImg);
    }*/
}

function SDImage_fetchSrc(sdImg, src) {
    SDDeepZoom_fetchTileSource(src, function (tileSource) {
        if (tileSource instanceof SDTileSource) {
            SDImage_onTileSourceLoad(sdImg, tileSource);
        } else {
            SDDebug_warn("SDImage: failed to fetch tile source at " + src);
        }
    });
}

function SDImage_onSrcSet(sdImg) {
    var src = sdImg.src,
        srcType = typeof src;

    // either fetch the TileSource (if src is URL), or begin drawing it!
    if (srcType === "string") {
        // begin loading the URL
        SDImage_fetchSrc(sdImg, src);
    } else if (srcType === "object") {
        SDImage_onTileSourceLoad(sdImg, SDTileSource_$(src));
    } else {
        SDDebug_error("Unsupported src type: " + srcType);
    }
}

// this.src was previously set to something non-empty, and now it's changed to
// something else non-empty.
function SDImage_onSrcChange(sdImg) {
    SDImage_onSrcClear(sdImg);
    SDImage_onSrcSet(sdImg);
}

function SDImage_onTickSrcEmpty(sdImg) {
    // nothing to do!
}

function SDImage_onTickSrcSet(sdImg, position, clip) {
    // if src was set to an URL, we may be waiting for it to be downloaded
    if (!sdImg.state) {
        return;
    }

    // check whether the image was just added to the DOM
    if (sdImg.immediateMode) {
        // we perform this check relatively infrequently because it's expensive.
        if (sdImg.skippedParentCheck > 30) {
            if (sdImg.parentNode) {
                // we have to build a real Drawer now, since the node is present onscreen.
                // easiest way to accomplish that is to reset the image state.
                sdImg.immediateMode = false;
                SDImage_onTileSourceLoad(sdImg, sdImg.state.source);
            }
            sdImg.skippedParentCheck = 0;
        } else {
            sdImg.skippedParentCheck++;
        }
    }

    // find the container object's current position and such
    var container = sdImg.container,
        boundingRect = position || SDElement_getBoundingClientRect(container),
        curWidth = boundingRect.width,
        curHeight = boundingRect.height,
        windowDimensions,
        curClip;
    if (position || clip) {
        curClip = clip;
    } else {
        windowDimensions = SDElement_getWindowDimensions();
        if (sdImg.clipParent) {
            windowDimensions = windowDimensions.intersect(SDElement_getBoundingClientRect(sdImg.clipParent));
            if (!windowDimensions) {
                windowDimensions = new SDRect(0, 0, 0, 0);
            }
        }
        curClip = SDElement_getClippingBounds(container, boundingRect, windowDimensions);
    }

    // if we're collapsed or removed from the DOM, do nothing
    if (!curWidth || !curHeight) {
        return;
    }

    // the update method expects a position centered around (0,0) for foviation.
    if (!position) {
        boundingRect.x -= windowDimensions.width / 2;
        boundingRect.y -= windowDimensions.height / 2;
    }

    // The rest of the update logic isn't specific to HTML, so call the update
    // method defined in ImageController.
    sdImg.state.update(boundingRect, curClip, sdImg.blur - SDImage_pixelRatio);
}

function SDImage_onTick(sdImg, now, position, clip) {
    var lastSrc = sdImg.lastSrc, src = sdImg.src;

    // case 1: previously empty src, now set
    if (!lastSrc && src) {
        SDImage_onSrcSet(sdImg);
    }

    // case 2: previously set src, now empty
    else if (lastSrc && !src) {
        SDImage_onSrcClear(sdImg);
    }

    // case 3: changed non-empty src
    else if (src !== lastSrc) {
        SDImage_onSrcChange(sdImg);
    }

    // case 4: nothing changed, and src is empty
    else if (!src) {
        SDImage_onTickSrcEmpty(sdImg);
    }

    // case 5: nothing changed, and src is non-empty
    else if (src) {
        SDImage_onTickSrcSet(sdImg, position, clip);
    }

    // default case: unknown?
    else {
        SDDebug_warn("SDImage_onTick: unknown state! " +
            "src={0}, lastSrc={1}", src, lastSrc);
    }

    // in all cases, remember what the src is now
    sdImg.lastSrc = src;

    // since we're calling this in a Timer, we need to return true to stay registered
    return true;
}

// Pseudo-instance methods for initializing images:

SDImage_init = function (sdImg) {
    var container = sdImg.container,
        containerStyle = container.style;

    // mark the container div as part of the sdimg
    container.className = "sdimgcontainerdiv";

    // we'll be putting our canvases into this container dynamically
    containerStyle.textAlign = "left";      // fix for IE7!
    containerStyle.overflow = "hidden";

    if (sdImg.style) {
        sdImg.appendChild(container);
        containerStyle.position = "relative";
        containerStyle.width = containerStyle.height = "100%";
    }

    // unless this <sdimg> is to be managed manually, register it for automatic
    // global updates
    if (!sdImg.manualUpdates) {
        sdImg.timerID = SDImageManager.register(SDImage_onTick, sdImg);
    }

    return sdImg;
};

/**
 * <p>
 * Update this Image. If no arguments are given, the Image will compute its
 * current position and clipping based on its clipParent, if specified, or
 * the window. If the position or clip are specified, the given values are
 * used instead. Position is a Rect specifying the element's current position
 * in pixel coordinates with (0, 0) in the center of the user's view. Clip is
 * a Rect, also in pixel coordinates, with (0, 0) at the top-left of the
 * Image. If position is provided but clip is not, this method will assume
 * that none of the Image is clipped out-of-bounds.
 * </p>
 * <p>
 * If you're creating an app that uses many simultaneous Images, we recommend
 * creating them with manualUpdates:true and running this update function as
 * part of the refresh cycle, since it will likely be much faster than relying
 * on DOM methods to find the Image's position onscreen automatically.
 * </p>
 * <p>
 * Any image intended for immediate-mode rendering with Image.drawImage must
 * use manual updates, since the Image isn't in the DOM and won't have any
 * way of finding its current position during automatic updates.
 * </p>
 * @method update
 * @param {Rect} position? The Image's current position.
 * @param {Rect} clip? The Image's current clipping rectangle.
 */
SDImagePrototype.update = function (position, clip) {
    SDImage_onTick(this, null, position, clip);
};

/**
 * Destroy this Image, releasing its current state and unregistering
 * from automatic updates if necessary.
 * @method destroy
 */
SDImagePrototype.destroy = function () {
    this.drawer.destroy();
    if (this.timerID) {
        SDImageManager.unregister(this.timerID);
    }
};

// This API is public, mimics the ctx.drawImage() call.
/**
 * Draw the provided Image to the provided canvas 2d context, with clipping
 * bounds for the source image. Source coordinates are in pixel values, so
 * they depend on whatever size was last passed to the Image's update
 * function.
 * @method drawImage
 * @static
 * @param {CanvasRenderingContext2D} ctx The 2d canvas context to draw on.
 * @param {Image} image The Image object to draw from.
 * @param {number} sx The x coordinate of the left in the source image.
 * @param {number} sy The y coordinate of the top in the source image.
 * @param {number} sw The width of the drawn piece of the source image.
 * @param {number} sh The height of the drawn piece of the source image.
 * @param {number} dx The x coordinate of the left edge to draw on the canvas.
 * @param {number} dy The y coordinate of the top edge to draw on the canvas.
 * @param {number} dw The width to draw on the canvas.
 * @param {number} dh The height to draw on the canvas.
 */
/**
 * Draw the provided Image to the provided canvas 2d context at the specified
 * location. The width and height of the image drawn on the canvas depend on
 * the most recent size passed to the Image's update function.
 * @method drawImage&nbsp;
 * @static
 * @param {CanvasRenderingContext2D} ctx The 2d canvas context to draw on.
 * @param {Image} image The Image object to draw from.
 * @param {number} dx The x coordinate of the left edge to draw on the canvas.
 * @param {number} dy The y coordinate of the top edge to draw on the canvas.
 */
/**
 * Draw the provided Image to the provided canvas 2d context at the specified
 * location.
 * @method drawImage&nbsp;&nbsp;
 * @static
 * @param {CanvasRenderingContext2D} ctx The 2d canvas context to draw on.
 * @param {Image} image The Image object to draw from.
 * @param {number} dx The x coordinate of the left edge to draw on the canvas.
 * @param {number} dy The y coordinate of the top edge to draw on the canvas.
 * @param {number} dw The width to draw on the canvas.
 * @param {number} dh The height to draw on the canvas.
 * @return {bool} whether the image was drawn at full resolution, with no
 * tiles blending, fading, or loading
 */
SDImage.drawImage = function (ctx, image, sx, sy, sw, sh, dx, dy, dw, dh) {
    var normHeight,
        levels,
        i, j, k,
        level,
        levelOpacity,
        levelBounds,
        tiles,
        leftCol,
        rightCol,
        topRow,
        bottomRow,
        column,
        tile,
        opacity,
        srcRect,
        tileBounds,
        destX,
        destY,
        destWidth,
        destHeight,
        clipping,
        fullyDrawn = true,
        maxLevel;

    // We're not interested in the Image, just its ImageState.
    image = image.state;
    if (!image) {
        SDDebug_warn("Image.drawImage: Image isn't ready yet!");
        return false;
    }

    maxLevel = image.maxLevel;

    // parse arguments to figure out the coordinates.
    if (sw === undefined) {
        dx = sx;
        dy = sy;
        dw = image.position.width;
        dh = image.position.height;
    } else if (dx === undefined) {
        dx = sx;
        dy = sy;
        dw = sw;
        dh = sh;
    } else {
        // There may be more efficient ways of doing this, but we'll use a
        // rectangular clip path. Source coordinates are expected to be in
        // pixel values, i.e. relative to the width and height provided to
        // the image element in its update method.
        ctx.save();
        ctx.beginPath();
        ctx.rect(dx, dy, dw, dh);
        ctx.clip();
        clipping = true;

        // Now change the destination coordinates so that the part visible
        // through the clip rectangle is the desired portion of the source image.
        dx -= sx * dw / sw;
        dy -= sy * dh / sh;
        dw *= image.position.width / sw;
        dh *= image.position.height / sh;
    }

    normHeight = image.source.normHeight;
    levels = image.levels;

    // iterate over each level, drawing everything we find
    for (i = image.source.minLevel; !!(level = levels[i]); i++) {
        if (level.visible) {
            levelBounds = level.bounds;
            levelOpacity = level.opacity;
            if (levelOpacity !== 1) {
                ctx.save();
                ctx.globalAlpha *= levelOpacity;
                fullyDrawn = false;
            }
            leftCol = levelBounds.x;
            topRow = levelBounds.y;
            rightCol = leftCol + levelBounds.width;
            bottomRow = topRow + levelBounds.height;
            tiles = level.tiles;
            for (j = leftCol; j <= rightCol; j++) {
                column = tiles[j];
                for (k = topRow; k <= bottomRow; k++) {
                    tile = column[k];
                    if (tile.view) {
                        opacity = tile.opacity;
                        if (opacity !== 1) {
                            ctx.save();
                            ctx.globalAlpha *= opacity;
                            fullyDrawn = false;
                        }
                        srcRect = tile.crop;
                        tileBounds = tile.bounds;
                        destX = dx + tileBounds.x * dw;
                        destY = dy + tileBounds.y * dh / normHeight;
                        destWidth = tileBounds.width * dw;
                        destHeight = tileBounds.height * dh / normHeight;
                        if (srcRect) {
                            ctx.drawImage(tile.view,
                                srcRect.x, srcRect.y, srcRect.width, srcRect.height,
                                destX, destY, destWidth, destHeight
                            );
                        } else {
                            ctx.drawImage(tile.view,
                                destX, destY, destWidth, destHeight
                            );
                        }
                        if (opacity !== 1) {
                            ctx.restore();
                        }
                    } else {
                        fullyDrawn = false;
                    }
                }
            }
            if (levelOpacity !== 1) {
                ctx.restore();
            }
        }
    }

    // check whether the last level we drew matches the highest-resolution level
    // that isn't already fading
    if (maxLevel !== i - 1 || (levels[maxLevel] && !levels[maxLevel].visible)) {
        fullyDrawn = false;
    }

    // get rid of the clip path, if we used one
    if (clipping) {
        ctx.restore();
    }

    // let the caller know whether this image still needs to be redrawn
    return fullyDrawn;
};
