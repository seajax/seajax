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

// For helping with Date facet types in the Pivot app.
// Currently only supports en-us.
var PivotDate_getHalfMonth = function (month) {
        return month === 1 ? 15 : 16;
    },
    
    PivotDate_months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ],
    
    PivotDate_minScale = -9,

    // choose the granularity for bucketing by dates. return value will be an integer:
    // if positive, it is an integer n where buckets should be 10^n years; otherwise,
    // -1 : month
    // -2 : half-month
    // -3 : day
    // -4 : half-day
    // -5 : hour
    // -6 : 15 minutes
    // -7 : minute
    // -8 : 5 seconds
    // -9 : second
    // TODO localization and such
    PivotDate_chooseDateScale = function (min, max) {
        var difference,
            upper,
            lower,
            month,
            threshold;
        difference = max.getFullYear() - min.getFullYear();
        if (difference) {
            // it'll be by year, we just have to decide how many of them
            return Math.floor(Math.log(difference) / Math.LN10);
        }
        month = max.getMonth();
        if (month > min.getMonth()) {
            return -1;
        }
        upper = max.getDate();
        lower = min.getDate();
        threshold = PivotDate_getHalfMonth(month);
        if (lower < threshold && upper >= threshold) {
            return -2;
        }
        if (upper > lower) {
            return -3;
        }
        difference = max.getHours() - min.getHours();
        if (difference >= 12) {
            return -4;
        }
        if (difference) {
            return -5;
        }
        difference = max.getMinutes() - min.getMinutes();
        if (difference >= 15) {
            return -6;
        }
        if (difference) {
            return -7;
        }
        difference = max.getSeconds() - min.getSeconds();
        if (difference >= 5) {
            return -8;
        }
        return -9;
    },
    
    PivotDate_generateBuckets = function (min, max, scale) {
        if (!(min <= max) || scale < PivotDate_minScale) {
            // nothing we can do here
            return [];
        }
        if (scale === undefined) {
            scale = PivotDate_chooseDateScale(min, max);
        }
        if (scale >= 0) {
            scale = Math.pow(10, scale);
        }
        var year = min.getFullYear(),
            month = 0,
            date = 1,
            hours = 0,
            minutes = 0,
            seconds = 0,
            milliseconds = 0,
            threshold,
            stepFunction,
            buckets,
            i,
            lowerBound,
            upperBound,
            bucket,
            labelFunction,
            lastBigChange;
            
        // shift the minimum to a nice boundary, based on the scale we chose
        switch (scale) {
            case -9:
            case -8:
                seconds = min.getSeconds();
            case -7:
            case -6:
                minutes = min.getMinutes();
            case -5:
            case -4:
                hours = min.getHours();
            case -3:
            case -2:
                date = min.getDate();
            case -1:
                month = min.getMonth();
                break;
            default:
                year = Math.floor(year / scale) * scale;
        }
        switch (scale) {
            case -8:
                seconds = Math.floor(seconds / 5) * 5;
                break;
            case -6:
                minutes = Math.floor(minutes / 15) * 15;
                break;
            case -4:
                hours = Math.floor(hours / 12) * 12;
                break;
            case -2:
                threshold = PivotDate_getHalfMonth(month);
                date = date >= threshold ? threshold : 1;
                break;
            default:
                // no adjustment necessary
        }
        min = new Date(year, month, date, hours, minutes, seconds, milliseconds);

        // generate increment function depending on step size.
        switch (scale) {
            case -9:
                stepFunction = function (i) { return new Date(year, month, date, hours, minutes, seconds + i, 0); };
                break;
            case -8:
                stepFunction = function (i) { return new Date(year, month, date, hours, minutes, seconds + i * 5, 0); };
                break;
            case -7:
                stepFunction = function (i) { return new Date(year, month, date, hours, minutes + i, 0, 0); };
                break;
            case -6:
                stepFunction = function (i) { return new Date(year, month, date, hours, minutes + i * 15, 0, 0); };
                break;
            case -5:
                stepFunction = function (i) { return new Date(year, month, date, hours + i, 0, 0, 0); };
                break;
            case -4:
                stepFunction = function (i) { return new Date(year, month, date, hours + i * 12, 0, 0, 0); };
                break;
            case -3:
                stepFunction = function (i) { return new Date(year, month, date + i, 0, 0, 0, 0); };
                break;
            case -2:
                stepFunction = function (i) {
                    if (date > 1) {
                        i++;
                    }
                    var result = new Date(year, month + Math.floor(i / 2), 1, 0, 0, 0, 0);
                    if (i % 2) {
                        result.setDate(PivotDate_getHalfMonth(result.getMonth()));
                    }
                    return result;
                };
                break;
            case -1:
                stepFunction = function (i) { return new Date(year, month + i, 1, 0, 0, 0, 0); };
                break;
            default:
                stepFunction = function (i) { return new Date(year + i * scale, 0, 1, 0, 0, 0, 0); };
        }
        
        function setLabels(middle, left, right) {
            if (left) {
                middle = left + " to " + right;
                bucket.leftLabel = left;
                bucket.rightLabel = right;
            }
            bucket.label = middle;
        }
        
        // generate function to label the bucket, depending on step size.
        switch (scale) {
            case -9:
            case -8:
            case -7:
            case -6:
            case -5:
            case -4:
                // this function uses left and right labels for the range of each bucket.
                // it only displays the time for most of them, unless it's a new day.
                labelFunction = function () {
                    var newDate = lowerBound.getDate(),
                        leftLabel,
                        rightLabel;
                    if (lastBigChange === newDate) {
                        // just display the time
                        leftLabel = "";
                    } else {
                        leftLabel = lowerBound.toLocaleDateString() + " ";
                        lastBigChange = newDate;
                    }
                    leftLabel += lowerBound.toLocaleTimeString();
                    
                    // and then do basically the same for the upper bound
                    if (lastBigChange === upperBound.getDate()) {
                        rightLabel = "";
                    } else {
                        rightLabel = upperBound.toLocaleDateString() + " ";
                    }
                    rightLabel += upperBound.toLocaleTimeString();
                    setLabels(undefined, leftLabel, rightLabel);
                };
                break;
            case -3:
                // this function displays the date, as a centered label
                labelFunction = function () {
                    setLabels(lowerBound.toLocaleDateString());
                };
                break;
            case -2:
                // this function displays left and right labels with the current date.
                labelFunction = function () {
                    setLabels(undefined, lowerBound.toLocaleDateString(), upperBound.toLocaleDateString());
                };
                break;
            case -1:
                // this function displays only the month and possibly the year, centered.
                // it isn't properly localized.
                labelFunction = function () {
                    var newYear = lowerBound.getFullYear();
                    var label = PivotDate_months[lowerBound.getMonth()];
                    if (lastBigChange !== newYear) {
                        // display the year
                        lastBigChange = newYear;
                        label += " " + newYear;
                    }
                    setLabels(label);
                };
                break;
            case 1:
                // this function displays just the year.
                labelFunction = function () {
                    setLabels(lowerBound.getFullYear());
                };
                break;
            default:
                // this function displays the decade, century, etc., with an "s" on the end.
                labelFunction = function () {
                    setLabels(Math.floor(lowerBound.getFullYear() / scale) * scale + "s");
                };
        }
        
        // generate the bucket array to return
        buckets = [];
        i = 0;
        upperBound = min;
        do {
            i++;
            lowerBound = upperBound;
            upperBound = stepFunction(i);
            bucket = {
                lowerBound: lowerBound,
                upperBound: upperBound,
                items: []
            };
            labelFunction();
            buckets.push(bucket);
        } while (upperBound <= max);
        
        return buckets;
    };