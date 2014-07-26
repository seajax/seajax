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

// Point.js
// Defines the Seadragon2.Point class.

/*global SD, SDSize */
/*jshint strict: false */

/**
 *  Represents a 2D point. This class encourages immutability -- all instance
 *  methods return a new Point rather than modifying the instance -- but does
 *  not require it or enforce it. All methods of this class that take a Point
 *  argument also support anonymous {x,y} point literals instead.
 *  @class Point
 *  @namespace Seadragon2
 */

var

    /**
     *  Constructs a Point with the given x and y values.
     *  @constructor
     *  @param {number} x The x-value of the point to construct.
     *  @param {number} y The y-value of the point to construct.
     */
    SDPoint = SD.Point = function (x, y) {

        /**
         *  The x-value of this point.
         *  @property x
         *  @type number
         */
        this.x = x || 0;
        
        /**
         *  The y-value of this point.
         *  @property y
         *  @type number
         */
        this.y = y || 0;
    },

    /**
     *  <p>
     *  Returns a Point instance representing the given {x,y} object literal. If the
     *  object is already a Point instance, the same instance is returned. This
     *  allows apps to accept anonymous point literals while still being able to use
     *  all of the Point class's methods.
     *  </p>
     *  <p>
     *  Examples:
     *  </p>
     *  <pre>
     *  var p1 = new Point(10, 20);
     *  var p2 = $(p1);
     *  var p3 = { x: 10, y: 20 };
     *  var p4 = $(p3);
     *  
     *  alert(p1);  // => "(10,20)" via Point.toString()
     *  alert(p2);  // => "(10,20)"
     *  alert(p1 === p2);   // => true (same instance)
     *  alert(p3);  // => "[object Object]"
     *  alert(p4);  // => "(10,20)"
     *  alert(typeof p3.plus);  // => "undefined"
     *  alert(typeof p4.plus);  // => "function"
     *  </pre>
     *  @method $
     *  @static
     *  @param {object} obj An (x,y) object literal representing a point.
     *  @return {Point} A Point instance representing the given object literal.
     */
    SDPoint_$ = SDPoint.$ = function (obj) {
        if (obj instanceof SDPoint) {
            return obj;
        }

        obj = obj || {};
        return new SDPoint(obj.x, obj.y);
    },

    SDPointPrototype = SDPoint.prototype,
    
    SDPoint_origin = new SDPoint(0, 0);

/**
 *  Adds the given point to this point and returns the result.
 *  @method plus
 *  @param {Point} point The point to add.
 *  @return {Point} The resulting point sum.
 */
SDPointPrototype.plus = function (point) {
    return new SDPoint(this.x + point.x, this.y + point.y);
};

/**
 *  Subtracts the given point from this point and returns the result.
 *  @method minus
 *  @param {Point} point The point to subtract.
 *  @return {Point} The resulting point difference.
 */
SDPointPrototype.minus = function (point) {
    return new SDPoint(this.x - point.x, this.y - point.y);
};

/**
 *  Multiplies this point by the given factor and returns the result.
 *  @method times
 *  @param {number} factor The factor to multiply by.
 *  @return {Point} The resulting point product.
 */
SDPointPrototype.times = function (factor) {
    return new SDPoint(this.x * factor, this.y * factor);
};

/**
 *  Divides this point by the given factor and returns the result.
 *  @method divide
 *  @param {number} factor The factor to divide by.
 *  @return {Point} The resulting point quotient.
 */
SDPointPrototype.divide = function (factor) {
    return new SDPoint(this.x / factor, this.y / factor);
};

/**
 *  Returns the (-x,-y) negation of this point.
 *  @method negate
 *  @return {Point} The (-x,-y) negation of this point.
 */
SDPointPrototype.negate = function () {
    return new SDPoint(-this.x, -this.y);
};

/**
 *  Applies the given unary function, e.g. Math.floor() or Math.round(), to the
 *  x- and y-values of this point and returns the result.
 *  @method apply
 *  @param {function} func The unary function to apply. The function should accept a
 *  number and return a number. Examples are Math.floor() and Math.round().
 *  @return {Point} The resulting point.
 */
SDPointPrototype.apply = function (func) {
    return new SDPoint(func(this.x), func(this.y));
};

/**
 *  Calculates the Euclidean distance from the given point to this one and
 *  returns the result.
 *  @method distanceTo
 *  @param {Point} point The other point.
 *  @return {number} The Euclidean distance from the given point to this one.
 */
SDPointPrototype.distanceTo = function (point) {
    var xDiff = this.x - point.x,
        yDiff = this.y - point.y;
    return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
};

/**
 *  Creates and returns a Size instance whose width and height values represent
 *  the x- and y-values of this point, respectively.
 *  @method asSize
 *  @return {Size} A Size instance whose width and height represent the x- and
 *  y-values of this point, respectively.
 */
SDPointPrototype.asSize = function () {
    return new SDSize(this.x, this.y);
};

/**
 *  Returns true if the given object represents the same 2D point as this one.
 *  @method equals
 *  @param {object} other The other object to compare.
 *  @returns {boolean} True if the given object represents the same 2D point as
 *  this one.
 */
SDPointPrototype.equals = function (other) {
    return (this.x === (other.x || 0)) && (this.y === (other.y || 0));
};

/**
 *  Returns a human-readable representation of this point. The returned string
 *  is of the format "({x},{y})", e.g. "(10,20)".
 *  @method toString
 *  @return {string} A human-readable representation of this point.
 */
SDPointPrototype.toString = function () {
    return ["(", this.x, ",", this.y, ")"].join('');
};
