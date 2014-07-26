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

/*jslint browser: true, onevar: true, undef: true, nomen: true, eqeqeq: true,
  plusplus: true, bitwise: true, regexp: true, immed: true */
/*global mozRequestAnimationFrame, webkitRequestAnimationFrame, msRequestAnimationFrame,
SDEvent_add, SDEvent_remove, SDDebug_warn, window, SD*/
/*jshint strict: false */

/**
 * A static timer that manages absolutely everything that needs to update per frame.
 * @class Timer
 * @namespace Seadragon2
 * @static
 */
/*jshint supernew: true */
var SDTimer = SD.Timer = new function () {
/*jshint supernew: false */
    var that = this,
        first = null,
        delay = 16,
        interval = null,
        mozTick,
        enable,
        disable,
        reqAnimFrame,
        canceling;

    // The tick function will get called on the interval.
    // Note: we're putting this function on a timer, so it will be called on the global object.
    function tick() {
        var cur,
            now = new Date().getTime(),
            retVal;
        for (cur = first; cur; cur = cur.next) {
            try {
                retVal = cur.callback(cur.arg, now);
            } catch (e) {
                SDDebug_warn("Exception caught in timer: " + e.message);
            }
            if (!retVal) {
                that.unregister(cur);
            }
        }
    }

    /**
     * Register a function to be called in this timer. The callback will be called
     * and passed two arguments: the provided argument, and the current time in milliseconds.
     * The callback function must return true to stay on the timer, or false to be removed
     * from the timer. The timer makes no guarantee of what order various callbacks will be invoked,
     * but does guarantee fairness.
     * @method register
     * @static
     * @param callback {function} the function to be called
     * @param arg {object} an argument to be passed to the callback
     * @return {object} a token that can be passed to the unregister method
     */
    this.register = function (callback, arg) {
        // create an object containing the callback function and its parameter
        var obj = {callback: callback, arg: arg};

        // push the animation function onto the stack
        obj.next = first;
        if (first) {
            first.prev = obj;
        }
        obj.prev = null;
        first = obj;

        // now that something is registered, make sure the timer is on.
        enable();

        // return the object as a token, which could later be passed to this.unregister
        return obj;
    };

    /**
     * Unregister a previously registered task.
     * @method unregister
     * @static
     * @param obj {object} the token that was returned from a previous call to register().
     */
    this.unregister = function (obj) {
        // check whether it was already unregistered
        if (obj.dead) {
            return;
        }

        // remove the animation function from the stack
        if (obj.next) {
            obj.next.prev = obj.prev;
        }
        if (obj.prev) {
            obj.prev.next = obj.next;
        } else {
            first = obj.next;
        }

        // if nothing is registered, don't bother running the timer.
        if (!first) {
            disable();
        }

        // remember that we already unregistered this, in case somebody tries to again
        obj.dead = true;
    };

    // Firefox offers an awesome way to sync with screen repaints, so we'll use
    // it if available. Now Chrome and IE10 have it too.
    if (typeof mozRequestAnimationFrame === "function") {
        reqAnimFrame = mozRequestAnimationFrame;
    } else if (typeof webkitRequestAnimationFrame === "function") {
        reqAnimFrame = webkitRequestAnimationFrame;
    } else if (typeof msRequestAnimationFrame === "function") {
        reqAnimFrame = msRequestAnimationFrame;
    }

    if (reqAnimFrame) {
        mozTick = function () {
            if (canceling) {
                canceling = false;
                interval = null;
                return;
            }

            // although requestAnimationFrame passes us a timestamp, we'll ignore it
            // because in IE10 the timestamp has nothing to do with the current unix time,
            // which causes dangerous issues elsewhere in code that assumes consistent
            // time sources.

            tick();
            reqAnimFrame(mozTick);
        };

        enable = function () {
            canceling = false;
            if (!interval) {
                interval = true;
                reqAnimFrame(mozTick);
            }
        };

        disable = function () {
            if (interval) {
                canceling = true;
            }
        };
    } else {

        enable = function () {
            if (interval === null) {
                interval = setInterval(tick, delay);
            }
        };

        disable = function () {
            if (interval !== null) {
                clearInterval(interval);
                interval = null;
            }
        };
    }
}();
