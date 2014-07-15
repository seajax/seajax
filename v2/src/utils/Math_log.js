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

// Math_log.js
// Defines the Seadragon2.Math.log(), log2() and log10() methods.

/*global SDMath */
/*jslint strict: false */

var

    // aliases to improve lookup perf and allow minification;
    // other parts of the Seadragon code can reference these also!
    SDMath_ln = Math.log,
    SDMath_LN2 = Math.LN2,
    SDMath_LN10 = Math.LN10,
    SDMath_exp = Math.exp,

    /**
     *  Returns the log of the given number in the given base.
     *  @method log
     *  @param {number} x
     *  @param {number} base
     *  @return {number}
     */
    SDMath_log = SDMath.log = function (x, base) {
	    if (base) {
	        return SDMath_ln(x) / SDMath_ln(base);
	    } else {
            // assume base of E, equivalent to Math.log() then
	        return SDMath_ln(x);
	    }
	},

    /**
     *  Returns the log of the given number in base 2.
     *  @method log2
     *  @param {number} x
     *  @return {number}
     */
    SDMath_log2 = SDMath.log2 = function (x) {
	    return SDMath_ln(x) / SDMath_LN2;
	},

    /**
     *  Returns the log of the given number in base 10.
     *  @method log10
     *  @param {number} x
     *  @return {number}
     */
    SDMath_log10 = SDMath.log10 = function (x) {
	    return SDMath_ln(x) / SDMath_LN10;
	};
