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

/*global SD, SDDebug_warn, window*/

/**
 * <p>A simple class with some methods for listening for and triggering events.
 * Classes may wish to extend this by calling it in their constructors.</p>
 * <p>The intended usage is that other objects will listen for events by calling
 * addListener, and the object itself will raise those events by calling its own
 * trigger method. Other uses are possible though.</p>
 * @class EventManager
 * @namespace Seadragon2
 * @constructor
 */
var SDEventManager = SD.EventManager = function () {

    // Fields

    var listeners = {}; // dictionary of eventName --> array of handlers

    // Methods

    /**
     * <p>Bind the given handler function to the named event.</p>
     * <p>Unlike DOM event handlers, it is possible
     * to register the same function twice for the same event. Removing it will then
     * remove only the first reference. Since this element isn't in the DOM and
     * isn't necessarily attached to any tree structure, we don't have to deal with
     * capturing/bubbling behavior.</p>
     * @method addListener
     * @param eventName {string}
     * @param handler {function}
     */
    this.addListener = function (eventName, handler) {
        if (typeof handler !== "function") {
            return;
        }

        if (!listeners.hasOwnProperty(eventName)) {
            listeners[eventName] = [];
        }

        listeners[eventName].push(handler);
    };

    /**
     * Remove the given handler function from the named event.
     * @method removeListener
     * @param eventName {string}
     * @param handler {function}
     */
    this.removeListener = function (eventName, handler) {
        var handlers = listeners[eventName];

        if (typeof handler !== "function" || !handlers) {
            return;
        }

        var i, n = handlers.length;
        for (i = 0; i < n; i++) {
            if (handler === handlers[i]) {
                handlers.splice(i, 1);
                return;
            }
        }
    };

    /**
     * Remove all listeners for the named event.
     * @method clearListeners
     * @param eventName {string}
     */
    this.clearListeners = function (eventName) {
        if (listeners.hasOwnProperty(eventName)) {
            delete listeners[eventName];
        }
    };

    /**
     * Get an array containing all listeners for the named event.
     * @method listListeners
     * @param eventName {string}
     */
    this.listListeners = function (eventName) {
        if (listeners.hasOwnProperty(eventName)) {
			var list = listeners[eventName];
			if (list && list.length) {
				// return a copy
				return list.slice(0);
			}
        }
    };

    /**
     * Call all registered handlers for the named event. They will
     * be called in the order they were added, with the given arguments.
     * @method trigger
     * @param eventName {string}
     * @param arguments {object...}
     */
    this.trigger = function (eventName) {
        var handlers = listeners[eventName];
        var args = [].slice.call(arguments, 1);

        if (!handlers) {
            return;
        }
        
        // copy the handlers array in case it is modified by one of the handlers
        handlers = handlers.slice(0);

        var i, n = handlers.length;
        for (i = 0; i < n; i++) {
            try {
                handlers[i].apply(window, args);
            } catch (e) {
                // handler threw an error, ignore, go on to next one
                SDDebug_warn(e.name + " while executing " + eventName +
                        " handler: " + e.message, e);
            }
        }
    };

};
