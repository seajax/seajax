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

// String.js
// Defines the Seadragon2.String class.

/*global SD */
/*jslint strict: false, plusplus: false */

var

    /**
     *  A utility class for working with Javascript strings.
     *  @class String
     *  @private
     *  @namespace Seadragon2
     *  @static
     */    
    SDString = SD.String = {},

    // actually three overloads:
    // 1. varargs, e.g. format("{0}{1}", "hello ", "world")
    // 2. dictionary <-- must be object literal! (constructor === Object)
    // 3. array <-- must be array literal! (constructor === Array)
    /**
     *  
     *  @method format
     *  @param {string} str
     *  @param {object*} ...
     *  @return {string} 
     */
    /**
     *  
     *  @method format&nbsp;
     *  @param {string} str
     *  @param {object} args
     *  @return {string} 
     */
    SDString_format = SDString.format = function (str, varargs) {
        var args, i;

        // support both a varargs list, and a single argument that's an object
        // hash or array. (in that case, the string arguments are the hash keys
        // or array indices anyway, so they're just properties of that object.)
        if (arguments.length === 2 && varargs && varargs.constructor &&
            (varargs.constructor === Array || varargs.constructor === Object)) {
            args = varargs;
        } else {
            args = new Array(arguments.length - 1);
            for (i = 0; i < args.length; i++) {
                args[i] = arguments[i + 1];
            }
        }

        // TODO ignore escaped (double) brackets
        return str.replace(/\{[\d\w]+\}/g, function (capture) {
            var key = capture.match(/[\d\w]+/);
            return args[key] || "";
        });
    };
