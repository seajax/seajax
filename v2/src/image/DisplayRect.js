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

// DisplayRect.js
// Defines the Seadragon2.DisplayRect class.

/*global SD, SDRect */
/*jshint strict: false */

var

    /**
     *  Represents a Deep Zoom display rectangle, which describes a rectangle of a
     *  sparse image at only some levels of the image tile pyramid.
     *  @class DisplayRect
     *  @namespace Seadragon2
     *  @extends Rect 
     */
    /**
     *  Constructs a DisplayRect representing the rect with the given x, y, width
     *  and height values at the levels in the range [minLevel,maxLevel].
     *  @constructor
     *  @param {number} x
     *  @param {number} y
     *  @param {number} width
     *  @param {number} height
     *  @param {number} minLevel
     *  @param {number} maxLevel
     */
    SDDisplayRect = SD.DisplayRect = function (x, y, width, height, minLevel, maxLevel) {
	    
	    // inherits from SDRect
	    this.base(x, y, width, height);
	    this.base = this.base.prototype;

        /**
         *  The minimum level in the image tile pyramid for which this display rect
         *  applies.
         *  @property minLevel
         *  @type number
         */	    
	    this.minLevel = minLevel || 0;

        /**
         *  The maximum level in the image tile pyramid for which this display rect
         *  applies.
         *  @property maxLevel
         *  @type number
         */
	    this.maxLevel = maxLevel || Number.POSITIVE_INFINITY;
	    
	},

    /**
     *  Returns a DisplayRect instance representing the given
     *  {x,y,width,height,minLevel,maxLevel} object literal. If the object is
     *  already a DisplayRect instance, the same instance is returned. This allows
     *  apps to accept anonymous display rect literals while still being able to use
     *  all of the DisplayRect class's methods.
     *  @method $
     *  @static
     *  @param {object} obj An (x,y,width,height,minLevel,maxLevel) object literal
     *  representing a display rect.
     *  @return {DisplayRect} A DisplayRect instance representing the given object
     *  literal.
     */
    SDDisplayRect$ = SDDisplayRect.$ = function (obj) {
	    if (obj instanceof SDDisplayRect) {
	        return obj;
	    }
	
	    return new SDDisplayRect(
	        obj.x, obj.y, obj.width, obj.height, obj.minLevel, obj.maxLevel);
	},

    SDDisplayRectPrototype = SDDisplayRect.prototype = new SDRect();

SDDisplayRectPrototype.base = SDRect;

/**
 *  Returns true if the given object represents the same display rect as this
 *  one.
 *  @param {object} other
 *  @returns {boolean} True if the given object represents the same display rect
 *  as this one.
 */
SDDisplayRectPrototype.equals = function (other) {
    return this.base.equals.call(this, other) &&
        (this.minLevel === other.minLevel || 0) &&
        (this.maxLevel === other.maxLevel || 0);
};

/**
 *  Returns a human-readable representation of this display rect. The returned
 *  string is of the format "[{x},{y}|{width}x{height}|{minLevel}-{maxLevel}]",
 *  e.g. "[10,20|30x40|5-15]".
 *  @return {string} A human-readable representation of this display rect.
 */
SDDisplayRectPrototype.toString = function () {
    return this.base.toString.call(this).replace("]",
        ["|", this.minLevel, "-", this.maxLevel, "]"].join(''));
};
