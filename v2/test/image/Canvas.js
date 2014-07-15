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

function CanvasTestSuite() {

    this.name = "Canvas";
    this.tag = "image";

    function canvasPrototypeToString() {
        return "canvas of size " + this.width + "x" + this.height;
    }

    // test that a property added to the canvas prototype shows up in the next
    // canvas instance created -- and it's the same property.
    this.prototypeProp = function () {
        var name = "expando" + (Math.floor(Math.random() * 10000));
        Seadragon2.Canvas.prototype[name] = {};

        var canvas = new Seadragon2.Canvas();
        expectTypeof(canvas[name], "object");
        expectEqual(canvas[name], Seadragon2.Canvas.prototype[name]);
    }

    // test that a method added to the canvas prototype shows up in the next canvas
    // instance created -- and it's the same method.
    this.prototypeMethod = function () {
        var name = "toString" + (Math.floor(Math.random() * 10000));
        Seadragon2.Canvas.prototype[name] = canvasPrototypeToString;

        var canvas = new Seadragon2.Canvas();
        expectTypeof(canvas[name], "function");
        expectEqual(canvas[name], canvasPrototypeToString);
        expectEqual(canvas[name](), canvasPrototypeToString.call(canvas));
    }
}

runner.addSuite(new CanvasTestSuite());
