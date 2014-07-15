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

function TileSourceTestSuite() {

    this.name = "TileSource";
    this.tag = "image";

    function assertValidTileSourceProps(ts, expWidth, expHeight, expTileWidth, expTileHeight, expTileOverlap) {
        // basic specified properties only
        expectEqual(ts.width, expWidth, "tileSource.width");
        expectEqual(ts.height, expHeight, "tileSource.height");
        expectEqual(ts.tileWidth, expTileWidth, "tileSource.tileWidth");
        expectEqual(ts.tileHeight, expTileHeight, "tileSource.tileHeight");
        expectEqual(ts.tileOverlap, expTileOverlap, "tileSource.tileOverlap");
        // basic derived properties only
        expectTrue(ts.dimensions instanceof SDSize);
        expectObjectsEqual(ts.dimensions, { width: expWidth, height: expHeight });
        expectTrue(ts.tileSize instanceof SDSize);
        expectObjectsEqual(ts.tileSize, { width: expTileWidth, height: expTileHeight });
    }

    function assertValidTileSourceMinLevel(ts, expMinLevel) {
        expectTrue(ts.minLevel <= ts.maxLevel);
        expectEqual(ts.minLevel, expMinLevel);
    }

    function assertValidTileSourceMaxLevel(ts, expMaxLevel) {
        var maxLevelCeil = Math.pow(2, expMaxLevel),
        maxLevelFloor = Math.pow(2, expMaxLevel - 1);

        expectTrue(ts.maxLevel >= ts.minLevel);
        expectTrue(ts.width <= maxLevelCeil);
        expectTrue(ts.height <= maxLevelCeil);
        expectTrue(ts.width > maxLevelFloor || ts.height > maxLevelFloor);
        expectEqual(ts.maxLevel, expMaxLevel);
    }

    function assertValidTileSourceOverviewLevel(ts, expOverviewLevel) {
        expectTrue(ts.overviewLevel >= ts.minLevel);
        expectTrue(ts.overviewLevel <= ts.maxLevel);
        expectEqual(ts.overviewLevel, expOverviewLevel);
    }

    // TileSource constructor: overloads, and in the case of 3 args, tileSize can be number or object

    this.constructor3a = function () {
        function verify(width, height, tileSizeNum) {
            var ts = new Seadragon2.TileSource(width, height, tileSizeNum);
            assertValidTileSourceProps(ts, width, height, tileSizeNum, tileSizeNum, 0, 0);
        };
        verify(1024, 768, 256);
    }

    this.constructor3b = function () {
        function verify(width, height, tileSizeObj) {
            var ts = new Seadragon2.TileSource(width, height, tileSizeObj);
            assertValidTileSourceProps(ts, width, height, tileSizeObj.width, tileSizeObj.height, 0, 0);
        };
        verify(1024, 768, { width: 256, height: 256 }, 10);
        verify(1024, 768, new Seadragon2.Size(256, 256), 10);
        verify(1024, 768, { width: 256, height: 192 }, 10);
        verify(1024, 768, new Seadragon2.Size(256, 192), 10);
    }

    this.constructor4 = function () {
        function verify(width, height, tileWidth, tileHeight) {
            var ts = new Seadragon2.TileSource(width, height, tileWidth, tileHeight);
            assertValidTileSourceProps(ts, width, height, tileWidth, tileHeight, 0, 0);
        };
        verify(1024, 768, 256, 256, 10);
        verify(1024, 768, 256, 192, 10);
    }

    this.constructor5 = function () {
        function verify(width, height, tileWidth, tileHeight, tileOverlap) {
            var ts = new Seadragon2.TileSource(width, height, tileWidth, tileHeight, tileOverlap);
            assertValidTileSourceProps(ts, width, height, tileWidth, tileHeight, tileOverlap, 0);
        };
        verify(1024, 768, 256, 192, 0, 10);
        verify(1024, 768, 256, 192, 1, 10);
    }

    this.constructor6 = function () {
        function verify(width, height, tileWidth, tileHeight, tileOverlap, minLevel) {
            var ts = new Seadragon2.TileSource(width, height, tileWidth, tileHeight, tileOverlap, minLevel);
            assertValidTileSourceProps(ts, width, height, tileWidth, tileHeight, tileOverlap, minLevel);
            // NOTE: this does NOT test the validity 
        };
        verify(1024, 768, 256, 192, 1, 0, 10);
        verify(1024, 768, 256, 192, 1, 4, 10);
    }

    this.constructor7 = function () {
        function verify(width, height, tileWidth, tileHeight, tileOverlap, minLevel, overviewLevel) {
            var ts = new Seadragon2.TileSource(width, height, tileWidth, tileHeight, tileOverlap, minLevel, overviewLevel);
            assertValidTileSourceProps(ts, width, height, tileWidth, tileHeight, tileOverlap, minLevel);
            // NOTE: this does NOT test the validity of overviewLevel!
        };
        verify(1024, 768, 256, 192, 1, 4, 10, 10);
        verify(1024, 768, 256, 192, 1, 4, 7, 10);
    }

    // TileSource.$ bridge: should work with tileSize number or tileSize object as well

    this.bridge = function () {
        function verify(obj, expWidth, expHeight, expTileWidth, expTileHeight, expTileOverlap, expMinLevel) {
            var ts = Seadragon2.TileSource.$(obj);
            expectTrue(ts instanceof Seadragon2.TileSource);
            assertValidTileSourceProps(ts, expWidth, expHeight, expTileWidth, expTileHeight, expTileOverlap, expMinLevel);
        };
        verify({ width: 768, height: 1024, tileSize: 256 }, 768, 1024, 256, 256, 0, 0, 10, 10);
        verify({ width: 768, height: 1024, tileWidth: 256 }, 768, 1024, 256, 256, 0, 0, 10, 10);
        verify({ width: 768, height: 1024, tileHeight: 256 }, 768, 1024, 256, 256, 0, 0, 10, 10);
        verify({ width: 768, height: 1024, tileSize: { width: 256, height: 256} }, 768, 1024, 256, 256, 0, 0, 10, 10);
        verify({ width: 768, height: 1024, tileSize: new Seadragon2.Size(256, 256) }, 768, 1024, 256, 256, 0, 0, 10, 10);
        verify({ width: 768, height: 1024, tileSize: { width: 192, height: 256} }, 768, 1024, 192, 256, 0, 0, 10, 10);
        verify({ width: 768, height: 1024, tileSize: new Seadragon2.Size(192, 256) }, 768, 1024, 192, 256, 0, 0, 10, 10);
        verify({ width: 768, height: 1024, tileWidth: 192, tileHeight: 256 }, 768, 1024, 192, 256, 0, 0, 10, 10);
        verify({ width: 768, height: 1024, tileWidth: 192, tileHeight: 256, tileOverlap: 1 }, 768, 1024, 192, 256, 1, 0, 10, 10);
        verify({ width: 768, height: 1024, tileWidth: 192, tileHeight: 256, tileOverlap: 1, minLevel: 4 }, 768, 1024, 192, 256, 1, 4, 10, 10);
        verify({ width: 768, height: 1024, tileWidth: 192, tileHeight: 256, tileOverlap: 1, minLevel: 4, maxLevel: 7 }, 768, 1024, 192, 256, 1, 4, 7, 10);
    }

    // TileSource.minLevel: should be zero if unspecified, otherwise clamped to [0, maxLevel]

    this.minLevel3 = function () {
        function verify(width, height, tileSize) {
            var ts = new Seadragon2.TileSource(width, height, tileSize);
            assertValidTileSourceMinLevel(ts, 0);
        }
        verify(1000, 500, 128);
    }

    this.minLevel4 = function () {
        function verify(width, height, tileWidth, tileHeight) {
            var ts = new Seadragon2.TileSource(width, height, tileWidth, tileHeight);
            assertValidTileSourceMinLevel(ts, 0);
        }
        verify(1000, 500, 256, 128);
    }

    this.minLevel5 = function () {
        function verify(width, height, tileWidth, tileHeight, tileOverlap) {
            var ts = new Seadragon2.TileSource(width, height, tileWidth, tileHeight, tileOverlap);
            assertValidTileSourceMinLevel(ts, 0);
        }
        verify(1000, 500, 256, 128, 1);
    }

    this.minLevel6 = function () {
        function verify(width, height, tileWidth, tileHeight, tileOverlap, minLevel, expMinLevel) {
            var ts = new Seadragon2.TileSource(width, height, tileWidth, tileHeight, tileOverlap, minLevel);
            assertValidTileSourceMinLevel(ts, expMinLevel);
        }
        verify(1000, 500, 256, 128, 1, 0, 0);
        verify(1000, 500, 256, 128, 1, 3, 3);
        verify(1000, 500, 256, 128, 1, 10, 10);
        verify(1000, 500, 256, 128, 1, 11, 10);
        verify(500, 1000, 256, 128, 1, -1, 0);
    }

    this.minLevel7 = function () {
        function verify(width, height, tileWidth, tileHeight, tileOverlap, minLevel, overviewLevel, expMinLevel) {
            var ts = new Seadragon2.TileSource(width, height, tileWidth, tileHeight, tileOverlap, minLevel, overviewLevel);
            assertValidTileSourceMinLevel(ts, expMinLevel);
        }
        verify(500, 1000, 256, 128, 1, 11, 8, 10);
    }

    // TileSource.maxLevel: should be automatically calculated based on width and height only

    this.maxLevel3 = function () {
        function verify(width, height, tileSize, expMaxLevel) {
            var ts = new Seadragon2.TileSource(width, height, tileSize);
            assertValidTileSourceMaxLevel(ts, expMaxLevel);
        }
        verify(1400, 1800, 512, 11);
        verify(2400, 1800, 512, 12);
        verify(30000, 1000, 256, 15);
        verify(1000, 30000, 256, 15);
    }

    this.maxLevel4 = function () {
        function verify(width, height, tileWidth, tileHeight, expMaxLevel) {
            var ts = new Seadragon2.TileSource(width, height, tileWidth, tileHeight);
            assertValidTileSourceMaxLevel(ts, expMaxLevel);
        }
        verify(1400, 1800, 256, 512, 11);
        verify(2400, 1800, 256, 512, 12);
    }

    this.maxLevel5 = function () {
        function verify(width, height, tileWidth, tileHeight, tileOverlap, expMaxLevel) {
            var ts = new Seadragon2.TileSource(width, height, tileWidth, tileHeight, tileOverlap);
            assertValidTileSourceMaxLevel(ts, expMaxLevel);
        }
        verify(1400, 1800, 512, 256, 1, 11);
    }

    this.maxLevel6 = function () {
        function verify(width, height, tileWidth, tileHeight, tileOverlap, minLevel, expMaxLevel) {
            var ts = new Seadragon2.TileSource(width, height, tileWidth, tileHeight, tileOverlap, minLevel);
            assertValidTileSourceMaxLevel(ts, expMaxLevel);
        }
        verify(2400, 1800, 512, 256, 1, 13, 12);
    }

    this.maxLevel7 = function () {
        function verify(width, height, tileWidth, tileHeight, tileOverlap, minLevel, overviewLevel, expMaxLevel) {
            var ts = new Seadragon2.TileSource(width, height, tileWidth, tileHeight, tileOverlap, minLevel, overviewLevel);
            assertValidTileSourceMaxLevel(ts, expMaxLevel);
        }
        verify(1400, 1800, 256, 256, 1, 6, 8, 11);
    }

    // TileSource.overviewLevel: should be automatically calculated based on width, height and
    // tileSize if not specified, but either way, should be clamped to [minLevel, maxLevel].

    this.overviewLevel3 = function () {
        function verify(width, height, tileSize, expOverviewLevel) {
            var ts = new Seadragon2.TileSource(width, height, tileSize);
            assertValidTileSourceOverviewLevel(ts, expOverviewLevel);
        }
        verify(1200, 800, 256, 8);
        verify(768, 1024, 256, 8);
        verify(1200, 800, 128, 7);
        verify(800, 1200, 512, 9);
        verify(800, 1200, 512, 9);
    }

    this.overviewLevel4 = function () {
        function verify(width, height, tileWidth, tileHeight, expOverviewLevel) {
            var ts = new Seadragon2.TileSource(width, height, tileWidth, tileHeight);
            assertValidTileSourceOverviewLevel(ts, expOverviewLevel);
        }
        verify(1200, 800, 512, 256, 9);
        verify(800, 1200, 512, 256, 8);  // both tile sizes matter!
        verify(1200, 800, 512, 256, 9);
    }

    // move this failing test off priority 0 for now
    this.overviewLevel4.priority = 1;

    this.overviewLevel5 = function () {
        function verify(width, height, tileWidth, tileHeight, tileOverlap, expOverviewLevel) {
            var ts = new Seadragon2.TileSource(width, height, tileWidth, tileHeight, tileOverlap);
            assertValidTileSourceOverviewLevel(ts, expOverviewLevel);
        }
        verify(800, 1200, 512, 256, 10, 8);  // tile overlap shouldn't
    }

    // move this failing test off priority 0 for now
    this.overviewLevel5.priority = 1;

    this.overviewLevel6 = function () {
        function verify(width, height, tileWidth, tileHeight, tileOverlap, minLevel, expOverviewLevel) {
            var ts = new Seadragon2.TileSource(width, height, tileWidth, tileHeight, tileOverlap, minLevel);
            assertValidTileSourceOverviewLevel(ts, expOverviewLevel);
        }
        verify(1200, 800, 256, 512, 1, 3, 8);
        verify(1200, 800, 256, 512, 1, 9, 9);    // clamped to minLevel
    }

    this.overviewLevel7 = function () {
        function verify(width, height, tileWidth, tileHeight, tileOverlap, minLevel, overviewLevel, expOverviewLevel) {
            var ts = new Seadragon2.TileSource(width, height, tileWidth, tileHeight, tileOverlap, minLevel, overviewLevel);
            assertValidTileSourceOverviewLevel(ts, expOverviewLevel);
        }
        verify(1200, 800, 256, 512, 1, 3, 7, 7); // respect passed in value
        verify(1200, 800, 256, 512, 1, 3, 2, 3); // but still clamp to minLevel
        verify(1200, 800, 256, 512, 1, 0, -1, 0);
        verify(1200, 800, 256, 512, 1, 3, 15, 11); // and also clamp to maxLevel
    }
}

runner.addSuite(new TileSourceTestSuite());
