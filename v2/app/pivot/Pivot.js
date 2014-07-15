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

// the Pivot namespace.
/**
 * The global Pivot namespace. It includes all functionality for creating
 * Pivot Ajax controls.
 * @module Pivot
 * @requires Seadragon2
 */

/**
 * The global Pivot object.
 * @class Pivot
 * @namespace window
 * @static
 */
var Pivot = window.Pivot = {},

    // for using JS objects as dictionaries, we have to
    // be robust against somebody trying to use the key
    // "hasOwnProperty", which involves frequent calls
    // to Object.prototype.hasOwnProperty. We'll make an alias here
    // to help performance.
    hasOwnProperty = ({}.hasOwnProperty),
    
    // a convenience function for a very common action:
    // make the specified element, give it a class name, and append
    // it to the specified parent.
    makeElement = function (tag, className, parent) {
        var elmt = document.createElement(tag);
        if (className) {
            elmt.className = className;
        }
        if (parent) {
            parent.appendChild(elmt);
        }
        return elmt;
    },
    
    // Another common task is adding text to an HTML node.
    addText = function (elmt, text) {
        elmt.appendChild(document.createTextNode(text));
    };