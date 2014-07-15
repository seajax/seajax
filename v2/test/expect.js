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

/*global Math, TestFailException, expectTrue, expectEqual */

function TestFailException(msg) {
    this.name = "TestFailException";
    this.message = msg;
}

function expectTrue(cond, msg) {
    if (!cond) {
        throw new TestFailException(msg || "[failed expectTrue]");
    }
}

function expectFalse(cond, msg) {
    if (cond) {
        throw new TestFailException(msg || "[failed expectFalse]");
    }
}

function expectEqual(act, exp, msg) {
    if (act != exp) {
        throw new TestFailException((msg || "[failed expectEquals]") +
            " [expected " + exp + ", actual " + act + "]");
    }
}

function expectAlmostEqual(act, exp, msg) {
    if (Math.abs(act - exp) / (exp || 1) < 0.0001) {
        act = exp;
    }

    expectEqual(act, exp, msg);
}

function expectArraysEqual(act, exp, msg) {
    expectEqual(act.length, exp.length, (msg || "arrays equal") + " [length]");
    for (var i = 0; i < act.length; i++) {
        expectEqual(act[i], exp[i], (msg || "arrays equal") + " [index " + i + "]");
    }
}

function expectObjectsEqual(obj, other, msg) {
    if (!obj || !other) {
        expectEqual(obj, other);
        return;
    }

    expectTrue(obj.equals(other), msg || (obj + " equals " + other));
}

function expectTypeof(obj, type, msg) {
    expectTrue(typeof obj === type, msg || (obj + " of type " + type));
}

//function expectInstanceof(obj, className, msg) {
//    expectTrue(obj instanceof className, msg || (obj + " instanceof " + className));
//}

//function assertGT(x, min, msg) {
//    expectTrue(x > min, msg);
//}

//function assertGTE(x, min, msg) {
//    expectTrue(x >= min, msg);
//}

//function assertLT(x, max, msg) {
//    expectTrue(x < min, msg);
//}

//function assertLTE(x, max, msg) {
//    expectTrue(x <= max, msg);
//}
