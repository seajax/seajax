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

function FunctionTestSuite() {

    this.name = "Function";
    this.tag = "utils";

    // global flag to track whether a function executed or not
    var FUNCTION_EXECUTED;

    function generateAssertThisArgs(expThis, expArgs) {
        FUNCTION_EXECUTED = false;
        return function () {
            expectEqual(this, expThis);
            expectArraysEqual(arguments, expArgs);
            FUNCTION_EXECUTED = true;
        };
    }

    this.bind = function () {
        var obj = {};
        var func = Seadragon2.Function.bind(obj, generateAssertThisArgs(obj, []));
        expectTypeof(func, "function");
        func(); // will assert this == obj
    }

    this.bindStr = function () {
        var key = "method";
        var obj = {};
        obj[key] = generateAssertThisArgs(obj, []);
        var func = Seadragon2.Function.bind(obj, key);
        expectFalse(FUNCTION_EXECUTED); // make sure calling bind() didn't execute the function...
        expectTypeof(func, "function");
        func(); // will assert this == obj
        expectTrue(FUNCTION_EXECUTED);  // ...and that the returned function was what we passed in
    }

    this.bindArgs1 = function () {
        var foo = "hello", bar = 42, baz = /re[g]ex/;
        var args = [foo, bar, baz];
        var obj = {};
        var func = Seadragon2.Function.bind(obj, generateAssertThisArgs(obj, args), foo, bar, baz);
        expectFalse(FUNCTION_EXECUTED); // make sure calling bind() didn't execute the function...
        expectTypeof(func, "function");
        func(); // will assert this == obj and arguments == args
        expectTrue(FUNCTION_EXECUTED);  // ...and that the returned function was what we passed in
    }

    this.bindArgs2 = function () {
        var foo = "hello", bar = 42, baz = /re[g]ex/;
        var args = [foo, bar, baz];
        var obj = {};
        var func = Seadragon2.Function.bind(obj, generateAssertThisArgs(obj, args));
        expectFalse(FUNCTION_EXECUTED); // make sure calling bind() didn't execute the function...
        expectTypeof(func, "function");
        func(foo, bar, baz);    // will assert this == obj and arguments == args
        expectTrue(FUNCTION_EXECUTED);  // ...and that the returned function was what we passed in
    }

    this.bindArgs3 = function () {
        var foo = "hello", bar = 42, baz = /re[g]ex/;
        var args = [foo, bar, baz, baz, bar, foo];
        var obj = {};
        var func = Seadragon2.Function.bind(obj, generateAssertThisArgs(obj, args), foo, bar, baz);
        expectFalse(FUNCTION_EXECUTED); // make sure calling bind() didn't execute the function...
        expectTypeof(func, "function");
        func(baz, bar, foo);    // will assert this == obj and arguments == args
        expectTrue(FUNCTION_EXECUTED);  // ...and that the returned function was what we passed in
    }

    this.functionBindArgsStr1 = function () {
        var foo = "hello", bar = 42, baz = /re[g]ex/;
        var args = [foo, bar, baz];
        var obj = {};
        var key = "method";
        obj[key] = generateAssertThisArgs(obj, args);
        var func = Seadragon2.Function.bind(obj, key, foo, bar, baz);
        expectFalse(FUNCTION_EXECUTED); // make sure calling bind() didn't execute the function...
        expectTypeof(func, "function");
        func(); // will assert this == obj and arguments == args
        expectTrue(FUNCTION_EXECUTED);  // ...and that the returned function was what we passed in
    }

    this.bindArgsStr2 = function () {
        var foo = "hello", bar = 42, baz = /re[g]ex/;
        var args = [foo, bar, baz];
        var obj = {};
        var key = "method";
        obj[key] = generateAssertThisArgs(obj, args);
        var func = Seadragon2.Function.bind(obj, key);
        expectFalse(FUNCTION_EXECUTED); // make sure calling bind() didn't execute the function...
        expectTypeof(func, "function");
        func(foo, bar, baz);    // will assert this == obj and arguments == args
        expectTrue(FUNCTION_EXECUTED);  // ...and that the returned function was what we passed in
    }

    this.bindArgsStr3 = function () {
        var foo = "hello", bar = 42, baz = /re[g]ex/;
        var args = [foo, bar, baz, baz, bar, foo];
        var obj = {};
        var key = "method";
        obj[key] = generateAssertThisArgs(obj, args);
        var func = Seadragon2.Function.bind(obj, key, foo, bar, baz);
        expectFalse(FUNCTION_EXECUTED); // make sure calling bind() didn't execute the function...
        expectTypeof(func, "function");
        func(baz, bar, foo);    // will assert this == obj and arguments == args
        expectTrue(FUNCTION_EXECUTED);  // ...and that the returned function was what we passed in
    }

    this.callback = function () {
        var func = Seadragon2.Function.callback(generateAssertThisArgs(window, []));
        expectFalse(FUNCTION_EXECUTED); // make sure calling callback() didn't execute the function...
        expectTypeof(func, "function");
        func();
        expectTrue(FUNCTION_EXECUTED);  // ...and that the returned function was what we passed in
    }

    this.callbackArgs1 = function () {
        var foo = "hello", bar = 42, baz = /re[g]ex/;
        var args = [foo, bar, baz];
        var func = Seadragon2.Function.callback(generateAssertThisArgs(window, args), foo, bar, baz);
        expectFalse(FUNCTION_EXECUTED); // make sure calling callback() didn't execute the function...
        expectTypeof(func, "function");
        func(); // will assert arguments == args
        expectTrue(FUNCTION_EXECUTED);  // ...and that the returned function was what we passed in
    }

    this.callbackArgs2 = function () {
        var foo = "hello", bar = 42, baz = /re[g]ex/;
        var args = [foo, bar, baz];
        var func = Seadragon2.Function.callback(generateAssertThisArgs(window, args));
        expectFalse(FUNCTION_EXECUTED); // make sure calling callback() didn't execute the function...
        expectTypeof(func, "function");
        func(foo, bar, baz);    // will assert arguments == args
        expectTrue(FUNCTION_EXECUTED);  // ...and that the returned function was what we passed in
    }

    this.callbackArgs3 = function () {
        var foo = "hello", bar = 42, baz = /re[g]ex/;
        var args = [foo, bar, baz, baz, bar, foo];
        var func = Seadragon2.Function.callback(generateAssertThisArgs(window, args), foo, bar, baz);
        expectFalse(FUNCTION_EXECUTED); // make sure calling callback() didn't execute the function...
        expectTypeof(func, "function");
        func(baz, bar, foo);    // will assert arguments == args
        expectTrue(FUNCTION_EXECUTED);  // ...and that the returned function was what we passed in
    }
}

runner.addSuite(new FunctionTestSuite());
