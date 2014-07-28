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

// Math_morton.js
// Defines the Seadragon2.Math.morton() and reverseMorton() methods.

/*global SDMath, SDPoint */
/*jshint strict: false, plusplus: false, bitwise: false */

var

    /**
     *  Returns the Morton number (z-order) of the 2D point at the
     *  given x- and y-values.
     *  @method morton
     *  @param {number} x The x-value of the 2D point.
     *  @param {number} y The y-value of the 2D point.
     *  @return {number}
     */
    /**
     *  Returns the Morton number (also known as z-order) of the given 2D point. The
     *  point can be a Point instance or an {x,y} point literal.
     *  @method morton&nbsp;
     *  @param {Point} point
     *  @return {number}
     */
    SDMath_morton = SDMath.morton = function (varargs) {
	    var x, y, arg0 = arguments[0], result, position, bit;
	
	    if (typeof arg0 === "object") {
	        x = arg0.x;
	        y = arg0.y;
	    } else {
	        x = arg0;
	        y = arguments[1];
	    }
	
	    result = 0;
	    position = 0;
	    bit = 1;
	
	    while (bit <= x || bit <= y) {
	        if (bit & x) {
	            result |= 1 << (2 * position + 1);
	        }
	        if (bit & y) {
	            result |= 1 << (2 * position);
	        }
	
	        position++;
	        bit = 1 << position;
	    }
	
	    return result;
	},

    /**
     *  Returns the 2D point represented by the given Morton number (z-order).
     *  @method reverseMorton
     *  @param {number} n
     *  @return {Point}
     */
    SDMath_reverseMorton = SDMath.reverseMorton = function (n) {
	    var xBits = [], yBits = [], x = 0, y = 0, i;
	
	    while (n > 0) {
	        yBits.push(n % 2);
	        n = n >> 1;
	        xBits.push(n % 2);
	        n = n >> 1;
	    }
	
	    for (i = 0; i < xBits.length; i++) {
	        x += (1 << i) * xBits[i];
	    }
	
	    for (i = 0; i < yBits.length; i++) {
	        y += (1 << i) * yBits[i];
	    }
	
	    return new SDPoint(x, y);
	};
