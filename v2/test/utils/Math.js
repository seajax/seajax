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

function MathTestSuite() {

    this.name = "Math";
    this.tag = "utils";

    this.clamp = function () {

        function verify (x, min, max, exp) {
            expectEqual(Seadragon2.Math.clamp(x, min, max), exp,
                "clamping " + x + " to [" + min + "," + max + "]");
        };

        verify(0, 0, 0, 0);
        verify(0, -1, 1, 0);
        verify(0, 0, 1, 0);
        verify(0, -1, 0, 0);
        verify(0, 1, 2, 1);
        verify(0, -2, -1, -1);
        verify(0.5, 1, 2, 1);
        verify(0, -2, -1.5, -1.5);
    }

    this.log = function () {

        function verify (x, base, exp) {
            // requires "almost equals" here
            expectAlmostEqual(Seadragon2.Math.log(x, base), exp, x + " log " + base);
        };

        verify(Math.E, Math.E, 1);
        verify(Math.E * Math.E, Math.E, 2);
        verify(1 / Math.E, Math.E, -1);
        verify(2, Math.E, Math.LN2);
        verify(10, Math.E, Math.LN10);
        verify(1, Math.E, 0);
        verify(1, Math.PI, 0);
    }

    this.log2 = function () {

        function verify (x, exp) {
            // requires "almost equals" here
            expectAlmostEqual(Seadragon2.Math.log2(x), exp, x + " log2");
            //testMathLog(x, 2, exp);
        };

        verify(Math.E, Math.LOG2E);
        verify(1, 0);
        verify(0.5, -1);
        verify(0.25, -2);
        verify(0.0625, -4);
        verify(2, 1);
        verify(4, 2);
        verify(16, 4);
    }

    this.log10 = function () {

        function verify (x, exp) {
            // requires "almost equals" here
            expectAlmostEqual(Seadragon2.Math.log10(x), exp, x + " log10");
            //testMathLog(x, 10, exp);
        };

        verify(Math.E, Math.LOG10E);
        verify(1, 0);
        verify(0.1, -1);
        verify(0.01, -2);
        verify(0.0001, -4);
        verify(10, 1);
        verify(100, 2);
        verify(10000, 4);
    }

    this.modulo = function () {

        function verify (x, base, exp) {
            // requires "almost equals" here as sometimes it's off by e.g. 0.0000001%
            expectAlmostEqual(Seadragon2.Math.mod(x, base), exp, x + " mod " + base);
        };

        verify(0, 1, 0);
        verify(1, 1, 0);
        verify(0.3, 1, 0.3);
        verify(1.3, 1, 0.3);
        verify(2.3, 1, 0.3);
        verify(-0.3, 1, 0.7);
        verify(-1.3, 1, 0.7);
        verify(-2.3, 1, 0.7);
    }

    this.random1 = function () {

        function verify (max) {
            var r = Seadragon2.Math.random(max);
            expectTrue(r < max, r + " < " + max);
        };

        verify(1);
        verify(36);
    }

    this.random2 = function () {

        function verify (min, max) {
            var r = Seadragon2.Math.random(min, max);
            expectTrue(r >= min, r + " >= " + min);
            expectTrue(r < max, r + " < " + max);
        };

        verify(0, 1);
        verify(32, 64);
        verify(-1, 0);
        verify(-9999, -8999);
    }

    this.random3 = function () {

        function verify (min, max, by, realBy) {
            var r = Seadragon2.Math.random(min, max, by);
            expectTrue(r >= min, r + " >= " + min);
            expectTrue(r < max, r + " < " + max);

            if (by) {
                realBy = realBy || by;
                // this hackery needed because of cases like 0.5 % 0.1 => 0.09999
                expectAlmostEqual(
            Math.abs(r % realBy - 0.5 * realBy), 0.5 * realBy, r + " by " + realBy);
            }
        };

        verify(0, 1, 0);
        verify(0, 1, 0.1);
        verify(10, 100, 1);
        verify(10, 100, 10);
        verify(-99, -2, 3);
        verify(440, 450, true, 1);
        verify(-450, -440, true, 1);
    }

    this.morton1 = function () {

        function verify (obj, exp) {
            var n = Seadragon2.Math.morton(obj);
            expectEqual(n, exp);
            expectObjectsEqual(Seadragon2.Math.reverseMorton(n), obj);
        };

        verify(new Seadragon2.Point(), 0);
        verify({ x: 0, y: 0 }, 0);
        verify(Seadragon2.Point.$(), 0);
        verify({ x: 0, y: 1 }, 1);
        verify({ x: 1, y: 0 }, 2);
        verify({ x: 1, y: 1 }, 3);
        verify({ x: 3, y: 5 }, 27);
        verify({ x: 5, y: 3 }, 39);
    }

    this.morton2 = function () {

        function verify (x, y, exp) {
            var n = Seadragon2.Math.morton(x, y);
            expectEqual(n, exp);
            expectObjectsEqual(Seadragon2.Math.reverseMorton(n), { x: x, y: y });
        };

        verify(0, 0, 0);
        verify(0, 1, 1);
        verify(1, 0, 2);
        verify(1, 1, 3);
        verify(3, 5, 27);
        verify(5, 3, 39);
    }

    this.reverseMorton = function () {

        function verify (n, exp) {
            var p = Seadragon2.Math.reverseMorton(n);
            expectObjectsEqual(p, exp);
            expectEqual(Seadragon2.Math.morton(p), n);
        };

        verify(0, { x: 0, y: 0 });
        verify(1, { x: 0, y: 1 });
        verify(2, { x: 1, y: 0 });
        verify(3, { x: 1, y: 1 });
        verify(27, { x: 3, y: 5 });
        verify(39, { x: 5, y: 3 });
    }

    this.round1 = function () {

        function verify (x, exp) {
            expectEqual(Seadragon2.Math.round(x), exp, "rounding " + x);
        };

        verify(0, 0);
        verify(1, 1);
        verify(-1, -1);
        verify(0.4, 0);
        verify(0.5, 1);
        verify(2.4, 2);
        verify(-0.4, 0);
        verify(-0.5, 0);   // this is a tricky case; verify via Math.round
        verify(-0.6, -1);
        verify(-5.3, -5);
    }

    // Move this failing test off priority 0 for now
    this.round1.priority = 1;

    this.round2 = function () {

        function verify (x, pivot, exp) {
            expectEqual(Seadragon2.Math.round(x, pivot), exp, "rounding " + x + " about " + pivot);
        };

        verify(7.5, 0, 8);     // remember (this can feel backwards):
        verify(7.5, 0.4, 8);   // 0.5 is the default threshold, meaning
        verify(7.5, 0.5, 8);   // if you're at or above 0.5 of the way,
        verify(7.5, 0.6, 7);   // you round up. so that means 0.4 means
        verify(7.5, 1, 7);     // if you're at or above 0.4 round up.
        verify(3.3, 0, 4);     // likewise, 0 means always round up --
        verify(3.3, 0.2, 4);   // except when you're already at the
        verify(3.3, 0.3, 4);   // lower integer! 1 means always round
        verify(3.3, 0.5, 3);   // down -- again except when you're
        verify(3.3, 1, 3);     // already at the lower integer!
        verify(6, 0, 6);
        verify(6, 1, 6);
        verify(-3.3, 0, -3);   // remember that -3 > -3.3; rounded up.
        verify(-3.3, 0.3, -3);
        verify(-3.3, 0.5, -3); // verify via Math.round(-3.5) === -3.
        verify(-3.3, 0.7, -4);
        verify(-3.3, 1, -4);   // remember that -4 < -3.3; rounded down.
        verify(-6, 0, -6);
        verify(-6, 1, -6);
    }

    // Move this failing test off priority 0 for now
    this.round2.priority = 1;

    /*
    this.round3 = function () {

    function verify (x, pivot, by, exp) {
    expectEqual(Seadragon2.Math.round(x, pivot, by), exp,
    "rounding " + x + " about " + pivot + " by " + by);
    };

    }
    */
}

runner.addSuite(new MathTestSuite());
