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

// Event.js
// Defines the Seadragon2.Event class.

/*global SDEvent, SDDebug_error, SDDebug_warn, SDFunction_EMPTY */
/*jshint strict: false */

var

    /**
     *  Fire an event at the given element.
     *  @method raise
     *  @static
     *  @param {Element} elmt The HTML element that will receive the event.
     *  @param {string} eventName The name of the event (without "on").
     *  @param {boolean} bubbles True to let the event bubble, on browsers that
     *  support it.
     *  @return {boolean} True if the event was fired.
     */
    SDEvent_raise = SDEvent.raise = (function () {
        
        // using a closure so that we do the cross-browser (i.e. IE) checks
        // only and exactly once instead of on every event add.
        
        // case 1: W3C standard method
        if (document.createEvent) {
            return function (elmt, eventName, bubbles) {
                bubbles = bubbles || false;
                var event = document.createEvent("HTMLEvents");
                event.initEvent(eventName, bubbles, true); // bubbles, cancelable
                return elmt.dispatchEvent(event);
            }
        }
        
        // case 2: IE method
        if (document.createEventObject) {
            return function (elmt, eventName) {
                var event = document.createEventObject();
                try {
                    return elmt.fireEvent("on" + eventName, event);
                } catch (e) {
                    // IE8 and below refuses to fire the following events programmatically:
                    // onabort onafterprint onbeforeprint onbeforeunload onbounce onchange
                    // onerror onfinish onhashchange onload onmessage onoffline ononline
                    // onreset onselect onselectionchange onstart onstop onsubmit onunload
                    SDDebug_warn("Event not fired: " + eventName + ". " + e.message);
                }
            }
        }
        
        // case 3: nothing to do, return empty function
        SDDebug_error("Seadragon2.Event: no raise ability.");
        return SDFunction_EMPTY;
        
    }());
