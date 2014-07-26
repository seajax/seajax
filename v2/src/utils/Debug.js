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

// Debug.js
// Defines the Seadragon2.Debug class.

/*global alert, console, SD, SDString_format */
/*jshint strict: false */

var

    /**
     *  A utility class for logging debugging information, warnings and error
     *  messages. Uses the Javascript console if one is present, otherwise
     *  optionally alerts the messages. Supports string formatting and fail-fast
     *  error throwing, and can be fully enabled or disabled.
     *  @class Debug
     *  @namespace Seadragon2
     *  @static
     */
    SDDebug = SD.Debug = {
    
        /**
         *  Whether messages should be alerted, in the case that there's no Javascript
         *  console. The value corresponds to message importance; 1 is errors only, 2
         *  includes warnings, and 3 includes logs.
         *  @property alert
         *  @type boolean
         *  @default 0
         */
        alert: 0,
        
        /**
         *  Whether any messages should be logged or not. If this is zero, all calls
         *  to all methods of this class do nothing, returning immediately. The value
         *  corresponds to message importance; 1 is errors only, 2 includes warnings,
         *  and 3 includes logs.
         *  @property enabled
         *  @type number
         *  @default 3
         */
        enabled: 3
    },

    /**
     *  Logs the given message, optionally formatted with the given arguments, as
     *  an informational message.
     *  @method log
     *  @param {string} msg The message to log.
     *  @param {object*} ...? Any format arguments to apply to the given message.
     */
    SDDebug_log = SDDebug.log = function (msg, varargs) {
        if (SDDebug.enabled < 3) {
            return;
        }

        if (arguments.length > 1) {
            msg = SDString_format.apply(this, arguments);
        }
            
        if ((typeof console !== "undefined") && console.log) {
            console.log(msg);
        } else if (SDDebug.alert >= 3) {
            alert(msg);
        }
    },

    /**
     *  Logs the given message, optionally formatted with the given arguments, as a
     *  warning message.
     *  @method warn
     *  @param {string} msg The message to log.
     *  @param {object*} ...? Any format arguments to apply to the given message.
     */
    SDDebug_warn = SDDebug.warn = function (msg/*, ...*/) {
        if (SDDebug.enabled < 2) {
            return;
        }

        if (arguments.length > 1) {
            msg = SDString_format.apply(this, arguments);
        }

        if ((typeof console !== "undefined") && console.warn) {
            console.warn(msg);
        } else if (SDDebug.alert >= 2) {
            alert(msg);
        }
    },

    /**
     *  Logs the given message as an error message, and throws either the given
     *  error object or a new, empty one, to provide fail-fast behavior.
     *  @method error
     *  @param {string} msg The message to log.
     *  @param {Error} e? The specific error object to throw. If not supplied, a
     *  new, empty error is thrown.
     */
    SDDebug_error = SDDebug.error = function (msg, e) {
        if (SDDebug.enabled < 1) {
            return;
        }
        
        if ((typeof console !== "undefined") && console.error) {
            console.error(msg);
        } else if (SDDebug.alert >= 1) {
            alert(msg);
        }

        throw e || new Error(msg);
    };
