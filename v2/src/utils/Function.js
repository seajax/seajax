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

// Function.js
// Defines the Seadragon2.Function class.

/*global SD */
/*jslint strict: false, plusplus: false */

var

    /**
     *  A utility class for working with Javascript functions.
     *  @class Function
     *  @namespace Seadragon2
     *  @static
     */
    SDFunction = SD.Function = {},
    
    SDFunction_EMPTY = SDFunction.EMPTY = function () {
        // nothing to do, simply returns undefined
    },

    /**
     *  <p>
     *  Returns a function that, when called, calls the given function, with the
     *  given object bound to the <code>this</code> keyword. That is, the value of
     *  <code>this</code> inside the given function will be the given object. In
     *  addition, the returned function passes along any given arguments, in the
     *  order that they were given.
     *  </p>
     *  @method bind
     *  @param {object} obj The object that the given function should bind to; i.e.
     *  the object that should become <code>this</code>.
     *  @param {function} func The function to bind.
     *  @param {varargs} ...? Any arguments that should be passed to the given
     *  function. They will be prepended to any arguments passsed to the returned
     *  function.
     *  @return {function} A function that, when called, calls the given function
     *  with the given object bound to <code>this</code>, passing along all given
     *  arguments in the order they were given.
     */
    /**
     *  Calls <code>bind</code> with a method on the given object, using the given
     *  method name to get the method. For example, calling
     *  <code>bind(obj, "toString")</code> is equivalent to, but less verbose and
     *  redundant than, calling <code>bind(obj, obj.toString)</code>.
     *  @method bind&nbsp;
     *  @param {object} obj See above.
     *  @param {string} methodName The name of the method on the given object to
     *  bind.
     *  @param {object*} ...? See above.
     *  @return {function} See above.
     */
    SDFunction_bind = SDFunction.bind = function (obj, func, varargs) {
        var args = new Array(arguments.length - 2), i, numArgs = args.length;

        for (i = 0; i < numArgs; i++) {
            args[i] = arguments[i + 2];
        }

        // support string method names also
        if (typeof func === "string") {
            func = obj[func];
        }

        return function () {
            var i, numArguments = arguments.length;

            for (i = 0; i < numArguments; i++) {
                args.push(arguments[i]);
            }

            func.apply(obj, args);
        };
    },

    /**
     *  Returns a function that, when called, will execute the given function
     *  with the given arguments. Similar to bind, but without the first
     *  argument.
     *  @method callback
     *  @param {function} func The function.
     *  @param {object*} ...? Any arguments to pass when calling the function.
     *  @return {function} A new function that encapsulates the call.
     */
    SDFunction_callback = SDFunction.callback = function (func, varargs) {
        // just bind() without the first object arg...
        var numArguments = arguments.length,
            args = new Array(numArguments + 1),
            i;

        // ...so copy the args with the object arg set to null (that gets
        // translated to the global object in Function.apply)...
        args[0] = null;
        for (i = 0; i < numArguments; i++) {
            args[i + 1] = arguments[i];
        }

        //...and call bind() with the expanded args.
        return SDFunction_bind.apply(SDFunction, args);
    },

    /**
     *  Delay execution of the given function by the given timeout.
     *  @method delay
     *  @param {function} func The function
     *  @param {number} msecs The length of delay, in milliseconds.
     *  @return {function} A function that, when executed, will start the
     *  requested timeout.
     */
    SDFunction_delay = SDFunction.delay = function (func, msecs) {
        return function () {
            setTimeout(SDFunction_bind(this, func), msecs);
        };
    };
