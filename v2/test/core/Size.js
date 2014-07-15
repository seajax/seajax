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

function SizeTestSuite() {

    this.name = "Size";
    this.tag = "core";

    this.constructor0 = function () {
        var i, sd, s, sizeData = [
            { width: 0, height: 0 },
            { width: 0, height: 1 },
            { width: 1, height: 0 },
            { width: 1, height: 1 },
            { width: 1, height: 3 },
            { width: -3, height: 1 },
            { width: 2.5, height: -17 },
            { width: 99999, height: -821.2912 },
        ];
        for (i in sizeData) {
            sd = sizeData[i];
            s = new Seadragon2.Size(sd.width, sd.height);
            expectEqual(s.width, sd.width);
            expectEqual(s.height, sd.height);
        }
    }

    this.bridge0 = function () {
        var s = Seadragon2.Size.$();
        expectTrue(s instanceof Seadragon2.Size);
        expectObjectsEqual(s, { width: 0, height: 0 });
    }

    this.bridge1 = function () {
        var sd, s, sizeData = [
            { width: 0, height: 0 },
            { width: 2, height: -3 }
        ];
        for (i in sizeData) {
            sd = sizeData[i];
            s = Seadragon2.Size.$(sd);
            expectTrue(s instanceof Seadragon2.Size);
            expectObjectsEqual(s, sd);
        }

        sd = new Seadragon2.Size(-4, 5);
        s = Seadragon2.Size.$(sd);
        expectTrue(s instanceof Seadragon2.Size);
        expectObjectsEqual(s, sd);
    }
}

runner.addSuite(new SizeTestSuite());
