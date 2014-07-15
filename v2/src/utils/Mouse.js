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

/*global SD, SDPoint, SDBrowser_isFF, SDDebug_error*/

/**
 * A utility class to deal with mouse input.
 * @class Mouse
 * @namespace Seadragon2
 * @static
 */
var SDMouse = SD.Mouse = {};

/**
 * Get the mouse position, relative to the document.
 * @method getPosition
 * @static
 * @param event {MouseEvent} the current mouse event.
 * @return {Seadragon2.Point} of the mouse's X and Y position.
 */
var SDMouse_getPosition = SDMouse.getPosition = function (event) {
    var result = new SDPoint();
    
    if (event.type === "DOMMouseScroll" &&
            SDBrowser_isFF < 3) {
        // hack for FF2 which reports incorrect position for mouse scroll
        result.x = event.screenX;
        result.y = event.screenY;
    } else if (typeof event.pageX === "number") {
        result.x = event.pageX;
        result.y = event.pageY;
    } else if (typeof event.clientX === "number") {
        result.x = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        result.y = event.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    } else {
        SDDebug_error("Unknown event mouse position, no known technique.");
    }

    return result;
}

/**
 * Get the scroll direction of a mouse wheel event.
 * @method getScroll
 * @static
 * @param event {WheelEvent} the current mouse wheel event
 * @return {number} -1, 0, or 1, depending on the scroll direction.
 */
var SDMouse_getScroll = SDMouse.getScroll = function (event) {
    var delta = 0; // default value
    
    if (typeof event.wheelDelta === "number") {
        delta = event.wheelDelta;
    } else if (typeof event.detail === "number") {
        delta = event.detail * -1;
    } else {
        Seadragon2.Debug.fail("Unknown event mouse scroll, no known technique.");
    }
    
    // normalize value to [-1, 1]
    return delta ? delta / Math.abs(delta) : 0;
}