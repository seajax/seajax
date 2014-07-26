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

// ImageManager.js
// defines the Seadragon2.ImageManager class
/*global SDDebug_log, SD, SDImage, SDTimer */
/*jshint strict: false */

var

    /**
     * A class responsible for running automatic updates on any registered Images,
     * and automatically initializing any sdimg elements that are added to the page's HTML
     * contents.
     * @class ImageManager
     * @static
     * @namespace Seadragon2
     */
    SDImageManager = SD.ImageManager = {},
    
    // If we're checking for initialization every frame, it's just stacked up like the other tasks.
    // When we register the task, it returns a token we need to keep track of, in case we decide
    // to unregister it.
    SDImageManager_markupCheckToken = null,
    
    SDImageManager_isEnabled = true;

// checks for whether new images have been added as HTML <sdimg> tags.
function SDImageManager_checkForInit() {
    var elements = document.getElementsByTagName("sdimg"),
        i,
        n = elements.length,
        element,
        child,
        nextSibling,
        parent;
    for (i = 0; i < n; i++) {
        element = elements[i];
        // it's likely that this element was already initialized,
        // so check for the existence of a function that's part of SDImage.
        if (!element.update) {
            // fun fact: unless the page is hosted as application/xhtml+xml
            // (which it almost certainly isn't), self-closing tags will be parsed incorrectly.
            // there should NEVER be any child elements of an sdimg, so we may need to move
            // things around in the DOM to correct for that. best practice of course is to
            // always use <sdimg></sdimg> rather than <sdimg />, but we can't guarantee that
            // all users will.
            // However, it's possible that child nodes are actually left over from
            // uninitializing this SDIMG, in which case we remove them!
            // (how does this happen? <body><sdimg src="stuff"/></body>
            // then calling document.body.innerHTML += <p>something else</p>
            // uninitializes the existing sdimg element)
            nextSibling = element.nextSibling;
            parent = element.parentNode;
            while (element.hasChildNodes()) {
                child = element.firstChild;
                element.removeChild(child);
                if (child.className === "sdimgcontainerdiv") {
                    continue;
                }
                if (nextSibling) {
                    parent.insertBefore(child, nextSibling);
                } else {
                    parent.appendChild(child);
                }
            }
            
            // kind of counterintuitive, but by calling new SDImage(), we actually
            // modify the existing HTML element.
            new SDImage(null, elements[i]);
        }
    }
    
    // since we're calling this in a Timer, we need to return true to stay registered
    return true;
}

// package-protected functions to sign up for updates

SDImageManager.register = function (callback, arg) {
    if (SDImageManager_isEnabled) {
        return SDTimer.register(callback, arg);
    }
};

SDImageManager.unregister = function (obj) {
    return SDTimer.unregister(obj);
};

// publicly accessible functions to turn automatic updates on or off.

/**
 * Enable checking for sdimg tags written in markup. By default, this behavior
 * is disabled.
 * @method enableMarkupChecking
 */
SDImageManager.enableMarkupChecking = function () {
    if (!SDImageManager_markupCheckToken) {
        SDImageManager_markupCheckToken = SDTimer.register(SDImageManager_checkForInit);
    }
};

/**
 * Disable checking for sdimg tags written in markup. By default, this behavior
 * is disabled.
 * @method disableMarkupChecking
 */
SDImageManager.disableMarkupChecking = function () {
    if (SDImageManager_markupCheckToken) {
        SDTimer.unregister(SDImageManager_markupCheckToken);
        SDImageManager_markupCheckToken = null;
    }
};

/**
 * Enable the ImageManager. It is enabled by default.
 * @method enable
 */
SDImageManager.enable = function () {
    SDImageManager_isEnabled = true;
}

/**
 * Disable the ImageManager. It is enabled by default. This might help
 * performance if all of your Images are manually updated.
 * @method disable
 */
SDImageManager.disable = function () {
    SDImageManager_isEnabled = false;
}
