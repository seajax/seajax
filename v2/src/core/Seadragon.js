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

// Seadragon2.js
// Defines the Seadragon namespace.

/*global Seadragon: true */
/*jshint strict: false */

/**
 *  The global Seadragon namespace. All Seadragon objects are defined within
 *  this namespace, and this is the only global variable created by Seadragon2.
 *  @module Seadragon2
 */

/**
 *  @class Seadragon2
 *  @private
 *  @static
 */
if (typeof Seadragon2 === "undefined") {
    window.Seadragon2 = {};
}

var SD = Seadragon2, // local reference for the global Seadragon object

    /**
     *  The version string of the currently loaded Seadragon Ajax library.
     *  This takes the form "{major}.{minor}.{bugfix}", e.g. "2.0.3".
     *  @property VERSION
     *  @final
     *  @type string
     */
    SD_VERSION = SD.VERSION = "2.0.pre";  // TODO set dynamically during build

// no documentation necessary, I don't think. this is meant only for cases
// where someone alerts or logs the Seadragon object during debugging.
SD.toString = function () {
    return "Seadragon Ajax v" + SD_VERSION +
        "\nCopyright (c) Microsoft Corp.";
};
