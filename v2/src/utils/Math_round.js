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

// Math_round.js
// Defines the Seadragon2.Math.round() method.

/*global SDMath */
/*jshint strict: false */

var

    // aliases to improve lookup perf and allow minification;
    // other parts of the Seadragon code can reference these also!
    SDMath_ceil = Math.ceil,
    SDMath_floor = Math.floor,

    /**
     *  Returns the given number rounded to the nearest multiple of the base.
     *  @method round
     *  @param {number} x The number to round.
     *  @param {number} threshold? A value in the range [0,1] that determines when to
     *  round up. The default value is 0.5 to mimic the behavior of Math.round(). A
     *  value closer to 0 makes rounding up more probable while a value closer to 1
     *  makes rounding down more probable.
     *  @param {number} by? The interval size to round to. Default value is 1, but
     *  Math.round(x, .5, 10) would round to the nearest 10, for example.
     *  @return {number} The result of rounding.
     */
    SDMath_round = SDMath.round = function (x, threshold, by) {
        // default values:
        if (typeof by === "undefined") {
            by = 1;
        }
        if (typeof threshold === "undefined") {
            threshold = 0.5;
        }
        
        // There are sometimes precision errors in the modulo operation.
        // e.g. 3.3 % 1 gives 0.2999999999999998, so when threshold=0.3,
        // this incorrectly floors insteads of ceils. we can maybe fix this by
        // deriving a difference and comparing that to an epsilon, but is that
        // really worth it here? 
        
        x /= by;
        
        // Note that we use the positive modulo so that negative numbers are
        // not treated differently.
        if (((x % 1) + 1) % 1 < threshold) {
            return SDMath_floor(x) * by;
        } else {
            return SDMath_ceil(x) * by;
        }
    };
