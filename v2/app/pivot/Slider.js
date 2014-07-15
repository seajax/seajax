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

/*global Seadragon2, makeElement, addText*/

// A very simple Javascript range slider control.
function PivotSlider(container, min, max, value, leftLabel, rightLabel) {
    var self = this,
        minusButton, // the HTML element for the minus button at the left
        plusButton, // the HTML element for the plus button at the right
        minusDisabled, // whether the minus sign is grayed out and unclickable
        plusDisabled, // whether the plus sign is grayed out and unclickable
        sliderBackground, // the HTML element for the horizontal background line
        sliderHandle, // the HTML element that can be grabbed and moved
        pixelUnits, // how wide each pixel is on the number line
        stepSize = (max - min) / 16, // how far to move for each click on plus or minus
        tracker, // the MouseTracker that deals with slider interaction
        mouseDownX, // the position the mouse was pressed down on the slider bar
        pxPosition, // the position of the slider handle, in pixels from the left end
        sliderWidth, // the width of the background slider bar, in px
        handleWidth; // the width of the slider handle, in px

    // inherit from EventManager
    Seadragon2.EventManager.call(self);

    // sanitize the arguments
    if (!(min < max)) {
        min = 0;
        max = 1;
    }
    if (typeof value !== "number") {
        value = min + (max - min) / 2;
    }

    minusButton = makeElement("div", "pivot_zoomout pivot_hoverable", container);
    minusButton.innerHTML = "&minus;";
    minusButton.title = leftLabel;
    sliderBackground = makeElement("div", "pivot_zoomline", container);
    sliderHandle = makeElement("div", "pivot_zoomhandle", sliderBackground);
    sliderWidth = sliderBackground.offsetWidth;
    handleWidth = sliderHandle.offsetWidth;
    pixelUnits = (max - min) / (sliderWidth - handleWidth);
    plusButton = makeElement("div", "pivot_zoomin pivot_hoverable", container);
    addText(plusButton, "+");
    plusButton.title = rightLabel;

    // handle a click on the minus button
    minusButton.onclick = function () {
        if (!minusDisabled) {
            self.setValue(value - stepSize, true);
        }
    };

    // handle a click on the plus button
    plusButton.onclick = function () {
        if (!plusDisabled) {
            self.setValue(value + stepSize, true);
        }
    };

    // set up mouse tracking for the slider handle
    tracker = new Seadragon2.MouseTracker(sliderHandle);
    tracker.addListener("press", function (tracker, id, position) {
        mouseDownX = position.x;
        document.documentElement.className += " pivot_eresize";
    });
    tracker.addListener("release", function () {
        var documentElement = document.documentElement;
        mouseDownX = undefined;
        documentElement.className = documentElement.className.replace(" pivot_eresize", "");
    });
    tracker.addListener("drag", function (tracker, id, position) {
        self.setValue((pxPosition + position.x - mouseDownX) * pixelUnits + min, true);
    });
    tracker.setTracking(true);
    
    // handle a click elsewhere inside the slider
    container.onclick = function (e) {
        var target = e.target;
        // ignore clicks that were on the buttons or slider handle
        if (target === container || target === sliderBackground) {
            // get the mouse position relative to the slider bar
            var position = Seadragon2.Mouse.getPosition(e).minus(Seadragon2.Element.getPosition(sliderBackground)).x;
            if (position >= 0 && position < sliderWidth) {
                // move the slider to the value that was clicked
                self.setValue((position - handleWidth / 2) * pixelUnits + min, true);
            }
        }
    };

    // this function checks that the value is in the allowed range, and
    // disables or enables the plus and minus buttons as necessary. It also
    // sets the position of the slider bar. It won't do anything if called
    // while the user is actively interacting with the control, unless the
    // internal parameter is true. Also, if the internal parameter is true,
    // this function raises the change event.
    self.setValue = function (newValue, internal) {
        if (mouseDownX === undefined || internal) {

            // set the new value
            var oldValue = value;
            value = newValue;

            // check whether buttons should be enabled or disabled
            if (value <= min) {
                value = min;
                if (!minusDisabled) {
                    minusDisabled = true;
                    minusButton.title = "";
                    minusButton.className = "pivot_zoomout pivot_hoverable pivot_disabled";
                }
            } else if (minusDisabled) {
                minusDisabled = false;
                minusButton.title = leftLabel;
                minusButton.className = "pivot_zoomout pivot_hoverable";
            }
            if (value >= max) {
                value = max;
                if (!plusDisabled) {
                    plusDisabled = true;
                    plusButton.title = "";
                    plusButton.className = "pivot_zoomin pivot_hoverable pivot_disabled";
                }
            } else if (plusDisabled) {
                plusDisabled = false;
                plusButton.title = rightLabel;
                plusButton.className = "pivot_zoomin pivot_hoverable";
            }

            // move the slider handle
            pxPosition = Math.round((value - min) / pixelUnits);
            sliderHandle.style.left = pxPosition + "px";

            // raise a change event
            if (internal && oldValue !== value) {
                self.trigger("change", value);
            }
        }
    };

    self.setValue(value);
}