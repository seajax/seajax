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

function DisplayRectTestSuite() {

    this.name = "DisplayRect";
    this.tag = "image";

    this.constructor0 = function () {

        function verify(x, y, width, height, minLevel, maxLevel) {
            var dr = new Seadragon2.DisplayRect(x, y, width, height, minLevel, maxLevel);
            expectTrue(dr instanceof Seadragon2.Rect);
            expectEqual(dr.x, x);
            expectEqual(dr.y, y);
            expectEqual(dr.width, width);
            expectEqual(dr.height, height);
            expectEqual(dr.minLevel, minLevel);
            expectEqual(dr.maxLevel, maxLevel);
        };

        verify(0, 0, 1024, 768, 0, 10);
        verify(512, 384, 512, 384, 1, 11);
        verify(768, 576, 256, 192, 2, 12);
    }

    this.bridge = function () {

        function verify(obj) {
            var dr = Seadragon2.DisplayRect.$(obj);
            expectTrue(dr instanceof Seadragon2.DisplayRect);
            expectObjectsEqual(dr, obj);
        };

        verify({ x: 896, y: 672, width: 128, height: 96, minLevel: 3, maxLevel: 13 });
        verify(new Seadragon2.DisplayRect(960, 720, 64, 48, 4, 14));
    }
}

runner.addSuite(new DisplayRectTestSuite());
