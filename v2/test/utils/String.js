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

function StringTestSuite() {

    this.name = "String";
    this.tag = "utils";

    function dictToString(dict) {
        if (!dict) {
            return "null";
        }

        var strs = [];
        var first = true;

        strs.push("{");

        for (var key in dict) {
            if (dict.hasOwnProperty(key)) {
                if (!first) {
                    strs.push(",");
                } else {
                    first = false;
                }

                strs.push(key);
                strs.push(":");
                strs.push(dict[key]);
            }
        }

        strs.push("}");

        return strs.join('');
    }

    function verifyFormatArgs(args, exp) {
        expectEqual(Seadragon2.String.format.apply(Seadragon2.String, args), exp,
                "calling format with args: [" + args.join(',') + "]");
    }

    this.formatArgs = function () {
        // Testing format edge cases...
        verifyFormatArgs([""], "");
        verifyFormatArgs(["hello"], "hello");
        verifyFormatArgs(["", 1, 'b', true], "");
        verifyFormatArgs(["{3}"], "");
        verifyFormatArgs(["{0}", new Seadragon2.Point(1, 2)], "(1,2)");   // not ""!

        // Testing format basic cases...
        verifyFormatArgs(["{0}", "world"], "world");
        verifyFormatArgs(["The {0} jumped over the {1}.", "fox", "dogs"], "The fox jumped over the dogs.");
    }

    this.formatObject = function () {

        function verify(str, dict, exp) {
            expectEqual(Seadragon2.String.format(str, dict), exp,
                "format \"" + str + "\" with " + dictToString(dict));
            verifyFormatArgs([str, dict], exp);    // should also work as only object
        };

        // Testing format edge cases...
        verify("", null, "");
        verify("", {}, "");
        verify("hello", null, "hello");
        verify("hello", {}, "hello");
        verify("", [1, 'b', true], "");
        verify("", { 'foo': 'bar', exists: false }, "");
        verify("{0}", [], "");
        verify("{0}", {}, "");               // not "[object Object]"!
        verify("{0}", { "0": "foo" }, "foo");   // not "[object Object]"!
        verify("{0}", { toString: function () { return "hello"; } }, "");   // not "hello"!
        verify("{hello}", { foo: "bar" }, "");

        // Testing format basic cases...
        verify("{0}", ["world"], "world");
        verify("{0}", { "0": "world" }, "world");
        verify("{hello}", { hello: "world" }, "world");
        verify("The {2} jumped over the {5}.", { "2": "fox", "5": "dogs" }, "The fox jumped over the dogs.");
        verify("I'm a {age}-year-old {gender}.", { age: 22, "gender": "male" }, "I'm a 22-year-old male.");
        verify("I'm a {age}-year-old {7}.", { age: 22, "7": "male" }, "I'm a 22-year-old male.");
    }
}

runner.addSuite(new StringTestSuite());
