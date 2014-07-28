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

// Math_mod.js
// Defines the Seadragon2.Math.mod() method.

/*global SDMath */
/*jshint strict: false */

var

    /**
     *  <p>
     *  Returns the given number modulo the given base. Unlike the built-in modulo
     *  operator (%), this method uses <strong><em>floored division</em></strong>
     *  instead of <em>truncated division</em>, so that the result has the same sign
     *  as the <strong><em>base</em></strong>. This also results in continuity in
     *  the results rather than symmetry between positive and negative inputs.
     *  </p>
     *  <p>
     *  Examples:
     *  </p>
     *  <pre>
     *  function compare(x, base) {
     *      alert((x % base) + " vs. " + mod(x, base));
     *  }
     *  
     *  compare(5, 3);      // => "2 vs. 2"
     *  compare(4, 3);      // => "1 vs. 1"
     *  compare(3, 3);      // => "0 vs. 0"
     *  compare(2, 3);      // => "2 vs. 2"
     *  compare(1, 3);      // => "1 vs. 1"
     *  compare(0, 3);      // => "0 vs. 0"
     *  compare(-1, 3);     // => "-1 vs. 2"
     *  compare(-2, 3);     // => "-2 vs. 1"
     *  compare(-3, 3);     // => "0 vs. 0"
     *  compare(-4, 3);     // => "-1 vs. 2"
     *  compare(-5, 3);     // => "-2 vs. 1"
     *  </pre>
     *  @method mod
     *  @param {number} x
     *  @param {number} base? The base to use. If not given, 1.0 is used.
     *  @return {number}
     */
    SDMath_mod = SDMath.mod = function (x, base) {
	    if (arguments.length === 1) {
	        base = 1;
	    }
	
	    return (base + (x % base)) % base;
	};
