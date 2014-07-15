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

var PivotNumber_epsilon = 1e-5;

// Format a number, assuming it's supposed to be a decimal value.
// This means we'll try to avoid outputting anything with long strings
// of zeros or nines, since those are usually arithmetic errors.
// TODO Pivot numbers need a lot more formatting than this: CXML
// often specifies custom format strings in the .net ToString style, and
// a proper implementation would be aware of its locale.
function PivotNumber_format(x) {
    // check for zero values so we can avoid taking the log of it
    if (!x) {
        return "0";
    }
    
    // now we count the significant digits
    var scale = Math.floor(Math.log(Math.abs(x)) / Math.LN10),
        y = x / Math.pow(10, scale),
        digits = 0;
    while (digits < 10 && Math.abs(y) > PivotNumber_epsilon) {
        digits++;
        y = (y - Math.round(y)) * 10;
    }
    
    // return a string containing the right number of significant digits.
    // we'll try to avoid exponential notation for smallish numbers, because
    // 1.2e+2 just looks silly.
    if (scale >= digits && scale < digits + 5) {
        return x.toFixed(0);
    } else {
        return x.toPrecision(digits);
    }
}