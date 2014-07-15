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

/*global Seadragon2, makeElement, addText, PivotDate_chooseDateScale, PivotDate_generateBuckets*/

// This is a UI control for picking date ranges to filter by.
// It is also an EventManager, which raises the event:
// filter : function (facetName, values)

var PivotDatePicker = function (optionsDiv, items, facetName, currentFilterValues) {
    var min = Infinity, // the earliest date in the set of items
        max = -Infinity, // the latest date in the set of items
        scale, // the size of date span to use (see Date.js for enum values)
        label, // an HTML element containing status messages
        self = this, // a reference to this object
        buckets, // the filtering buckets for the default time scale
        moreBuckets, // the filtering buckets for the next more specific scale (e.g. months instead of years)
        allBuckets, // an array containing both of the previous
        list; // an HTML ul element containing all of the filtering options

    currentFilterValues = currentFilterValues || [];

    // inherit from EventManager
    Seadragon2.EventManager.call(self);

    // calculate max and min
    items.forEach(function (item) {
        var facetValues = item.facets[facetName];
        if (facetValues) {
            facetValues.forEach(function (value) {
                if (value > max) {
                    max = value;
                }
                if (value < min) {
                    min = value;
                }
            });
        }
    });

    if (min === Infinity) {
        // none of the items have this facet set
        label = makeElement("div", "pivot_numberlabel", optionsDiv);
        addText(label, "Not Currently Applicable");
        return this;
    }

    // figure out what scale of time to use for filtering
    scale = PivotDate_chooseDateScale(min, max);

    // generate buckets
    buckets = PivotDate_generateBuckets(min, max, scale);
    moreBuckets = PivotDate_generateBuckets(min, max, scale - 1);
    allBuckets = buckets.concat(moreBuckets);

    // count the number of results for each range
    allBuckets.forEach(function (bucket) {
        bucket.count = 0;
    });
    items.forEach(function (item) {
        var facetValues = item.facets[facetName];
        if (facetValues) {
            facetValues.forEach(function (value) {
                allBuckets.forEach(function (bucket) {
                    if (value >= bucket.lowerBound && value < bucket.upperBound) {
                        bucket.count++;
                    }
                });
            });
        }
    });

    // handle a click on a checkbox
    function onFacetValueCheckboxClicked(e) {
        var target = e.target;
        if (target.checked) {
            // add the filter
            currentFilterValues.push(target.filterInfo);
            self.trigger("filter", facetName, currentFilterValues);
        } else {
            // remove the filter
            currentFilterValues.splice(currentFilterValues.indexOf(target.filterInfo), 1);
            self.trigger("filter", facetName, currentFilterValues.length ? currentFilterValues : undefined);
        }
    }

    // handle a click on a label
    function onFacetValueNameClicked(e) {
        var bucket = e.target.filterInfo;

        // uncheck all boxes that were already checked
        currentFilterValues.forEach(function (bucket) {
            bucket.checkBox.checked = false;
        });

        // check the new box
        bucket.checkBox.checked = true;

        // set only the new filter
        currentFilterValues = [bucket];
        self.trigger("filter", facetName, currentFilterValues);
    }

    // this function will add UI selection elements for the given range.
    // similar to the setup steps for string facets.
    function makeBucketUI(bucket) {
        var facetOption,
            checkBox,
            outerLabel,
            count,
            label;

        facetOption = makeElement("li", null, list);
        checkBox = makeElement("input", "pivot pivot_facetcheckbox", facetOption);
        checkBox.setAttribute("type", "checkbox");

        // check whether the current filter has already been applied
        if (currentFilterValues && currentFilterValues.some(function (range, index) {
            if (range.lowerBound.getTime() === bucket.lowerBound.getTime() &&
                    range.upperBound.getTime() === bucket.upperBound.getTime()) {
                currentFilterValues[index] = bucket;
                return true;
            }
            return false;
        })) {
            checkBox.checked = true;
        }

        // keep a reference to the checkbox that we can easily get to without DOM traversals
        bucket.checkBox = checkBox;

        checkBox.onclick = onFacetValueCheckboxClicked;
        outerLabel = makeElement("div", "pivot_outerlabel", facetOption);
        outerLabel.onclick = onFacetValueNameClicked;
        count = makeElement("div", "pivot_facetcount", outerLabel);
        addText(count, bucket.count);
        label = makeElement("div", "pivot_facetlabel", outerLabel);
        addText(label, bucket.label);
        facetOption.title = bucket.label;

        // any of the UI elements we just created should be able to easily reference
        // the range they represent
        label.filterInfo = count.filterInfo = checkBox.filterInfo = outerLabel.filterInfo = bucket;
    }

    // make some HTML
    list = makeElement("ul", "pivot", optionsDiv);
    buckets.forEach(makeBucketUI);
    makeElement("li", "pivot_horizbar", list);
    moreBuckets.forEach(makeBucketUI);
};
