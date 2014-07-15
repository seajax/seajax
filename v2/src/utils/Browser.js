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

// Browser.js
// Defines the Seadragon2.Browser class.

/*global SD */
/*jslint strict: false, regexp: false */

/**
 *  
 *  @class Browser
 *  @namespace Seadragon2
 *  @static
 *  @private
 */
var SDBrowser = SD.Browser = {},

    // most common rendering engines
    SDBrowser_TRIDENT = SDBrowser.TRIDENT = "Trident",
    SDBrowser_GECKO = SDBrowser.GECKO = "Gecko",
    SDBrowser_WEBKIT = SDBrowser.WEBKIT = "Webkit",
    SDBrowser_PRESTO = SDBrowser.PRESTO = "Presto",

    // most common browsers
    SDBrowser_IE = SDBrowser.IE = "IE",
    SDBrowser_FF = SDBrowser.FIREFOX = "Firefox",
    SDBrowser_SAFARI = SDBrowser.SAFARI = "Safari",
    SDBrowser_CHROME = SDBrowser.CHROME = "Chrome",
    SDBrowser_OPERA = SDBrowser.OPERA = "Opera",
    
    // convenience properties (they won't necessarily exist on the SDBrowser
    // object, but declaring them as local vars here for internal use):
    SDBrowser_isIE,
    SDBrowser_isFF,
    SDBrowser_isSafari,
    SDBrowser_isChrome,
    SDBrowser_isGecko,
    SDBrowser_isWebkit,
    SDBrowser_isOpera;

// this is a self-contained function so it can be unit-tested...
/**
 *  @method parseUserAgent
 *  @static
 *  @private
 *  @param {string} ua The user-agent string to parse.
 *  @return {Object} An object literal containing name, version, engine and
 *  engineVersion properties.
 */
function SDBrowser_parseUserAgent(ua) {
    var name = null,
        version = null,
        engine = null,
        engineVersion = null,
        ieMatch = /MSIE ([^\s;)]+)/.exec(ua),
        ffMatch = /Firefox\/(\S+)/.exec(ua),
        safariMatch = /Safari\/(\S+)/.exec(ua),
        chromeMatch = /Chrome\/(\S+)/.exec(ua),
        versionMatch = /Version\/(\S+)/.exec(ua),
        tridentMatch = /; Trident\/([^\s;)]+)/.exec(ua),
        geckoMatch = /rv\:([^\s)]+)\) Gecko\//.exec(ua),
        webkitMatch = /WebKit\/(\S+)/.exec(ua);

    if (ieMatch) {
        name = SDBrowser_IE;
        version = ieMatch[1];
        engine = SDBrowser_TRIDENT;

        // all IEs are Trident, but IE7- didn't say so (or the version)
        if (tridentMatch) {
            engineVersion = tridentMatch[1];
        }
    } else if (geckoMatch) {
        engine = SDBrowser_GECKO;
        engineVersion = geckoMatch[1];

        if (ffMatch) {
            name = SDBrowser_FF;
            version = ffMatch[1];
        }
    } else if (webkitMatch) {
        engine = SDBrowser_WEBKIT;
        engineVersion = webkitMatch[1];

        // order here matters; Chrome claims to be Safari
        if (chromeMatch) {
            name = SDBrowser_CHROME;
            version = chromeMatch[1];
        } else if (safariMatch && versionMatch) {
            name = SDBrowser_SAFARI;
            version = versionMatch[1];      // not safariMatch[1]
            engineVersion = safariMatch[1]; // tends to be more detailed
        }
    }

    return {
        name: name,
        version: version,
        engine: engine,
        engineVersion: engineVersion
    };
}

// ...so we'll call the function and copy its values here.
(function () {
    var props = SDBrowser_parseUserAgent(navigator.userAgent),
        name = props.name,
        version = props.version,
        versionInt = parseInt(version),
        versionFloat = parseFloat(version),
        engine = props.engine,
        engineVersion = props.engineVersion,
        engineVersionFloat = parseFloat(engineVersion);
    
    SDBrowser.name = name;
    SDBrowser.version = version;
    SDBrowser.engine = engine;
    SDBrowser.engineVersion = engineVersion;

    if (props.name === SDBrowser_IE) {
        
        SDBrowser_isIE = versionInt;
        
    } else if (props.name === SDBrowser_FF) {
        SDBrowser_isFF = versionInt;
    } else if (props.name === SDBrowser_SAFARI) {
        SDBrowser_isSafari = versionInt;
    } else if (props.name === SDBrowser_CHROME) {
        SDBrowser_isChrome = versionInt;
    }
    
}());
