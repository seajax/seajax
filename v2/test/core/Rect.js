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

function RectTestSuite() {

    this.name = "Rect";
    this.tag = "core";

    var rectEmpty = { x: 0, y: 0, width: 0, height: 0 };

    // using a graphics coordinate system (TL is negative, BR is positive):

    var pointO = new Seadragon2.Point(0, 0);
    var pointTL = new Seadragon2.Point(-10, -10);
    var pointTR = new Seadragon2.Point(10, -10);
    var pointBL = new Seadragon2.Point(-10, 10);
    var pointBR = new Seadragon2.Point(10, 10);
    var pointQuadTL = new Seadragon2.Point(-5, -5);
    var pointQuadTR = new Seadragon2.Point(5, -5);
    var pointQuadBL = new Seadragon2.Point(-5, 5);
    var pointQuadBR = new Seadragon2.Point(5, 5);

    var rectAll = new Seadragon2.Rect(-10, -10, 20, 20);
    var rectMid = new Seadragon2.Rect(-5, -5, 10, 10);
    var rectQuadTL = new Seadragon2.Rect(-10, -10, 10, 10);
    var rectQuadTR = new Seadragon2.Rect(0, -10, 10, 10);
    var rectQuadBL = new Seadragon2.Rect(-10, 0, 10, 10);
    var rectQuadBR = new Seadragon2.Rect(0, 0, 10, 10);

    this.constructor0 = function () {
        var r = new Seadragon2.Rect();
        expectObjectsEqual(r, rectEmpty);
    }

    this.constructor2 = function () {

        function verify (point, size, exp) {
            var r = new Seadragon2.Rect(point, size);
            expectObjectsEqual(r, exp);
        };

        verify({ x: 0, y: 0 }, { width: 0, height: 0 }, rectEmpty);
        verify(new Seadragon2.Point(), { width: 0, height: 0 }, rectEmpty);
        verify({ x: 0, y: 0 }, new Seadragon2.Size(), rectEmpty);
        verify(new Seadragon2.Point(), new Seadragon2.Size(), rectEmpty);
        verify({ x: -11, y: -12 }, { width: 22, height: 24 }, { x: -11, y: -12, width: 22, height: 24 });
        verify(new Seadragon2.Point(-11, -12), new Seadragon2.Size(22, 24), { x: -11, y: -12, width: 22, height: 24 });
    }

    this.constructor4 = function () {

        function verify (x, y, width, height, exp) {
            var r = new Seadragon2.Rect(x, y, width, height);
            expectObjectsEqual(r, exp);
        };

        verify(0, 0, 0, 0, rectEmpty);
        verify(-11, -12, 0, 0, { x: -11, y: -12, width: 0, height: 0 });
        verify(-11, -12, 22, 24, { x: -11, y: -12, width: 22, height: 24 });
    }

    this.bridge = function () {

        function verify (obj) {
            var r = Seadragon2.Rect.$(obj);
            expectTrue(r instanceof Seadragon2.Rect);
            expectObjectsEqual(r, obj);
        };

        verify(rectEmpty, rectEmpty);
        verify({ x: 0, y: 0 }, rectEmpty);
        verify({ width: 0, height: 0 }, rectEmpty);
        verify(new Seadragon2.Point(), rectEmpty);
        verify(new Seadragon2.Size(), rectEmpty);
        verify({ x: 1, y: 2 }, { x: 1, y: 2, width: 0, height: 0 });
        verify({ width: 3, height: 4 }, { x: 0, y: 0, width: 3, height: 4 });
        verify({ x: 1, y: 2, width: 3, height: 4 }, { x: 1, y: 2, width: 3, height: 4 });
        verify(new Seadragon2.Rect(1, 2, 3, 4), { x: 1, y: 2, width: 3, height: 4 });
    }

    this.contains = function () {

        function verify (rect, other) {
            expectTrue(rect.contains(other), rect + " should contain " + other);
        };

        // Testing rectAll contains all points...
        verify(rectAll, pointO);
        verify(rectAll, pointTL);
        verify(rectAll, pointTR);
        verify(rectAll, pointBL);
        verify(rectAll, pointBR);
        verify(rectAll, pointQuadTL);
        verify(rectAll, pointQuadTR);
        verify(rectAll, pointQuadBL);
        verify(rectAll, pointQuadBR);

        // Testing rectAll contains all rects, including itself...
        verify(rectAll, rectAll);
        verify(rectAll, rectMid);
        verify(rectAll, rectQuadTL);
        verify(rectAll, rectQuadTR);
        verify(rectAll, rectQuadBL);
        verify(rectAll, rectQuadBR);

        // Testing rects contain their edge and mid points...
        verify(rectMid, pointO);
        verify(rectMid, pointQuadBL);
        verify(rectQuadTL, pointO);
        verify(rectQuadTL, pointQuadTL);
        verify(rectQuadTR, pointTR);
        verify(rectQuadTR, pointQuadTR);
        verify(rectQuadBL, pointBL);
        verify(rectQuadBR, pointQuadBR);
    }

    this.containsNot = function () {

        function verify (rect, other) {
            expectFalse(rect.contains(other), rect + " should not contain " + other);
        };

        // Testing rects don't contain outside points...
        verify(rectMid, pointTR);
        verify(rectMid, pointBL);
        verify(rectQuadTL, pointBR);
        verify(rectQuadTR, pointQuadTL);
        verify(rectQuadBL, pointTR);
        verify(rectQuadBR, pointQuadBL);

        // Testing quad and mid rects don't contain each other...
        verify(rectMid, rectQuadBL);
        verify(rectQuadTL, rectQuadBR);
        verify(rectQuadTR, rectQuadTL);
    }

    this.union = function () {

        function verify (rect, other, newRect) {
            expectObjectsEqual(rect.union(other), newRect);
        };

        // Testing rectAll union anything is rectAll...
        verify(rectAll, pointO, rectAll);
        verify(rectAll, pointTL, rectAll);
        verify(rectAll, pointQuadBL, rectAll);
        verify(rectAll, rectAll, rectAll);
        verify(rectAll, rectMid, rectAll);
        verify(rectQuadBR, rectAll, rectAll);

        // Testing rect union miscellaneous cases...
        verify(rectQuadTL, rectQuadBR, rectAll);
        verify(rectQuadBL, rectQuadTR, rectAll);
        verify(rectQuadTL, rectQuadTR, { x: -10, y: -10, width: 20, height: 10 });
        verify(rectQuadTL, rectQuadBL, { x: -10, y: -10, width: 10, height: 20 });
        verify(rectQuadBR, rectQuadBL, { x: -10, y: 0, width: 20, height: 10 });
        verify(rectQuadBR, rectQuadTR, { x: 0, y: -10, width: 10, height: 20 });
        verify(rectMid, rectQuadTR, { x: -5, y: -10, width: 15, height: 15 });
        verify(rectQuadBL, rectMid, { x: -10, y: -5, width: 15, height: 15 });
    }

    this.intersect = function () {

        function verify (rect, other, newRect) {
            expectObjectsEqual(rect.intersect(other), newRect);
        };

        // Testing rectAll intersect anything is the anything...
        verify(rectAll, pointO, pointO);
        verify(rectAll, pointTL, pointTL);
        verify(rectAll, pointQuadBL, pointQuadBL);
        verify(rectAll, rectAll, rectAll);
        verify(rectMid, rectAll, rectMid);
        verify(rectAll, rectQuadBR, rectQuadBR);

        // Testing rect intersection empty and miscellaneous cases...
        verify(rectQuadTL, pointBR, null);
        verify(rectQuadBL, pointQuadTR, null);
        verify(rectQuadTL, rectQuadBR, pointO);
        verify(rectQuadBL, rectQuadTR, pointO);
        verify(rectQuadBR, rectQuadTR, { x: 0, y: 0, width: 10, height: 0 });
        verify(rectQuadTR, rectQuadTL, { x: 0, y: -10, width: 0, height: 10 });
        verify(rectMid, rectQuadTR, { x: 0, y: -5, width: 5, height: 5 });
        verify(rectQuadBL, rectMid, { x: -5, y: 0, width: 5, height: 5 });
        verify(rectMid, rectQuadBR, { x: 0, y: 0, width: 5, height: 5 });
        verify(rectQuadTL, rectMid, { x: -5, y: -5, width: 5, height: 5 });
    }

    this.scale1 = function () {

        function verify (rect, factor, newRect) {
            expectObjectsEqual(rect.scale(factor), newRect);
        };

        verify(rectMid, 1, rectMid);
        verify(rectQuadBL, 1, rectQuadBL);
        verify(rectQuadTL, 2, rectAll);
        verify(rectAll, 0.5, rectQuadTL);
        verify(rectMid, 1.5, rectMid.union(rectQuadBR));
        verify(rectMid.union(rectQuadBR), 2 / 3, rectMid);
    }

    this.scale2 = function () {

        function verify (rect, factor, point, newRect) {
            expectObjectsEqual(rect.scale(factor, point), newRect);
        };

        verify(rectMid, 2, pointO, rectAll);
        verify(rectAll, 0.5, pointO, rectMid);
        verify(rectQuadBR, 2, pointBR, rectAll);
        verify(rectAll, 0.5, pointBR, rectQuadBR);
        verify(rectMid, 1.5, pointQuadBL, rectQuadTR.union(rectMid));
        verify(rectQuadTR.union(rectMid), 2 / 3, pointQuadBL, rectMid);
    }

    this.translate = function () {

        function verify (rect, point, newRect) {
            expectObjectsEqual(rect.translate(point), newRect);
        };

        verify(rectAll, {}, rectAll);
        verify(rectMid, { x: 0, y: 0 }, rectMid);
        verify(rectQuadTL, { x: 10 }, rectQuadTR);
        verify(rectQuadTR, { x: -10 }, rectQuadTL);
        verify(rectQuadTL, { y: 10 }, rectQuadBL);
        verify(rectQuadBL, { y: -10 }, rectQuadTL);
        verify(rectQuadBL, { x: 10, y: -10 }, rectQuadTR);
        verify(rectQuadTR, { x: -10, y: 10 }, rectQuadBL);
        verify(rectMid, { x: 5, y: 5 }, rectQuadBR);
        verify(rectQuadBR, { x: -5, y: -5 }, rectMid);
    }
}

runner.addSuite(new RectTestSuite());
