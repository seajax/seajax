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

// Rect.js
// Defines the Seadragon2.Rect class.

/*global SD, SDPoint, SDSize */
/*jshint strict: false */

/**
 *  Represents a 2D rectangle. This class encourages immutability -- instance
 *  methods return a new Rect rather than modifying the instance -- but does not
 *  require it or enforce it. All methods of this class that take a Rect
 *  argument also support anonymous {x,y,width,height} size literals instead.
 *  @class Rect
 *  @namespace Seadragon2
 */

var

    /**
     *  Constructs a Rect with the given x, y, width and height values.
     *  @constructor
     *  @param {number} x The x-value of the rect to construct.
     *  @param {number} y The y-value of the rect to construct.
     *  @param {number} width The width value of the rect to construct.
     *  @param {number} height The height value of the rect to construct.
     */
    /*  YUI doc doesn't accept multiple constructors, so we'll leave this one out.
     *  Constructs a Rect with the given top-left point and size.
     *  @constructor
     *  @param {Point} point The top-left point of the rect to construct.
     *  @param {Size} size The size of the rect to construct.
     */
    SDRect = SD.Rect = function (x, y, width, height) {
        if (x && width === undefined && x.x !== undefined) {
            // the first argument has an x property, so it's probably a Point.
            width = y.width;
            height = y.height;
            y = x.y;
            x = x.x;
        }
    
        this.x = x || 0;
        this.y = y || 0;
        this.width = width || 0;
        this.height = height || 0;
    },

    /**
     *  <p>
     *  Returns a Rect instance representing the given {x,y,width,height} object
     *  literal. If the object is already a Rect instance, the same instance is
     *  returned. This allows apps to accept anonymous rect literals while still
     *  being able to use all of the Rect class's methods.
     *  </p>
     *  <p>
     *  Examples:
     *  </p>
     *  <pre>
     *  var r1 = new Rect(10, 20, 30, 40);
     *  var r2 = $(r1);
     *  var r3 = { x: 10, y: 20, width: 30, height: 40 };
     *  var r4 = $(r3);
     *  
     *  alert(r1);  // => "[10,20|30x40]" via Rect.toString()
     *  alert(r2);  // => "[10,20|30x40]"
     *  alert(r1 === r2);   // => true (same instance)
     *  alert(r3);  // => "[object Object]"
     *  alert(r4);  // => "[10,20|30x40]"
     *  alert(typeof r3.getArea);   // => "undefined"
     *  alert(typeof r4.getArea);   // => "function"
     *  </pre>
     *  @method $
     *  @static
     *  @param {object} obj An (x,y,width,height) object literal representing a
     *  rect.
     *  @return {Rect} A Rect instance representing the given object literal.
     */
    SDRect_$ = SDRect.$ = function (obj) {
        if (obj instanceof SDRect) {
            return obj;
        }
    
        return new SDRect(obj.x, obj.y, obj.width, obj.height);
    },

    SDRectPrototype = SDRect.prototype,
    
    // singletons for useful rectangles
    SDRect_unitRect = new SDRect(0, 0, 1, 1),
    SDRect_nullRect = new SDRect(-1, -1, -1, -1);

/**
 *  Returns the area (width x height) of this rect.
 *  @return {number} The area (width x height) of this rect.
 */
SDRectPrototype.getArea = function () {
    return this.width * this.height;
};

/**
 *  Returns the aspect ratio (width / height) of this rect.
 *  @return {number} The aspect ratio (width / height) of this rect.
 */
SDRectPrototype.getAspectRatio = function () {
    return this.width / this.height;
};

/**
 *  Returns the width-normalized height (height / width) of this rect.
 *  @return {number} The width-normalized height (height / width) of this rect.
 */
SDRectPrototype.getNormHeight = function () {
    return this.height / this.width;
};

/**
 *  Returns the top-left point of this rect.
 *  @return {Point} The top-left point of this rect.
 */
SDRectPrototype.getTopLeft = function () {
    return new SDPoint(this.x, this.y);
};

/**
 *  Returns the bottom-right point of this rect.
 *  @return {Point} The bottom-right point of this rect.
 */
SDRectPrototype.getBottomRight = function () {
    return new SDPoint(this.x + this.width, this.y + this.height);
};

/**
 *  Returns the center point of this rect.
 *  @return {Point} The center point of this rect.
 */
SDRectPrototype.getCenter = function () {
    return new SDPoint(this.x + (this.width / 2), this.y + (this.height / 2));
};

/**
 *  Returns the size of this rect.
 *  @return {Size} The size of this rect.
 */
SDRectPrototype.getSize = function () {
    return new SDSize(this.width, this.height);
};

/**
 *  Returns true if this rect contains the given point.
 *  @method contains
 *  @param {Point} point
 *  @return {boolean} True if this rect contains the given point.
 */
/**
 *  Returns true if this rect contains the given rect entirely.
 *  @method contains&nbsp;
 *  @param {Rect} rect
 *  @return {boolean} True if this rect contains the given rect entirely.
 */
SDRectPrototype.contains = function (pointOrRect) {
    var thisRight = this.x + this.width,
        thisBottom = this.y + this.height,
        pointOrRectRight = pointOrRect.x + (pointOrRect.width || 0),
        pointOrRectBottom = pointOrRect.y + (pointOrRect.height || 0);

    return (this.x <= pointOrRect.x) && (this.y <= pointOrRect.y) &&
        (thisRight >= pointOrRectRight) && (thisBottom >= pointOrRectBottom);
};

/**
 *  Returns the union of this rect and the given point. The returned rect is the
 *  smallest possible rect that contains both this rect and the given point.
 *  @method union
 *  @param {Point} point
 *  @return {Rect} The union of this rect and the given point.
 */
/**
 *  Returns the union of this rect and the given rect. The returned rect is the
 *  smallest possible rect that contains both this rect and the given rect.
 *  @method union&nbsp;
 *  @param {Rect} rect
 *  @return {Rect} The union of this rect and the given rect.
 */
SDRectPrototype.union = function (pointOrRect) {
    var minX = Math.min(this.x, pointOrRect.x),
        minY = Math.min(this.y, pointOrRect.y),
        maxRight = Math.max(
            this.x + this.width, pointOrRect.x + (pointOrRect.width || 0)),
        maxBottom = Math.max(
            this.y + this.height, pointOrRect.y + (pointOrRect.height || 0));

    return new SDRect(minX, minY, maxRight - minX, maxBottom - minY);
};

/**
 *  Returns the intersection of this rect and the given point. The result is the
 *  given point if the two intersect, or null if they don't.
 *  @method intersect
 *  @param {Point} point
 *  @return {Point} The given point if the point intersects with this rect,
 *  otherwise null.
 */
/**
 *  Returns the intersection of this rect and the given rect. The resulting rect
 *  can have an empty width and/or an empty height if the intersection is a line
 *  or a single point, but if the two don't intersect, the result is null.
 *  @method intersect&nbsp;
 *  @param {Rect} rect
 *  @return {Rect} The rect representing the intersection of this rect and the
 *  given rect if the two intersect, otherwise null.
 */
SDRectPrototype.intersect = function (pointOrRect) {
    var maxX = Math.max(this.x, pointOrRect.x),
        maxY = Math.max(this.y, pointOrRect.y),
        width = -maxX + Math.min(   // equivalent to minRight - maxX
            this.x + this.width, pointOrRect.x + (pointOrRect.width || 0)),
        height = -maxY + Math.min(  // equivalent to minBottom - maxY
            this.y + this.height, pointOrRect.y + (pointOrRect.height || 0));

    // if the result is a point, explicitly return a point
    if (!width && !height && !(pointOrRect instanceof SDRect)) {
        return new SDPoint(maxX, maxY);
    }

    // if the two don't overlap, explicitly return null
    if (width < 0 || height < 0) {
        return null;
    }

    // otherwise, return the intersecting rect!
    return new SDRect(maxX, maxY, width, height);
};

/**
 *  Scales this rect by the given factor and optionally about the given point
 *  (defaulting to the top-left of this rect) and returns the result.
 *  @param {number} factor The factor to scale by.
 *  @param {Point} aboutPoint? The point to scale about. If not given, the
 *  top-left of this rect is used.
 *  @return {Rect} The resulting scaled rect.
 */
SDRectPrototype.scale = function(factor, aboutPoint) {
    var aboutX = aboutPoint ? aboutPoint.x : this.x,
        aboutY = aboutPoint ? aboutPoint.y : this.y;
    
    return new SDRect(
        aboutX - factor * (aboutX - this.x),
        aboutY - factor * (aboutY - this.y),
        this.width * factor,
        this.height * factor);
};

/**
 *  Translates this rect by the given delta point and returns the result.
 *  @param {Point} deltaPoint The amount to translate this rect by in x and y.
 *  @return {Rect} The resulting translated rect.
 */
SDRectPrototype.translate = function(deltaPoint) {
    return new SDRect(
        this.x + (deltaPoint.x || 0),
        this.y + (deltaPoint.y || 0),
        this.width,
        this.height);
};

/**
 *  Returns true if the given object represents the same 2D rect as this one.
 *  @param {object} other
 *  @returns {boolean} True if the given object represents the same 2D rect as
 *  this one.
 */
SDRectPrototype.equals = function (other) {
    return (this.x === (other.x || 0)) && (this.y === (other.y || 0)) &&
        (this.width === (other.width || 0)) && (this.height === (other.height || 0));
};

/**
 *  Returns a human-readable representation of this rect. The returned string
 *  is of the format "[{x},{y}|{width}x{height}]", e.g. "[10,20|30x40]".
 *  @return {string} A human-readable representation of this rect.
 */
SDRectPrototype.toString = function () {
    return [
        "[", this.x, ",", this.y, "|", this.width, "x", this.height, "]"
    ].join('');
};
