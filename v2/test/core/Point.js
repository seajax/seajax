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

function PointTestSuite() {

    this.name = "Point";
    this.tag = "core";

    this.constructor0 = function () {
        var pd, p, pointData = [
            { x: 0, y: 0 },
            { x: 0, y: 1 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 1, y: 3 },
            { x: -3, y: 1 },
            { x: 2.5, y: -17 },
            { x: 99999, y: -821.2912 }
        ];
        for (i in pointData) {
            pd = pointData[i];
            p = new Seadragon2.Point(pd.x, pd.y);
            expectEqual(p.x, pd.x);
            expectEqual(p.y, pd.y);
        }
    }

    this.bridge0 = function () {
        var p = Seadragon2.Point.$();
        expectTrue(p instanceof Seadragon2.Point);
        expectObjectsEqual(p, { x: 0, y: 0 });
    }

    this.bridge1 = function () {
        var pd, p, pointData = [
            { x: 0, y: 0 },
            { x: 2, y: -3 }
        ];
        for (i in pointData) {
            pd = pointData[i];
            p = Seadragon2.Point.$(pd);
            expectTrue(p instanceof Seadragon2.Point);
            expectObjectsEqual(p, pd);
        }

        pd = new Seadragon2.Point(-4, 5);
        p = Seadragon2.Point.$(pd);
        expectTrue(p instanceof Seadragon2.Point);
        expectObjectsEqual(p, pd);
    }

    this.distanceTo = function (p1, p2, exp) {
        var testData = [
            { p1: { x: 0, y: 0 }, p2: { x: 3, y: 4 }, d: 5 },
            { p1: { x: 4, y: 3 }, p2: { x: 0, y: 0 }, d: 5 },
            { p1: { x: 0, y: 0 }, p2: { x: -3, y: -4 }, d: 5 },
            { p1: { x: -1, y: 1 }, p2: { x: 0, y: 0 }, d: Math.SQRT2 },
            { p1: { x: 11, y: -7 }, p2: { x: 10, y: -8 }, d: Math.SQRT2 },
            { p1: { x: -11, y: 7 }, p2: { x: -10.5, y: 7.5 }, d: Math.SQRT1_2 }
        ];
        for (i in testData) {
            var td = testData[i];
            var p1 = Seadragon2.Point.$(td.p1);
            var p2 = Seadragon2.Point.$(td.p2);
            var d1 = p1.distanceTo(p2);
            var d2 = p2.distanceTo(p1);
            expectEqual(d1, td.d);
            expectEqual(d2, td.d);
        }
    }
}

runner.addSuite(new PointTestSuite());
