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

// Element.js
// Defines the Seadragon2.Element class and its $() method.

/*global SD, window, innerWidth, innerHeight, SDMath_min, SDRect, SDBrowser_isIE8, document, SDSize,
 SDMath_max, getComputedStyle, SDDebug_error, SDPoint, SDPage_getScroll*/
/*jshint strict: false */

var

    /**
     *  A utility class for working with HTML elements.
     *  @class Element
     *  @namespace Seadragon2
     *  @static
     */
    SDElement = SD.Element = {},

    /**
     *  If the argument is a string, return the element with that ID.
     *  Otherwise, return the given element.
     *  @method $
     *  @static
     *  @param {string or HTMLElement} elmtOrId
     *  @return {HTMLElement} The requested element.
     */
    SDElement_$ = SDElement.$ = function (elmtOrId) {
        if (typeof elmtOrId === "string") {
            return document.getElementById(elmtOrId);
        }

        return elmtOrId;
    },

    /**
     * Returns a Rect object representing the current window's dimensions.
     * @method getWindowDimensions
     * @static
     * @return {Rect} The width and height of the window.
     */
    SDElement_getWindowDimensions = SDElement.getWindowDimensions = function () {
        // self mutating method, because we don't know what to do until the DOM is initialized,
        // so we wait until the first call to this method to do browser interop.
        if (typeof innerWidth !== "undefined") {
            // most browsers
            SDElement_getWindowDimensions = SDElement.getWindowDimensions = function () {
                return new SDRect(0, 0, innerWidth, innerHeight);
            };
        } else if (document.documentElement && document.documentElement.clientHeight) {
            // IE
            SDElement_getWindowDimensions = SDElement.getWindowDimensions = function () {
                var d = document.documentElement;
                return new SDRect(0, 0, d.clientWidth, d.clientHeight);
            };
        } else if (document.body.clientHeight) {
            // also IE
            SDElement_getWindowDimensions = SDElement.getWindowDimensions = function () {
                var b = document.body;
                return new SDRect(0, 0, b.clientWidth, b.clientHeight);
            };
        } else {
            // throw hands up in despair, report an absurdly large window
            SDElement_getWindowDimensions = SDElement.getWindowDimensions = function () {
                return new SDRect(0, 0, Infinity, Infinity);
            };
        }
        return SDElement_getWindowDimensions();
    },

    /**
     * Get the bounding rectangle of an element, in window coordinates,
     * as a Rect object.
     * @method getBoundingClientRect
     * @static
     * @param {HTMLElement} elmt
     */
    SDElement_getBoundingClientRect = SDElement.getBoundingClientRect = function (elmt) {
        var boundingRect = elmt.getBoundingClientRect();
        return new SDRect(
            boundingRect.left,
            boundingRect.top,
            boundingRect.right - boundingRect.left,
            boundingRect.bottom - boundingRect.top
        );
    },

    /**
     * Get an object containing the computed style of the given element.
     * @method getStyle
     * @static
     * @param {HTMLElement} elmt
     */
    SDElement_getStyle = SDElement.getStyle = function (elmt) {
        if (window.getComputedStyle) {
            return getComputedStyle(elmt, null);
        } else if (elmt.currentStyle) {
            return elmt.currentStyle;
        } else {
            SDDebug_error("Unknown element style, no known technique.");
        }
    },

    /**
     * Get the element's offsetParent, or the body element if the given element
     * is styled with position fixed.
     * @method getOffsetParent
     * @static
     * @param {HTMLElement} elmt
     * @param {boolean} isFixed
     */
    SDElement_getOffsetParent = SDElement.getOffsetParent = function (elmt, isFixed) {
        // IE and Opera "fixed" position elements don't have offset parents.
        // regardless, if it's fixed, its offset parent is the body.
        if (isFixed && elmt !== document.body) {
            return document.body;
        } else {
            return elmt.offsetParent;
        }
    },

    /**
     * Get the element's position with respect to the document.
     * @method getPosition
     * @static
     * @param {HTMLElement} elmt
     */
    SDElement_getPosition = SDElement.getPosition = function (elmt) {
        var result = new SDPoint();

        var isFixed = SDElement_getStyle(elmt).position === "fixed";
        var offsetParent = SDElement_getOffsetParent(elmt, isFixed);

        while (offsetParent) {
            result.x += elmt.offsetLeft;
            result.y += elmt.offsetTop;

            if (isFixed) {
                result = result.plus(SDPage_getScroll());
            }

            elmt = offsetParent;
            isFixed = SDElement_getStyle(elmt).position === "fixed";
            offsetParent = SDElement_getOffsetParent(elmt, isFixed);
        }

        return result;
    },

    /**
     * Returns a rectangle containing the clipping bounds that would keep the given element
     * entirely within the browser window. The returned rectangle's dimensions are relative
     * to the element's offset dimensions (including padding and border).
     * @method getClippingBounds
     * @static
     * @param {HTMLElement} elmt The element whose clipping bounds we are finding.
     * @return {Rect} The clipping bounds for the element, as a rectangle in pixel coordinates.
     */
    SDElement_getClippingBounds = SDElement.getClippingBounds = function (elmt, boundingRect, windowDimensions) {

        // parameters are used if passed in to save on recomputing them.
        // this also allows for clipping to objects other than the entire window.
        boundingRect = boundingRect || SDElement_getBoundingClientRect(elmt);
        windowDimensions = windowDimensions || SDElement_getWindowDimensions();

        var
            rectTop = boundingRect.y,
            rectRight = boundingRect.width + boundingRect.x,
            rectBottom = boundingRect.height + boundingRect.y,
            rectLeft = boundingRect.x,
            topEdge,
            leftEdge,
            width,
            height,
            windowLeft = windowDimensions.x,
            windowTop = windowDimensions.y,
            windowRight = windowLeft + windowDimensions.width,
            windowBottom = windowTop + windowDimensions.height;

        // define the viewable rectangle of the element
        topEdge = SDMath_max(0, windowTop - rectTop);
        leftEdge = SDMath_max(0, windowLeft - rectLeft);
        width = SDMath_min(rectRight, windowRight) - rectLeft - leftEdge;
        height = SDMath_min(rectBottom, windowBottom) - rectTop - topEdge;
        return new SDRect(leftEdge, topEdge, width, height);
    },

    /**
     * Set the opacity of the given HTML element.
     * @method setOpacity
     * @static
     * @param {HTMLElement} elmt The HTML element.
     * @param {number} opacity Its current opacity.
     */
    SDElement_setOpacity = SDElement.setOpacity = (function () {
        var temp = document.createElement("div");
        if (typeof temp.style.opacity !== "undefined") {
            // CSS3 way:
            return function (elmt, opacity) {
                elmt.style.opacity = opacity;
            };
        } else if (typeof temp.style.filter !== "undefined") {
            return function (elmt, opacity) {
                var filter = "progid:DXImageTransform.Microsoft.Alpha(Opacity=" + opacity * 100 + ")", children, i, n;
                elmt.style.filter = filter;
                children = elmt.children;
                n = children.length;
                // seems to not automatically apply opacity to children in IE8, so iterate over them:
                for (i = 0; i < n; i++) {
                    try {
                        SDElement_setOpacity(children[i], opacity);
                    } catch (e) {
                        // can't set opacity of comment node, just move on
                    }
                }
            };
        } else {
            return function () {
                // do nothing, since no known opacity is supported
            };
        }
    }()),

    // an object containing the constructors for any custom HTML elements that have been registered.
    // keys into this object are "sd_" + elementName, so if people wanted to use element names that
    // are default object properties like "constructor" or "__proto__" they'd be okay.
    SDElement_customElements = {},

    // save the original createElement function
    SDElement_dce = document.createElement,

    /**
     * Register a custom tag name so that document.createElement("name") will call the
     * given constructor instead of its usual method.
     * @method registerCustomElement
     * @static
     * @private
     * @param {string} name The name of the custom element
     * @param {function} constructor The constructor that creates the custom element
     */
    SDElement_registerCustomElement = function (name, constructor) {
        SDElement_customElements["sd_" + name] = constructor;

        // needed for IE8 and FF2 to work right
        SDElement_dce.call(document, name);
    },

    /**
     * Apply a move-and-scale transform to the element. This is similar to applying
     * the CSS transform:'translate(x, y) scale(scale)'. It is not
     * intended as a fully-featured replacement for CSS transforms, just a convenience
     * for a common operation while zooming HTML content. If the browser doesn't support
     * CSS transforms, we will attempt to reposition the content by setting older CSS
     * properties. The kind of content that can be resized in this way is very limited:
     * pretty much everything must be specified in em sizes so that it scales with its
     * container's font-size.
     * @method transform
     * @static
     * @param elmt {HTMLElement} the DOM element on which to apply the transform
     * @param x {number} the amount to translate the element right by, in its original pixel coordinates
     * @param y {number} the amount to translate the element down by, in its original pixel coordinates
     * @param scale {number} the ratio of the new size to original size, scaled around the element's top-left corner
     */
    SDElement_transform = SDElement.transform = (function () {
        var i,
            transformProperty,
            originProperty,
            transformStrings = [
                "MozTransform",
                "msTransform",
                "OTransform",
                "WebkitTransform",
                "transform"
            ],
            docElmtStyle = document.documentElement.style,
            translateUnit = "",
            result;

        for (i = transformStrings.length - 1; i >= 0; i--) {
            if (typeof docElmtStyle[transformStrings[i]] !== "undefined") {
                transformProperty = transformStrings[i];
                originProperty = transformProperty + "Origin";
                break;
            }
        }
        if (transformProperty === "MozTransform") {
            // firefox requires length properties for offset values
            translateUnit = "px";
        }

        // now that we've detected whether transforms are supported, modify the function.
        if (transformProperty) {
            result = function (elmt, x, y, scale) {
                var style = elmt.sdStyle;

                // only the first time, we must set the transform-origin. We'll use top left.
                // while we're at it, we can store a slightly quicker reference to the element's
                // style object.
                if (!style) {
                    style = elmt.sdStyle = elmt.style;
                    style[originProperty] = "0 0";
                }

                x = x + translateUnit;
                y = y + translateUnit;
                // we'll turn it into a matrix since that might be just slightly faster
                scale = scale + ",";
                style[transformProperty] = "matrix(" + scale + "0,0," + scale + x + "," + y + ")";
            };
        } else {
            result = function (elmt, x, y, scale) {
                var style = elmt.style;
                style.left = x + "px";
                style.top = y + "px";
                style.fontSize = scale + "em";
                style.width = (scale * 100) + "%";
                style.height = (scale * 100) + "%";
            };
        }

        return result;
    }());

// overwrite document.createElement with a function that suits our needs
document.createElement = function (name) {
    var constructor = SDElement_customElements["sd_" + name];
    if (constructor) {
        // we have a constructor for the requested custom element
        return new constructor();
    } else {
        // this is a standard HTML element
        return SDElement_dce.apply(this, arguments);
    }
};
