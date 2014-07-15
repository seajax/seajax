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

/*global Seadragon2, PivotNumber_format, makeElement*/

var templateRegex = /<\?(?:\??[^>]+)*\?>/g,

    makeTemplate = function (template, item, parent) {
        var result,
            inputString = template.template,
            outputChunks = [],
            outputString,
            lastIndex = 0,
            curIndex,
            matchString,
            matchLength,
            evalResult,
            type = template.type,
            img,
            doPaint;

        if (type === "html" || type === "fakehtml") {
            // we'll be building an HTML element to represent the item.
            // if the optional parent param was passed in, then strip out its innards
            // and use it instead of making a new element.
            if (parent) {
                parent.innerHTML = "";
                result = parent;
            } else {
                result = makeElement("div", "pivot_item");
            }
            result.style.width = template.width + "px";
            // if height is not specified, we assume it's square
            result.style.height = (template.height || template.width) + "px";
        }

        if (type === "canvas") {
            // canvas functions are built not per item, but once for all items.

            // new Function()?! Why must we do this?
            // Whoever builds the templates for this collection is allowed to specify functions
            // to draw on canvas, since that can often out-perform HTML rendering and animation.
            // They could be provided in a format like JSON, as strings. As noted elsewhere,
            // the template author must already be a trusted entity because we're including
            // arbitrary HTML from them, so they are allowed to run scripts on the client.
            result = typeof inputString === "function" ?
                inputString :
                new Function("ctx", "x", "y", "w", "h", "item", inputString);
        } else {
            while (!!(matchString = templateRegex.exec(inputString))) {
                matchString = matchString[0];
                curIndex = templateRegex.lastIndex; // the index right after the current match
                matchLength = matchString.length;

                // add any text that doesn't need modification
                outputChunks.push(inputString.substring(lastIndex, curIndex - matchLength));

                // strip off the custom text delimiters
                matchString = matchString.substring(2, matchLength - 2);

                // modify the custom text
                try {

                    // Oh no, it's a with statement! Why must we do this?
                    // Because of minification. We want developers to be able to easily write templates
                    // with easily readable properties like <?name?>, but we can't declare those as variables
                    // because they'll be minified.
                    // Any properly written template will NOT modify any external variables (although they can
                    // define temporary variables -- that's why we execute it inside a new scope), so the
                    // with statement should be relatively harmless.

                    // Oh no, it's an eval function! Why must we do this?
                    // First, it is not a security concern. Whoever supplies the HTML template already
                    // has an opportunity to run arbitrary script client-side by including <script> tags,
                    // onmouseover functions, etc., so the template provider must be trusted by the
                    // application regardless of how we do this template-filling step.
                    // Second, the template is provided as a string, which could be part of a JSON object
                    // or similar.
                    // Third, using eval (as opposed to inventing custom binding syntax) keeps the template verbosity
                    // to a minimum while giving the template writer the expressiveness to do interesting
                    // things with the data (beyond just outputting facets in their default representation).
                    // For instance, the reduce function on an array could be used to display all facet values
                    // in a variety of ways.
                    (function () {
                        with (item) {
                            evalResult = eval(matchString);
                        }
                    }());

                    // transform the result to a string, if it isn't already
                    // TODO this should take facet formatting rules into account
                    if (typeof evalResult === "number") {
                        evalResult = PivotNumber_format(evalResult);
                    } else if (evalResult instanceof Date) {
                        evalResult = evalResult.toLocaleString();
                    }

                    // push the string onto the result
                    outputChunks.push(evalResult);
                } catch (e) {
                    // probably no big deal. it may have been trying to access a facet that's not set or something.
                    Seadragon2.Debug.warn("Error caught in filling template: " + e.message || e);
                }

                lastIndex = curIndex;
            }

            // pick up any text left after the last match
            outputChunks.push(inputString.substring(lastIndex, inputString.length));

            // put it all together in a string
            outputString = outputChunks.join("");

            if (type === "html" || type === "fakehtml") {
                // return an HTML element whose inner HTML is based on the provided template.
                result.unsetHTML = outputChunks.join("");
            } else if (type === "color") {
                // return a function that paints a colored rectangle.
                result = function (ctx, x, y, width, height) {
                    ctx.fillStyle = outputString;
                    ctx.fillRect(x, y, width, height);
                    return true;
                };
            } else if (type === "img") {
                // return a function that draws an image, specified by URL.
                img = makeElement("img");
                img.onload = function () {
                    doPaint = true;
                };
                img.unsetSrc = outputString;
                result = function (ctx, x, y, width, height) {
                    var unsetSrc = img.unsetSrc;
                    if (unsetSrc) {
                        img.src = img.unsetSrc;
                        delete img.unsetSrc;
                    }
                    if (doPaint) {
                        ctx.drawImage(img, x, y, width, height);
                    }
                    return doPaint;
                };
            }
        }

        return result;
    };