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

// Uri.js
// Defines the Seadragon2.Uri class.

/*global SD */
/*jshint strict: false */

var

    /**
     *  A utility class for parsing URIs.
     *  @class Uri
     *  @private
     *  @namespace Seadragon2
     *  @static
     */
    SDUri = SD.Uri = {},
    
    /**
     *  The hostname reported for URIs having a file:// protocol. This is because
     *  browsers report an empty hostname for such URIs.
     *  @property FILE_HOSTNAME
     *  @final
     *  @type string
     *  @default localhost
     */
    SDUri_FILE_HOSTNAME = SDUri.FILE_HOSTNAME = "localhost",
    
    /**
     *  The hostname of the currently loaded page.
     *  @property PAGE_HOSTNAME
     *  @final
     *  @private
     *  @type string
     */
    SDUri_PAGE_HOSTNAME = location.hostname || SDUri_FILE_HOSTNAME,

    /**
     *  Parses and returns the hostname of the given URL. If the URL is relative,
     *  its hostname is considered to be the page's hostname. The returned hostname
     *  is always lowercase.
     *  @method getHostname
     *  @param {string} url The URL to parse.
     *  @return {string} The lowercase hostname of the given URL if it's absolute,
     *  otherwise the page's hostname.
     */
    SDUri_getHostname = SDUri.getHostname = function (url) {
        var hostnameMatch = /^http[s]?:\/\/([\w-.]+)/i.exec(url),
            fileMatch;  // don't automatically execute here, it's an edge case
        
        // case 1: it's an absolute http:// or https:// URL, extract the
        // hostname. make sure to lowercase it!
        if (hostnameMatch) {
            return hostnameMatch[1].toLowerCase();
        }
        
        // case 2: it's an absolute file:// URL, return non-empty hostname
        else if ((fileMatch = /^file:\/\//i.exec(url))) {
            return SDUri_FILE_HOSTNAME;
        }
        
        // case 3: it must be a relative URL, return page's hostname
        return SDUri_PAGE_HOSTNAME;
    };
