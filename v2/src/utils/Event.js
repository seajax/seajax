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
// Defines the Seadragon2.Event class and its $() method.

/*global SD, event */
/*jshint strict: false */

var

    /*  To work around YUI doc putting M before _, we must redo these comments
     *  in the beginning of Event_addRemove.js.
     *  A utility class for working with DOM and custom events.
     *  @class Event
     *  @namespace Seadragon2
     *  @static
     */
    SDEvent = SD.Event = {},

    /*
     *  Given the argument to an event handler, retrieve the event object.
     *  @method $
     *  @static
     *  @param {Event} e? The argument passed to the event handler.
     *  @return {Event} The event that has been raised.
     */
    SDEvent_$ = SDEvent.$ = function (e) {
        // IE doesn't pass event objects to handlers; it instead saves them to
        // the global variable "event".
        // we would ideally just do "return e || event", but in non-IE browsers,
        // "event" may be undefined, throwing an error, so we explicitly check.
        return e ? e :
            typeof event !== "undefined" ? event : null;
    };
