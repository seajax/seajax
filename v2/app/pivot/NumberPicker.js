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

/*global window, Seadragon2, PivotNumber_format, makeElement*/

// NumberPicker.js:
// This is a UI element for picking numbers from a range,
// used for filtering by numerical facets.
// It is an EventManager, which raises the events:
// filter: (facetName, min, max, inclusive) - to set a filter range
// unfilter: (facetName) - to unset the filter range

function PivotNumberPicker(optionsDiv, items, facetName, currentFilterValues) {
    var delta, // smallest value we round to in the number slider
        scale, // the log (base 10) of delta
        min = Infinity, // left end of number slider, as a number
        max = -Infinity, // right end of number slider, as a number
        slider, // HTML element for slider bar
        leftHandle, // HTML element for sliding the left end of the number range
        rightHandle, // HTML element for sliding the right end of the number range
        numBars, // the number of mini graph bars to display
        step, // the width of the range for each graph bar
        rangeCounts, // the number of items in each range
        biggestRange, // the maximum out of rangeCounts
        statusLabel, // the HTML area where we display the filter status, such as "Over 9000" or "23 - 45"
        graphZone, // the HTML area that contains the graph bars
        self = this, // a reference to the current object
        sliderArea, // the HTML element for the slider background
        leftLabel, // the HTML element labeling the left end of the slider
        rightLabel, // the HTML element labeling the right end of the slider
        left = 0, // the distance to the left end of the range, in pixels
        right = 0, // the distance to the right end of the range, in pixels
        lowerBound = -Infinity, // the lower edge of the selected range
        upperBound = Infinity, // the upper edge of the selected range
        width, // the maximum width of the slider, in pixels
        i, // a loop index
        mouseDownX, // the last point at which the user pressed the mouse button down
        middleTracker, // the mouse tracker for the middle section of slider
        leftTracker, // the mouse tracker for the left handle
        rightTracker, // the mouse tracker for the right handle
        cursorClass; // a class name that we added to the document element

    // build the status label
    statusLabel = makeElement("div", "pivot_numberlabel", optionsDiv);

    // extend EventManager, so we can raise named events
    Seadragon2.EventManager.call(self);

    // start by finding the min and max of the range
    items.forEach(function (item) {
        var facetData = item.facets[facetName],
            cur;
        if (facetData) {
            cur = facetData[0];
            if (cur < min) {
                min = cur;
            }
            if (cur > max) {
                max = cur;
            }
        }
    });

    // we'll always display 11 bars because that's what PivotViewer does.
    // split the range evenly and count how many go in each.
    numBars = 11;
    step = (max - min) / numBars;
    rangeCounts = [];

    // check whether there's only one value represented
    if (step === 0) {
        step = 0;
        numBars = 1;
    }

    if (step < 0) {
        // none of the current items have this facet set, which is boring.
        statusLabel.innerHTML = "Not Currently Applicable";
        return self;
    }

    for (i = 0; i < numBars; i++) {
        rangeCounts.push(0);
    }

    // iterate through the items again, counting them into bars
    items.forEach(function (item) {
        var facetData = item.facets[facetName],
            index;
        if (facetData) {
            index = step ? Math.floor((facetData[0] - min) / step) : 0;
            // sanity check on upper bound
            if (index > numBars - 1) {
                index = numBars - 1;
            }
            rangeCounts[index]++;
        }
    });

    // find the tallest bar, so we know how to scale the others
    biggestRange = rangeCounts.reduce(function (a, b) {
        return a > b ? a : b;
    }, 1);

    // make a bunch of UI
    graphZone = makeElement("div", "pivot_filtergraph", optionsDiv);
    rangeCounts.forEach(function (count, index) {
        var graphBar = makeElement("div", "pivot_filtergraphbar", graphZone);
        graphBar.style.width = 100 / numBars * 0.7 + "%";
        graphBar.style.left = 100 / numBars * (index + 0.15) + "%";
        graphBar.style.height = 100 * count / biggestRange + "%";
    });
    sliderArea = makeElement("div", "pivot_sliderouter", optionsDiv);
    slider = makeElement("div", "pivot_slider", sliderArea);
    leftHandle = makeElement("div", "pivot_sliderhandle pivot_sliderleft", sliderArea);
    rightHandle = makeElement("div", "pivot_sliderhandle pivot_sliderright", sliderArea);
    leftLabel = makeElement("div", "pivot_left", optionsDiv);
    rightLabel = makeElement("div", "pivot_right", optionsDiv);

    if (!step) {
        // if there is only one value represented, we can quit now since
        // the control won't need to ever deal with user input.
        // but first, set the range labels.
        leftLabel.innerHTML = min.toPrecision(4);
        rightLabel.innerHTML = max.toPrecision(4);
        return self;
    }

    // now that we know the layout for the slider bar, we can choose step sizes and such.
    width = parseFloat(Seadragon2.Element.getStyle(slider).width) - 1;
    scale = Math.floor(Math.log((max - min) / width) / Math.LN10);
    delta = Math.pow(10, scale);

    // adjust upper and lower bounds numbers to fit in this scale
    max = Math.ceil(max / delta) * delta;
    min = Math.floor(min / delta) * delta;

    // return a, rounded to the nearest delta.
    function approx(a) {
        return Seadragon2.Math.round(a, undefined, delta);
    }

    // set the labels, which won't change past this point
    leftLabel.innerHTML = PivotNumber_format(approx(min));
    rightLabel.innerHTML = PivotNumber_format(approx(max));

    // update the status string to describe the current filter
    function updateStatus() {
        statusLabel.innerHTML =
            lowerBound === -Infinity ?
                upperBound === Infinity ?
                    "" :
                    "Under " + PivotNumber_format(upperBound) :
            upperBound === Infinity ?
                "Over " + PivotNumber_format(lowerBound) :
                lowerBound === upperBound ?
                    "Exactly " + PivotNumber_format(lowerBound) :
                    PivotNumber_format(lowerBound) + " &ndash; " + PivotNumber_format(upperBound);
    }

    // move the left slider to a location, and update labels and stuff
    function moveLeft(pixelPosition) {
        var prevGrayBars = Math.floor(left / width * numBars),
            str = pixelPosition + "px",
            grayBars = Math.floor(pixelPosition / width * numBars),
            i;
        left = pixelPosition;
        leftHandle.style.left = str;
        slider.style.left = str;
        lowerBound = pixelPosition ?
            approx(min + (max - min) * pixelPosition / width) :
            -Infinity;
        updateStatus();
        for (i = prevGrayBars; i > grayBars; i--) {
            graphZone.childNodes[i - 1].className = "pivot_filtergraphbar";
        }
        for (i = prevGrayBars; i < grayBars; i++) {
            graphZone.childNodes[i].className = "pivot_filtergraphbar pivot_deselected";
        }
    }

    // move the right slider to a location, and update labels and stuff
    function moveRight(pixelPosition) {
        var prevGrayBars = Math.floor(right / width * numBars),
            str = pixelPosition + "px",
            grayBars = Math.floor(pixelPosition / width * numBars),
            i;
        right = pixelPosition;
        rightHandle.style.right = str;
        slider.style.right = str;
        upperBound = pixelPosition ?
            approx(max - (max - min) * pixelPosition / width) :
            Infinity;
        updateStatus();
        for (i = prevGrayBars; i > grayBars; i--) {
            graphZone.childNodes[numBars - i].className = "pivot_filtergraphbar";
        }
        for (i = prevGrayBars; i < grayBars; i++) {
            graphZone.childNodes[numBars - i - 1].className = "pivot_filtergraphbar pivot_deselected";
        }
    }

    // check whether there's already a filter applied on this range
    if (currentFilterValues) {
        // it's an array, but we'll only look at the first range
        currentFilterValues = currentFilterValues[0];
        lowerBound = currentFilterValues.lowerBound;
        upperBound = currentFilterValues.upperBound;
        if (lowerBound === undefined) {
            // the currently active filter is for items with this facet not set!
            statusLabel.innerHTML = "(no info)";
            lowerBound = -Infinity;
            upperBound = Infinity;
        } else {
            if (lowerBound > min) {
                moveLeft(Math.min(Math.round((lowerBound - min) / (max - min) * width), width));
                // make sure to display the actual value that we filtered by, not the approximate
                // value based on the slider position
                lowerBound = currentFilterValues.lowerBound;
            }
            if (upperBound < max) {
                moveRight(Math.min(Math.round((max - upperBound) / (max - min) * width), width - left));
                // once again, the moveRight method auto-updated the upperBound. we need to reset it
                // to the filter value that was actually applied.
                upperBound = currentFilterValues.upperBound;
            }
            updateStatus();
        }
    }

    // here are the mouse trackers that we'll use to watch for input
    middleTracker = new Seadragon2.MouseTracker(slider);
    leftTracker = new Seadragon2.MouseTracker(leftHandle);
    rightTracker = new Seadragon2.MouseTracker(rightHandle);

    // handle a release event. all three mouse trackers will do the same.
    function onRelease() {
        var documentElement = document.documentElement;
        documentElement.className = documentElement.className.replace(cursorClass, "");
        if (lowerBound === -Infinity && upperBound === Infinity) {
            self.trigger("unfilter", facetName);
        } else {
            self.trigger("filter", facetName, lowerBound, upperBound, true);
        }
    }
    middleTracker.addListener("release", onRelease);
    leftTracker.addListener("release", onRelease);
    rightTracker.addListener("release", onRelease);

    // for each tracker, the press listener remembers the x position of the press,
    // and sets the cursor style for the document.
    function makePressHandler(className) {
        className = " " + className;
        return function (tracker, id, position) {
            mouseDownX = position.x; // this is relative to the element being clicked
            cursorClass = className;
            document.documentElement.className += className;
        };
    }
    leftTracker.addListener("press", makePressHandler("pivot_wresize"));
    rightTracker.addListener("press", makePressHandler("pivot_eresize"));
    middleTracker.addListener("press", makePressHandler("pivot_pointer"));

    // handle a drag on the left slider
    leftTracker.addListener("drag", function (tracker, id, position) {
        var newLeft = Math.min(Math.max(left + position.x - mouseDownX, 0), width - right);
        if (newLeft !== left) {
            moveLeft(newLeft);
        }
    });

    // handle a drag on the right slider
    rightTracker.addListener("drag", function (tracker, id, position) {
        // note that the direction is negated compared to the left handler
        var newRight = Math.min(Math.max(right - position.x + mouseDownX, 0), width - left);
        if (newRight !== right) {
            moveRight(newRight);
        }
    });

    // handle a drag on the middle slider
    middleTracker.addListener("drag", function (tracker, id, position) {
        var movingRight = (position.x - mouseDownX > 0),
            newRight,
            newLeft;
        if (movingRight) {
            newRight = Math.max(right - position.x + mouseDownX, 0);
            if (newRight !== right) {
                newLeft = left - newRight + right;
                moveRight(newRight);
                moveLeft(newLeft);
            }
        } else {
            newLeft = Math.max(left + position.x - mouseDownX, 0);
            if (newLeft !== left) {
                newRight = right - newLeft + left;
                moveLeft(newLeft);
                moveRight(newRight);
            }
        }
    });

    // activate the mouse trackers
    middleTracker.setTracking(true);
    leftTracker.setTracking(true);
    rightTracker.setTracking(true);
}