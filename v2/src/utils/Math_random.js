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

// Math_random.js
// Defines the Seadragon2.Math.random() method.

/*global SDMath */
/*jshint strict: false */

var

    /**
     *  Returns a random number in the range [min,max) within the given increment.
     *  For example, <code>random(3, 11, 4)</code> will return either 3 or 7. The
     *  next increment would be 11, but it's at the exclusive upper range.
     *  @method random
     *  @param {number} min
     *  @param {number} max
     *  @param {number} by The increment to apply, starting at min.
     *  @return {number}
     */
    /**
     *  Returns a random number in the range [0,max).
     *  @method random&nbsp;
     *  @param {number} max
     *  @return {number}
     */
    /**
     *  Returns a random number in the range [min,max).
     *  @method random&nbsp;&nbsp;
     *  @param {number} min
     *  @param {number} max
     *  @return {number}
     */
    SDMath_random = SDMath.random = function (varargs) {
	    var min = 0, max = 1, by = 0;
	
	    if (arguments.length <= 1) {
	        max = arguments[0] || 1;
	    } else {
	        min = arguments[0];
	        max = arguments[1];
	        by = arguments[2];
	    }
	
	    if (!by) {
	        return (max - min) * Math.random() + min;
	    }
	
	    return Math.floor((max - min) * Math.random() / by) * by + min;
	};
