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

// Canvas.js
// Defines the Seadragon2.Canvas class.

/*global SD, SDSize, SDRect, SDObject_extend, SDDebug_warn */
/*jslint strict: false */

var

    SDCanvas_CANVAS_API_AVAIALBLE =
        typeof document.createElement("canvas").getContext === "function",
    
    SDCanvas_CSS_TRANSITION_PROP = (function () {
        var PROPS = ["transition", "WebkitTransition", "MozTransition"],
            prop,
            docElmtStyle = document.documentElement.style;
        
        while (prop = PROPS.shift()) {
            if (typeof docElmtStyle[prop] !== "undefined") {
                return prop;
            }
        }
        
        return null;
    }()),
    
    SDCanvas_CSS_TRANSITIONS_AVAILABLE = !!SDCanvas_CSS_TRANSITION_PROP,
    
    SDCanvas_IE_FILTERS_AVAILABLE = (function () {
        try {
            return !!document.documentElement.filters;
        } catch (e) {
            // IE9 throws an error when trying to access the filters prop
            return false;
        }
    }()),
    
    SDCanvas_IE_FADE_FILTER = "progid:DXImageTransform.Microsoft.Fade",
    
    // IE by default uses nearest-neighbor interpolation for stretched or
    // shrunk images. IE7 introduced bicubic interpolation. if the page is at a
    // zoom other than 100%, bicubic is the default interpolation in IE7+.
    // otherwise, bicubic must be specified via a CSS property. unfortunately,
    // it results in tile seams in IE7 -- but not in IE8, even in compat mode!
    // so we apply it in IE8 only, by detection of the document.documentMode
    // property introduced in IE8 that's present in all modes.
    SDCanvas_MS_INTERPOLATION_MODE =
        document.documentMode ? "bicubic" : "nearest-neighbor",

    SDCanvas = SD.Canvas = function (opts) {
        
        // override the default options (defined by this class's prototype) with
        // the given ones:
        SDObject_extend(this, opts);
        
        this.width = 300;
        this.height = 150;
        
        if (SDCanvas_CANVAS_API_AVAIALBLE && !this.forceImgMode) {
            
            // <canvas> 2d mode
            this.canvas = document.createElement("canvas");
            this.context2d = this.canvas.getContext("2d");
            this.drawImage = SDCanvasPrototype_drawImage_canvas;
            
        } else {
            
            // <img> mode
            this.canvas = document.createElement("div");
            this.drawImage = SDCanvasPrototype_drawImage_img;
            
        }
        
        // boilerplate code to extend and initialize a regular HTML element with
        // the properties and methods of this class and instance:
        return SDCanvas_init(SDObject_extend(
            document.createElement("sdcanvas"), this, true));
        
    },
    
    SDCanvasPrototype = SDCanvas.prototype;

function SDCanvas_init(sdCanvas) {
    var innerCanvas = sdCanvas.canvas,
        innerCanvasStyle = innerCanvas.style;
    
    // this is the only style we set on the public element. we set inline-block
    // to ensure the same behavior as regular <canvas> and <img> elements.
    sdCanvas.style.display = "inline-block";
    
    innerCanvasStyle.display = "block";
    innerCanvasStyle.position = "relative";     // for the <img> case
    innerCanvasStyle.overflow = "hidden";       // for the <img> case
    innerCanvasStyle.width = "100%";
    innerCanvasStyle.height = "100%";
    
    sdCanvas.appendChild(innerCanvas);
    
    return sdCanvas;
}

// Default options:

SDCanvasPrototype.forceImgMode = false;
SDCanvasPrototype.useCssPixels = false;

// Basic methods:

SDCanvasPrototype.clear = function () {
    var canvas = this.canvas,
        context2d = this.context2d;
    
    if (context2d) {
        canvas.width = canvas.width;
        canvas.height = canvas.height;
        // this shouldn't be needed, but it seemed like it was; is it?
        //context2d.clearRect(0, 0, canvas.width, canvas.height);
    } else {
        canvas.innerHTML = "";
    }
};

SDCanvasPrototype.getSize = function () {
    return new SDSize(this.width, this.height);
};

SDCanvasPrototype.setSize = function (sizeOrWidth/*, height?*/) {
    var width,
        height,
        canvas = this.canvas;
    
    // support both one arg (size) and two (width, height)
    if (typeof sizeOrWidth === "object") {
        width = sizeOrWidth.width;
        height = sizeOrWidth.height;
    } else {
        width = sizeOrWidth;
        height = arguments[1];
    }
    
    this.width = width || 0;
    this.height = height || 0;
    
    if (this.context2d) {
        canvas.width = width || 0;
        canvas.height = height || 0;
    }
};

// Drawing images:

function SDCanvas_generateDrawImage(drawImageFunc) {
    // handles the different overload and null cases
    return function (img, arg1, arg2, opacity, blendTimeLeft) {
        var srcRect, destRect;
        
        // the HTML5 canvas spec says that if the image hasn't loaded yet (via
        // the img.complete property), don't draw it. unfortunately in IE, that
        // property remains false during the img.onload event, only becoming
        // true after the event. however, for our own internal use, we defer
        // the onload event handling anyway, since IE incorrectly raises events
        // in the middle of ongoing javascript execution. so at least for now,
        // we'll go ahead and ignore seemingly incomplete images.
        if (!img.complete) {
            SDDebug_warn(
                "Seadragon2.Canvas.drawImage: ignoring incomplete image: " +
                img.src);
            return;
        }
        
        if (arg2) {
            // both arguments were given; arg1 is src, arg2 is dest. if dest is
            // just a Point, not a Rect, use src's width and height. this follows
            // the HTML5 canvas spec. BUT src can be null, so use image's width and
            // height in that case, which also follows the spec.
            // TODO TEST for the null case
            srcRect = arg1;
            destRect = arg2;
            if (!arg2.width && !arg2.height) {
                destRect.width = srcRect ? srcRect.width : img.width;
                destRect.height = srcRect ? srcRect.height : img.height;
            }
        } else if (arg1) {
            // only one argument was given; arg1 is dest. if just a Point, not a
            // Rect, use the image's width and height (like above).
            destRect = arg1;
            if (!arg1.width && !arg1.height) {
                destRect.width = img.width;
                destRect.height = img.height;
            }
        } else {
            // neither arguments were given; use the image's width and height.
            destRect = new SDRect(0, 0, img.width, img.height);
        }
        
        drawImageFunc(this, img, srcRect, destRect, opacity, blendTimeLeft);
    };
}

function SDCanvas_onImageLoad_applyCssTransition() {
    var img = this,
        style = img.style;
    
    style.opacity = "";     // same as "1", but implicit
    style[SDCanvas_CSS_TRANSITION_PROP + "Property"] = "opacity";
    style[SDCanvas_CSS_TRANSITION_PROP + "Duration"] = img.blendTimeLeft + "ms";
    style[SDCanvas_CSS_TRANSITION_PROP + "TimingFunction"] = "linear";
    
    delete img.onload;
    delete img.blendTimeLeft;
}

var

    SDCanvasPrototype_drawImage_img = SDCanvas_generateDrawImage(
        function (sdCanvas, imgOrig, srcRect, destRect, opacity, blendTimeLeft) {
            var imgCopy = document.createElement("img"),
                imgStyle = imgCopy.style,
                div,
                divStyle,
                surfaceWidth = sdCanvas.width,
                surfaceHeight = sdCanvas.height,
                displayWidth = sdCanvas.clientWidth || surfaceWidth,
                displayHeight = sdCanvas.clientHeight || surfaceHeight,
                blendTime = sdCanvas.blendTime;
    
            // create and use a copy of the image, not the original
            imgCopy.src = imgOrig.src;
            imgStyle.position = "absolute";
            imgStyle.msInterpolationMode = SDCanvas_MS_INTERPOLATION_MODE;
    
            if (srcRect) {
                
                // css clip doesn't support percent values. use hidden overflow instead: outer div contains img.
                div = document.createElement("div"); 
                divStyle = div.style;
                divStyle.position = "absolute";
                divStyle.overflow = "hidden";
    
                // place div at expected position and size
                divStyle.left = (100 * destRect.x / surfaceWidth).toFixed(8) + "%";
                divStyle.top = (100 * destRect.y / surfaceHeight).toFixed(8) + "%";
                divStyle.width = (100 * destRect.width / surfaceWidth).toFixed(8) + "%";
                divStyle.height = (100 * destRect.height / surfaceHeight).toFixed(8) + "%";
    
                // place img inside div with percents, so scales with div
                imgStyle.left = (-100 * srcRect.x / srcRect.width).toFixed(8) + "%";
                imgStyle.top = (-100 * srcRect.y / srcRect.height).toFixed(8) + "%";
                imgStyle.width = (100 * imgOrig.width / srcRect.width).toFixed(8) + "%";
                imgStyle.height = (100 * imgOrig.height / srcRect.height).toFixed(8) + "%";
    
                div.appendChild(imgCopy);
                sdCanvas.canvas.appendChild(div);
                
            } else {
            
                // no cropping necessary
                var factorX, factorY, units;
                
                if (sdCanvas.useCssPixels) {
                    factorX = displayWidth;
                    factorY = displayHeight;
                    units = "px";
                } else {
                    factorX = factorY = 100;
                    units = "%";
                }
                
                var left = factorX * destRect.x / surfaceWidth,
                    top = factorY * destRect.y / surfaceHeight,
                    width = factorX * destRect.width / surfaceWidth,
                    height = factorY * destRect.height / surfaceHeight;
                
                if (sdCanvas.useCssPixels) {
                    // always oversize tiles rather than letting the browser
                    // sometimes undersize them. this prevents tile seams when
                    // the tiles have no overlap...
                    left = Math.floor(left);
                    top = Math.floor(top);
                    width = Math.ceil(width);
                    height = Math.ceil(height);
                }
                
                imgStyle.left = left.toFixed(8) + units;
                imgStyle.top = top.toFixed(8) + units;
                imgStyle.width = width.toFixed(8) + units;
                imgStyle.height = height.toFixed(8) + units;
                
                sdCanvas.canvas.appendChild(imgCopy);
                
            }
            
            if (blendTimeLeft > 0 && opacity < 1) {
                
                if (SDCanvas_CSS_TRANSITIONS_AVAILABLE) {
                    
                    imgStyle.opacity = opacity.toFixed(2);
                    imgCopy.onload = SDCanvas_onImageLoad_applyCssTransition;
                    imgCopy.blendTimeLeft = blendTimeLeft;
                    
                } else if (SDCanvas_IE_FILTERS_AVAILABLE) { 
                    
                    imgStyle.filter = [
                        SDCanvas_IE_FADE_FILTER,
                        '(duration=',
                        (blendTimeLeft / 1000).toFixed(3),  // convert to seconds
                        ')'
                    ].join('');
                    
                    // if any of the below lines are throwing an error, it's
                    // likely because the element is still not in the HTML DOM.
                    // apparently in IE we can access an element's filters only
                    // once it's in the DOM, otherwise it throws an error. so make
                    // sure the element's container is in the DOM as well.
                    
                    imgStyle.visibility = "hidden";
                    imgCopy.filters[0].apply();
                    
                    imgStyle.visibility = ""; // same as "visible", but implicit
                    imgCopy.filters[0].percent = Math.round(100 * opacity);
                    imgCopy.filters[0].play();
                    
                }
                
            }
        }
    ),

    SDCanvasPrototype_drawImage_canvas = SDCanvas_generateDrawImage(
        function (sdCanvas, img, srcRect, destRect) {
            if (srcRect) {
                sdCanvas.context2d.drawImage(img,
                    srcRect.x, srcRect.y, srcRect.width, srcRect.height,
                    destRect.x, destRect.y, destRect.width, destRect.height);
            } else {
                sdCanvas.context2d.drawImage(img,
                    destRect.x, destRect.y, destRect.width, destRect.height);
            }
        }
    );

