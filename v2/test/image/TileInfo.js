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

function TileInfoTestSuite() {

    this.name = "TileInfo";
    this.tag = "image";

    var rectInstance = new Seadragon2.Rect(1, 2, 3, 4);
    var rectLiteral = { x: 1, y: 2, width: 3, height: 4 };

    this.constructor0 = function () {

        function verify(url, crop) {
            var tile;
            if (arguments.length == 1) {
                tile = new Seadragon2.TileInfo(url);
            } else {
                tile = new Seadragon2.TileInfo(url, crop);
            }

            expectEqual(tile.url, url);
            expectObjectsEqual(tile.crop, crop);
        };

        verify("a.jpg");
        verify("b.jpg", null);
        verify("c.jpg", rectLiteral);
        verify("d.jpg", rectInstance);
    }

    this.bridge = function () {

        function verify(obj, expUrl, expCrop) {
            var tile = Seadragon2.TileInfo.$(obj);
            expectEqual(tile.url, expUrl);
            expectObjectsEqual(tile.crop, expCrop);
        };

        verify("a.jpg", "a.jpg", null);
        verify({ url: "b.jpg", crop: null }, "b.jpg", null);
        verify({ url: "c.jpg", crop: rectLiteral }, "c.jpg", rectInstance);
        verify({ url: "d.jpg", crop: rectInstance }, "d.jpg", rectInstance);
        verify(new Seadragon2.TileInfo("e.jpg"), "e.jpg", null);
        verify(new Seadragon2.TileInfo("f.jpg", null), "f.jpg", null);
        verify(new Seadragon2.TileInfo("g.jpg", rectLiteral), "g.jpg", rectInstance);
        verify(new Seadragon2.TileInfo("h.jpg", rectInstance), "h.jpg", rectInstance);
    }
}

runner.addSuite(new TileInfoTestSuite());
