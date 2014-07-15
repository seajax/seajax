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

function DziTileSourceTestSuite() {

    this.name = "DziTileSource";
    this.tag = "image";

    function assertValidDziTileSourceProps(dziTS, expWidth, expHeight, expTileSize, expTilesUrl,
    expImageFormat, expDisplayRects, expIsSparse, expMaxLevel, expOverviewLevel) {

        // specified properties
        expectEqual(dziTS.width, expWidth);
        expectEqual(dziTS.height, expHeight);
        expectEqual(dziTS.tileWidth, expTileSize);
        expectEqual(dziTS.tileHeight, expTileSize);
        expectEqual(dziTS.tilesUrl, expTilesUrl);
        expectEqual(dziTS.imageFormat, expImageFormat);
        expectEqual(dziTS.displayRects, expDisplayRects);

        // derived properties
        expectTrue(dziTS.dimensions instanceof SDSize);
        expectObjectsEqual(dziTS.dimensions, { width: expWidth, height: expHeight });
        expectTrue(dziTS.tileSize instanceof SDSize);  // note not a number!
        expectObjectsEqual(dziTS.tileSize, { width: expTileSize, height: expTileSize });
        expectEqual(dziTS.minLevel, 0);
        expectEqual(dziTS.maxLevel, expMaxLevel);
        expectEqual(dziTS.overviewLevel, expOverviewLevel);
        expectEqual(dziTS.isSparse, expIsSparse);
    }

    this.constructor6 = function () {
        function verify(width, height, tileSize, tileOverlap, tilesUrl, imageFormat, expMaxLevel, expOverviewLevel) {
            var dziTS = new Seadragon2.DziTileSource(width, height, tileSize, tileOverlap, tilesUrl, imageFormat);
            expectTrue(dziTS instanceof Seadragon2.TileSource);
            assertValidDziTileSourceProps(dziTS, width, height, tileSize, tilesUrl, imageFormat, null, false, expMaxLevel, expOverviewLevel);
        }
        verify(1200, 800, 512, 1, "foo_files/", "jpg", 11, 9);
        verify(900, 2300, 256, 1, "bar_files/", "png", 12, 8);
    }

    this.constructor7 = function () {
        function verify(width, height, tileSize, tileOverlap, tilesUrl, imageFormat, displayRects, expIsSparse, expMaxLevel, expOverviewLevel) {
            var dziTS = new Seadragon2.DziTileSource(width, height, tileSize, tileOverlap, tilesUrl, imageFormat, displayRects);
            expectTrue(dziTS instanceof Seadragon2.TileSource);
            assertValidDziTileSourceProps(dziTS, width, height, tileSize, tilesUrl, imageFormat, displayRects, expIsSparse, expMaxLevel, expOverviewLevel);
        }
        verify(1200, 800, 512, 1, "foo_files/", "jpg", null, false, 11, 9);
        verify(900, 2300, 256, 1, "bar_files/", "png", null, false, 12, 8);
        verify(900, 2300, 256, 1, "bar_files/", "png", [], false, 12, 8);
        verify(900, 2300, 256, 1, "bar_files/", "png", [{ x: 0, y: 0, width: 900, height: 2300, minLevel: 0, maxLevel: 12}], false, 12, 8);
        verify(900, 2300, 256, 1, "bar_files/", "png", [{ x: 0, y: 0, width: 900, height: 2300, minLevel: 0, maxLevel: 12 }, { x: 0, y: 0, width: 450, height: 1150, minLevel: 0, maxLevel: 11}], true, 12, 8);
    }

    this.bridge = function () {
        function verify(obj, expTileSize, expIsSparse, expMaxLevel, expOverviewLevel) {
            var dziTS = Seadragon2.DziTileSource.$(obj);
            expectTrue(dziTS instanceof Seadragon2.DziTileSource);
            assertValidDziTileSourceProps(dziTS, obj.width, obj.height, expTileSize, obj.tilesUrl, obj.imageFormat, obj.displayRects, expIsSparse, expMaxLevel, expOverviewLevel);
        }
        verify({ width: 5700, height: 3600, tileSize: 256, tileOverlap: 1, tilesUrl: "foo_files/", imageFormat: "jpg" }, 256, false, 13, 8);      // just tileSize=number
        verify({ width: 5700, height: 3600, tileWidth: 256, tileOverlap: 1, tilesUrl: "foo_files/", imageFormat: "jpg" }, 256, false, 13, 8);     // just tileWidth
        verify({ width: 5700, height: 3600, tileHeight: 256, tileOverlap: 1, tilesUrl: "foo_files/", imageFormat: "jpg" }, 256, false, 13, 8);    // just tileHeight
        verify({ width: 5700, height: 3600, tileWidth: 128, tileHeight: 256, tileOverlap: 1, tilesUrl: "foo_files/", imageFormat: "jpg" }, 128, false, 13, 7);    // tileWidth and tileHeight
        verify({ width: 5700, height: 3600, tileSize: 512, tileWidth: 256, tileOverlap: 1, tilesUrl: "foo_files/", imageFormat: "jpg" }, 512, false, 13, 9);      // tileSize=number and tileWidth
        verify({ width: 5700, height: 3600, tileHeight: 256, tileSize: 512, tileOverlap: 1, tilesUrl: "foo_files/", imageFormat: "jpg" }, 512, false, 13, 9);     // tileSize=number and tileHeight
        verify({ width: 5700, height: 3600, tileSize: { width: 128, height: 128 }, tileOverlap: 1, tilesUrl: "foo_files/", imageFormat: "jpg" }, 128, false, 13, 7);  // just tileSize=obj, square
        verify({ width: 5700, height: 3600, tileSize: { width: 128, height: 256 }, tileOverlap: 1, tilesUrl: "foo_files/", imageFormat: "jpg" }, 128, false, 13, 7);  // just tileSize=obj, non-square
        verify({ width: 5700, height: 3600, tileSize: { width: 128, height: 256 }, tileWidth: 512, tileOverlap: 1, tilesUrl: "foo_files/", imageFormat: "jpg" }, 128, false, 13, 7);  // tileSize=obj, non-square, and tileWidth
        verify({ width: 5700, height: 3600, tileSize: new SDSize(512, 512), tileOverlap: 1, tilesUrl: "foo_files/", imageFormat: "jpg" }, 512, false, 13, 9); // just tileSize=Size, square
        verify({ width: 5700, height: 3600, tileSize: new SDSize(512, 256), tileOverlap: 1, tilesUrl: "foo_files/", imageFormat: "jpg" }, 512, false, 13, 9); // just tileSize=size, non-square
        verify({ width: 5700, height: 3600, tileSize: new SDSize(512, 256), tileHeight: 128, tileOverlap: 1, tilesUrl: "foo_files/", imageFormat: "jpg" }, 512, false, 13, 9);    // tileSize=Size, non-square and tileWidth
        verify({ width: 7300, height: 9800, tileSize: 128, tileOverlap: 1, tilesUrl: "bar_files/", imageFormat: "png", displayRects: null }, 128, false, 14, 7);
        verify({ width: 7300, height: 9800, tileSize: 128, tileOverlap: 1, tilesUrl: "bar_files/", imageFormat: "png", displayRects: [] }, 128, false, 14, 7);
        verify({ width: 7300, height: 9800, tileSize: 128, tileOverlap: 1, tilesUrl: "bar_files/", imageFormat: "png", displayRects: [{ x: 0, y: 0, width: 7300, height: 9800, minLevel: 0, maxLevel: 14}] }, 128, false, 14, 7);
        verify({ width: 7300, height: 9800, tileSize: 128, tileOverlap: 1, tilesUrl: "bar_files/", imageFormat: "png", displayRects: [{ x: 300, y: 800, width: 7000, height: 9000, minLevel: 0, maxLevel: 14 }, { x: 0, y: 0, width: 300, height: 800, minLevel: 0, maxLevel: 10}] }, 128, true, 14, 7);
    }
}

runner.addSuite(new DziTileSourceTestSuite());
