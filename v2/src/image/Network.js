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

// Network.js
// Defines the Seadragon2.Network class.

/*global SD, SDDebug_warn, SDDebug_error, SDUri_getHostname, ActiveXObject */
/*jslint strict: false */

var

    /**
     *  A utility class for managing parallel network requests to multiple hosts.
     *  @class Network
     *  @namespace Seadragon2
     *  @static
     */
    SDNetwork = SD.Network = {},

    // the maximum number of parallel connections the browser makes to a
    // particular hostname, so hence the max number we should make as well.
    // TODO newer browsers use a higher value for this, derive it dynamically
    // depending on the browser.
    SDNetwork_MAX_CONNECTIONS_PER_HOSTNAME = SDNetwork.MAX_CONNECTIONS_PER_HOSTNAME = 6,
    
    // the maximum number of parallel connections the browser makes in total,
    // so again the max number we should make as well.
    // TODO newer browsers also use a higher value for this, derive it.
    SDNetwork_MAX_CONNECTIONS_TOTAL = SDNetwork.MAX_CONNECTIONS_TOTAL = 30,

    /**
     *  Dictionary of hostnames and the number of current requests to those
     *  hostnames.
     *  @property numRequestsTo
     *  @type object
     *  @private
     */
    SDNetwork_numRequestsTo = {},
    
    /**
     *  The total number of requests currently in progress.
     *  @property numRequestsTotal
     *  @type number
     *  @private
     */
    SDNetwork_numRequestsTotal = 0,

    /**
     *  Dictionary of URLs and the &lt;img&gt; objects for those URLs.
     *  @property imageRequests
     *  @type object
     *  @private
     */
    SDNetwork_imageRequests = {},

    /**
     *  Dictionary of URLs and the XmlHttpRequest objects for those URLs.
     *  @property xmlHttpRequests
     *  @type object
     *  @private
     */
    SDNetwork_xmlHttpRequests = {},

    /**
     *  Returns the number of spots available across all hostnames.
     *  @method numSpotsAvailable
     *  @return {number} The number of spots available across all hostnames.
     */
    /**
     *  Returns the number of spots available to the given hostname.
     *  @method numSpotsAvailable
     *  @param {string} hostname
     *  @return {number} The number of spots available to the given hostname.
     */
    SDNetwork_numSpotsAvailable = SDNetwork.numSpotsAvailable = function(hostname) {
        // how many spots left total across all hostnames? clamp to zero.
        var spotsLeftTotal = Math.max(0,
            SDNetwork_MAX_CONNECTIONS_TOTAL - (SDNetwork_numRequestsTotal || 0));
        
        // if no hostname, respond with that number...
        if (!hostname) {
            return spotsLeftTotal;
        }

        // otherwise, respond with the lesser of that number and the number of
        // spots left to that hostname, also clamped to zero.
        return Math.min(spotsLeftTotal, Math.max(0,
            SDNetwork_MAX_CONNECTIONS_PER_HOSTNAME - (SDNetwork_numRequestsTo[hostname] || 0)));
    },

    /**
     *  Marks that a spot has opened up for the given hostname.
     *  @method markSpotOpen
     *  @private
     *  @param {string} hostname
     */
    SDNetwork_markSpotOpen = SDNetwork.markSpotOpen = function(hostname) {
        // two things to decrement: number of connections to this hostname, and
        // number of connections total. in both cases, clamp to zero.
        SDNetwork_numRequestsTo[hostname] = Math.max(0,
            (SDNetwork_numRequestsTo[hostname] || 0) - 1);
        SDNetwork_numRequestsTotal = Math.max(0,
            (SDNetwork_numRequestsTotal || 0) - 1);
    },
    
    /**
     *  Marks that a spot has been taken for the given hostname.
     *  @method markSpotTaken
     *  @private
     *  @param {string} hostname
     */
    SDNetwork_markSpotTaken = SDNetwork.markSpotTaken = function(hostname) {
        // two things to increment: number of connections to this hostname, and
        // number of connections total.
        SDNetwork_numRequestsTo[hostname] = (SDNetwork_numRequestsTo[hostname] || 0) + 1;
        SDNetwork_numRequestsTotal = (SDNetwork_numRequestsTotal || 0) + 1;
    };

/**
 *  
 *  @method generateTryMakeRequestMethod
 *  @private
 *  @param {object} requests
 *  @param {function} makeRequestFunc
 */
function SDNetwork_generateTryMakeRequestMethod(requests, makeRequestFunc) {
    return function (url, callback, force) {
        var hostname, request = requests[url];

        // if a request to this URL is already being made currently, add the
        // callback to its list of callbacks and return true (since the request
        // *will* be made), but don't make another duplicate request.
        if (request) {
            if (typeof callback === "function") {
                request.seadragon.callbacks.push(callback);
            }

            return true;
        }

        // parse this URL's hostname
        hostname = SDUri_getHostname(url);

        // check if we have enough spots for this hostname. if not, and this
        // isn't being forced, return false and don't make the request.
        if (!SDNetwork_numSpotsAvailable(hostname) && !force) {
            return false;
        }
        
        // otherwise, try to make the request...
        request = makeRequestFunc(url);
        
        // if unsuccessful (e.g. browser doesn't support XML HTTP requests),
        // signal that it's not being made
        if (!request) {
            return false;
        }
        
        // otherwise, track it and its properties, and mark the spot taken!
        SDNetwork_markSpotTaken(hostname);
        requests[url] = request;
        request.seadragon = {
            url: url,
            hostname: hostname,
            callbacks: (typeof callback === "function") ? [callback] : []
        };

        // and signal that it's been made
        return true;
    };
}

var

    /**
     *  Try to request an image file from the given location. Upon completion,
     *  the provided callback function will be called with three arguments:
     *  the URL requested, a boolean success value, and an HTMLImageElement
     *  containing the requested image.
     *  @method tryMakeImageRequest
     *  @param {string} url The location of the image.
     *  @param {function} callback The function to call upon completion.
     *  @param {boolean} force? (optional) True to make the request regardless
     *  of how many other requests are queued.
     *  @return {boolean} True if the image request will be made or is already
     *  underway, false otherwise.
     */
    SDNetwork_tryMakeImageRequest = SDNetwork.tryMakeImageRequest =
        SDNetwork_generateTryMakeRequestMethod(SDNetwork_imageRequests, function(url) {
            var img = document.createElement("img");
            
            img.onload = SDNetwork_onImageLoad;
            img.onerror = img.onabort = SDNetwork_onImageError;

            img.src = url;

            return img;
        }),

    /**
     *  Try to request a file from the given location. Upon completion,
     *  the provided callback function will be called with three arguments:
     *  the URL requested, a boolean success value, and an XmlHttpRequest
     *  object containing the requested document.
     *  @method tryMakeXmlHttpRequest
     *  @param {string} url The location of the resource.
     *  @param {function} callback The function to call upon completion.
     *  @param {boolean} force? (optional) True to make the request regardless
     *  of how many other requests are queued.
     *  @return {boolean} True if the XML HTTP request will be made or is already
     *  underway, false otherwise.
     */
    SDNetwork_tryMakeXmlHttpRequest = SDNetwork.tryMakeXmlHttpRequest =
        SDNetwork_generateTryMakeRequestMethod(SDNetwork_xmlHttpRequests, function(url) {
            // SDXml_fetch abstracts away the creation of the XmlHttpRequest
            // object and initiation of the async request. returns the object,
            // or null if the browser doesn't support it.
            return SDXml_fetch(
                url, SDNetwork_onXmlHttpSuccess, SDNetwork_onXmlHttpFailure);
        });

/**
 *  
 *  @method tryCallAll
 *  @private
 *  @param {Object} callbacks
 *  @param {Object} url
 *  @param {Object} success
 *  @param {Object} obj
 */
function SDNetwork_tryCallAll(callbacks, url, success, obj) {
    var i, numCallbacks = callbacks.length;

    for (i = 0; i < numCallbacks; i++) {
        try {
            callbacks[i](url, success, obj);
        } catch (e) {
            SDDebug_warn(
                "Seadragon2.Network callback {0} for {1} threw an error:\n{2}",
                i, url, e);
        }
    }
}

/**
 *  
 *  @method generateResponseHandler
 *  @private
 *  @param {object} requests
 *  @param {boolean} success
 *  @return {function} 
 */
function SDNetwork_generateResponseHandler(requests, success) {
    function responseHandler() {
        var privs = this.seadragon, url = privs.url;

        // clear this request's spot, and stop tracking it
        SDNetwork_markSpotOpen(privs.hostname);
        delete requests[url];

        // remove our extra attached info
        // delete doesn't work here in IE7! try-catching it seems ok.
        try {
            delete this.seadragon;
        } catch (e) {
            this.seadragon = null;
        }

        SDNetwork_tryCallAll(privs.callbacks, url, success, this);
    }

    // IE incorrectly raises async load/error events in the middle of any
    // ongoing javascript execution, which is bad since there are no locks.
    // to protect against race conditions, handle this response on a timeout.
    if (window.ActiveXObject) {
        return SDFunction_delay(responseHandler, 0);
    }
    
    return responseHandler;
}

var

    /**
     *  
     *  @method onImageLoad
     *  @private
     */
    SDNetwork_onImageLoad =
        SDNetwork_generateResponseHandler(SDNetwork_imageRequests, true),

    /**
     *  
     *  @method onImageError
     *  @private
     */
    SDNetwork_onImageError =
        SDNetwork_generateResponseHandler(SDNetwork_imageRequests, false),

    /**
     *  
     *  @method onXmlHttpSuccess
     *  @private
     */
    SDNetwork_onXmlHttpSuccess =
        SDNetwork_generateResponseHandler(SDNetwork_xmlHttpRequests, true),

    /**
     *  
     *  @method onXmlHttpFailure
     *  @private
     */
    SDNetwork_onXmlHttpFailure =
        SDNetwork_generateResponseHandler(SDNetwork_xmlHttpRequests, false);
