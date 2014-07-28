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

// Size.js
// Defines the Seadragon2.Size class.

/*global SD, SDPoint */
/*jshint strict: false */

/**
 *  Represents a 2D size. This class encourages immutability -- all instance
 *  methods return a new Size rather than modifying the instance -- but does
 *  not require it or enforce it. All methods of this class that take a Size
 *  argument also support anonymous {width,height} size literals instead.
 *  @class Size
 *  @namespace Seadragon2
 */

var

    /**
     *  Constructs a Size with the given width and height values.
     *  @constructor
     *  @param {number} width The width value of the size to construct.
     *  @param {number} height The height value of the size to construct.
     */
    SDSize = SD.Size = function (width, height) {

        /**
         *  The width value of this size.
         *  @property width
         *  @type number
         */
        this.width = width || 0;
        
        /**
         *  The height value of this size.
         *  @property height
         *  @type number
         */
        this.height = height || 0;
    },

    /**
     *  <p>
     *  Returns a Size instance representing the given {width,height} object
     *  literal. If the object is already a Size instance, the same instance is
     *  returned. This allows apps to accept anonymous size literals while still
     *  being able to use all of the Size class's methods.
     *  </p>
     *  <p>
     *  Examples:
     *  </p>
     *  <pre>
     *  var s1 = new Size(10, 20);
     *  var s2 = $(s1);
     *  var s3 = { width: 10, height: 20 };
     *  var s4 = $(s3);
     *  
     *  alert(s1);  // => "(10x20)" via Size.toString()
     *  alert(s2);  // => "(10x20)"
     *  alert(s1 === s2);   // => true (same instance)
     *  alert(s3);  // => "[object Object]"
     *  alert(s4);  // => "(10x20)"
     *  alert(typeof s3.plus);  // => "undefined"
     *  alert(typeof s4.plus);  // => "function"
     *  </pre>
     *  @method $
     *  @static
     *  @param {object} obj A (width,height) object literal representing a size.
     *  @return {Size} A Size instance representing the given object literal.
     */
    SDSize_$ = SDSize.$ = function (obj) {
        if (obj instanceof SDSize) {
            return obj;
        }

        obj = obj || {};
        return new SDSize(obj.width, obj.height);
    },

    SDSizePrototype = SDSize.prototype;

/**
 *  Adds the given size to this size and returns the result.
 *  @method plus
 *  @param {Size} size The size to add.
 *  @return {Size} The resulting size sum.
 */
SDSizePrototype.plus = function (size) {
    return new SDSize(this.width + size.width, this.height + size.height);
};

/**
 *  Subtracts the given size from this size and returns the result.
 *  @method minus
 *  @param {Size} size The size to subtract.
 *  @return {Size} The resulting size difference.
 */
SDSizePrototype.minus = function (size) {
    return new SDSize(this.width - size.width, this.height - size.height);
};

/**
 *  Multiplies this size by the given factor and returns the result.
 *  @method times
 *  @param {number} factor The factor to multiply by.
 *  @return {Size} The resulting size product.
 */
SDSizePrototype.times = function (factor) {
    return new SDSize(this.width * factor, this.height * factor);
};

/**
 *  Divides this size by the given factor and returns the result.
 *  @method divide
 *  @param {number} factor The factor to divide by.
 *  @return {Size} The resulting size quotient.
 */
SDSizePrototype.divide = function (factor) {
    return new SDSize(this.width / factor, this.height / factor);
};

/**
 *  Returns the (-width,-height) negation of this size.
 *  @method negate
 *  @return {Size} The (-width,-height) negation of this size.
 */
SDSizePrototype.negate = function () {
    return new SDSize(-this.width, -this.height);
};

/**
 *  Applies the given unary function, e.g. Math.floor() or Math.round(), to the
 *  width and height values of this size and returns the result.
 *  @method apply
 *  @param {function} func The unary function to apply. The function should accept a
 *  number and return a number. Examples are Math.floor() and Math.round().
 *  @return {Size} The resulting size.
 */
SDSizePrototype.apply = function (func) {
    return new SDSize(func(this.width), func(this.height));
};

/**
 *  Creates and returns a Point instance whose width and height represent the
 *  width and height values of this size, respectively.
 *  @method asPoint
 *  @return {Point} A Point instance whose x- and y-values represent the width
 *  and height values of this size, respectively.
 */
SDSizePrototype.asPoint = function () {
    return new SDPoint(this.width, this.height);
};

/**
 *  Returns true if the given object represents the same 2D size as this one.
 *  @param {object} other
 *  @returns {boolean} True if the given object represents the same 2D size as
 *  this one.
 */
SDSizePrototype.equals = function (other) {
    return (this.width === (other.width || 0)) && (this.height === (other.height || 0));
};

/**
 *  Returns a human-readable representation of this size. The returned string
 *  is of the format "({width}x{height})", e.g. "(10x20)".
 *  @return {string} A human-readable representation of this size.
 */
SDSizePrototype.toString = function () {
    return ["(", this.width, "x", this.height, ")"].join('');
};
