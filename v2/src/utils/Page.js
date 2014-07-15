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

/*global SDPoint, window, pageXOffset, pageYOffset*/

/**
 * A utility class for working with HTML pages.
 * @class Page
 * @namespace Seadragon2
 * @static
 * @private
 */

/**
 * Get the current left and top scroll offset of the document.
 * @method getScroll
 * @static
 * @return {Seadragon2.Point} the page's X and Y offsets.
 */
function SDPage_getScroll() {
    var result = new SDPoint(),
        docElmt = document.documentElement || {},
        body = document.body || {};
    
    if (typeof window.pageXOffset === "number") {
        // most browsers
        result.x = pageXOffset;
        result.y = pageYOffset;
    } else if (body.scrollLeft || body.scrollTop) {
        // W3C spec, IE6+ in quirks mode
        result.x = body.scrollLeft;
        result.y = body.scrollTop;
    } else if (docElmt.scrollLeft || docElmt.scrollTop) {
        // IE6+ in standards mode
        result.x = docElmt.scrollLeft;
        result.y = docElmt.scrollTop;
    }
    
    // note: we specifically aren't testing for typeof here, because IE sets
    // the appropriate variables undefined instead of 0 under certain
    // conditions. this means we also shouldn't fail if none of the three
    // cases are hit; we'll just assume the page scroll is 0.
    
    return result;
}