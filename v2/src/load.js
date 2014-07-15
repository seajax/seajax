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

// load.js
// Loads Seadragon Ajax source files, automatically accounting for dependency
// order and deriving the path relative to the HTML page.
//
// Usage:
// <script src="load.js?target=map&type=standalone"></script>
//
// Targets (default is image):
// image - All files necessary to create and use Seadragon.Images with DZ XML.
// map - Only the files necessary for mapping applications, e.g. no DZ XML.
//
// Types (default is standalone):
// standalone - Has no external library dependencies.

(function () {
    
    var scripts = document.getElementsByTagName("script");
    var regex = /(.*)load.js[?]?(.*)/i;
    var thisMatch = null;
    var thisPath = null;
    var target = "image";       // default target
    var type = "standalone";    // default type    
    
    // step 1: find the <script> tag for this script, and extract its src.
    for (var i = scripts.length - 1; i >= 0; i--) {
        thisMatch = regex.exec(scripts[i].src);
        if (thisMatch) {
            break;
        }
    }
    
    if (!thisMatch) {
        throw new Error("Error: unable to load Seadragon Ajax; this script not found.");
    }
    
    // step 2: derive this script's path, and parse its params.
    var targetMatch = /[&]?target=(\w+)([&]|$)/.exec(thisMatch[2]);
    var typeMatch = /[&]?type=(\w+)([&]|$)/.exec(thisMatch[2]);
    thisPath = thisMatch[1];
    target = (targetMatch && targetMatch[1]) || target;
    type = (typeMatch && typeMatch[1]) || type;
    
    // step 3: make a _SYNCHRONOUS_ request to the appropriate file order list.
    // yes, synchronous sucks, but necessary here because this is meant to
    // emulate a single, pre-built .js file.
    var xhr =
        window.XMLHttpRequest ? new XMLHttpRequest() :
        window.ActiveXObject ? new ActiveXObject("Msxml2.XMLHTTP") : null;  // simple logic for IE6
    xhr.open("GET", thisPath + "../build/" + target + "/" + type + ".txt", false);
    xhr.send(null);
    
    if (!xhr.responseText) {
        throw new Error("Error: unable to load Seadragon Ajax; file list not found.");
    }
    
    // step 4: finally, include the specified source files via <script> tags
    var filelist = xhr.responseText.replace("\r\n", "\n").split('\n');
    for (var i = 0; i < filelist.length; i++) {
        document.write([
            '<script src="',
            thisPath,
            filelist[i],
            '"></script>'
        ].join(''));
    }

}());