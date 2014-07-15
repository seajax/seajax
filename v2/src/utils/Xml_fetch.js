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

// Xml_fetch.js
// Defines the Seadragon2.Xml.fetch() method.

/*global SD, SDXml, SDDebug_warn, SDDebug_error, SDFunction_EMPTY, ActiveXObject, XDomainRequest */
/*jslint strict: false */

var

    /**
     *  If the browser supports asynchronous XML requests, asynchronously fetches
     *  the XML at the given URL, calling either the given success callback or the
     *  given failure callback on completion, and returns the browser-specific
     *  XmlHttpRequest object. Otherwise, does nothing and returns null.
     *  @method fetch
     *  @static
     *  @param {string} url The URL of the XML.
     *  @param {function} onSuccess The callback function to use when the XML is
     *  successfully fetched. It will be called with the XmlHttpRequest object set
     *  to "this".
     *  @param {function} onFailure The callback function to use when the XML is
     *  unsuccessfully fetched. It will be called with the XmlHttpRequest object set
     *  to "this".
     *  @param {string} postData Optional. If supplied, this function will do a POST
     *  instead of a GET, and the provided post data will be sent to the server.
     *  @param {string} mimeType Optional. If postData is supplied, then this function
     *  will set the Content-Type request header to the mimeType string if possible.
     *  @return {XmlHttpRequest} The browser-specific XmlHttpRequest object if the
     *  browser supports asynchronous XML requests and the XML is being fetched,
     *  otherwise null.
     */
    SDXml_fetch = SDXml.fetch = (function () {

        // using a closure so that we do the cross-browser (i.e. IE) checks
        // only and exactly once instead of on every request.

        // step 1: create a cross-browser (i.e. IE6) XmlHttpRequest constructor
        var ieOpts = ["Msxml2.XMLHTTP", "Microsoft.XMLHTTP", "Msxml3.XMLHTTP"],
            ieOpt, i, XhrObject, xhrArg,
            hasXDR = typeof XDomainRequest !== "undefined";

        // case 1: W3C standard object
        if (typeof XMLHttpRequest !== "undefined") {
            XhrObject = XMLHttpRequest;
        }

        // case 2: IE6 ActiveX object, but there are multiple options
        else if (typeof ActiveXObject !== "undefined") {
            for (i = 0; i < ieOpts.length; i++) {
                ieOpt = ieOpts[i];
                try {
                    new ActiveXObject(ieOpt);
                    XhrObject = ActiveXObject;
                    xhrArg = ieOpt;
                    break;
                } catch (e) {
                    SDDebug_warn("Seadragon2.Xml: {0} ActiveX failed.", ieOpt);
                }
            }

            // if no ActiveX worked, we'll fall through to the null function
            if (i >= ieOpts.length) {
                SDDebug_error("Seadragon2.Xml: no ActiveX worked.");
            }
        }

        // case 3: nothing!
        else {
            SDDebug_error("Seadragon2.Xml: no fetching ability.");
        }

        // if nothing, return empty function that signals no request is made
        if (!XhrObject) {
            return SDFunction_EMPTY;
        }

        // note how these functions' closures have no reference to XHR objects;
        // this prevents memory leaks in IE.
        function generateOnXhrReadyStateChange(onSuccess, onFailure) {
            return function () {
                // inside here, "this" refers to the calling XHR object.
                // readyState of 4 means complete
                if (this.readyState !== 4) {
                    return;
                }

                // according to "the" spec (and prototype.js documentation),
                // "success" is defined as empty status or 2xy status.
                // call the appropriate success or failure handler here.
                // Setting xhr to "this" instead of passing it as arg;
                // doing this only for convenience (SDNetwork handler).
                // this may need changing as we port this to other libraries.
                if (this.status === 0 ||
                    (this.status >= 200 && this.status < 300)) {
                    onSuccess.call(this);
                } else {
                    onFailure.call(this);
                }
            };
        }

        // step 2: return the function to actually make the request!
        return function (url, onSuccess, onFailure, postData, mimeType) {
            var xhr = new XhrObject(xhrArg),
                verb = postData ? "POST" : "GET",
                usingXdr = false;

            xhr.onreadystatechange =
                generateOnXhrReadyStateChange(onSuccess, onFailure);

            // remove the fragment, if any (for better caching, but also because
            // IE8- incorrectly send it to the server, resulting in a 404!).
            url = url.replace(/#.*/, '');

            try {
                xhr.open(verb, url, true);     // true for async
            } catch (e) {
                // one possible reason for an exception here is that the request
                // is cross-domain and we're running IE 8 or 9. In that case, we
                // must use XDomainRequest instead of XMLHttpRequest. Note that
                // we can't just use XDRs all the time, since they check the
                // Access-Control-Allow-Origin header even on same-origin requests.
                if (hasXDR) {
                    xhr = new XDomainRequest();
                    xhr.onload = onSuccess;
                    xhr.onerror = onFailure;
                    xhr.timeout = 30000;
                    xhr.ontimeout = function () {};
                    xhr.onprogress = function () {};
                    xhr.open(verb, url);
                    usingXdr = true;
                } else {
                    // we don't know what to do with this exception
                    throw e;
                }
            }

            if (postData && xhr.setRequestHeader) {
                xhr.setRequestHeader("Content-Type", mimeType || "text/plain");
            }

            // I have no clue whatsoever why this makes XDRs work right, but they fail
            // randomly if you don't put them on a new cycle of the event loop like this.
            if (usingXdr) {
                setTimeout(function(){
                    xhr.send(postData || null);     // null for no message body (e.g. POST data)
                }, 0);
            } else {
                xhr.send(postData || null);
            }

            return xhr;
        };

    }());
