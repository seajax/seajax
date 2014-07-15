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

/*global runner: true */

function Runner() {

    function getUrlParam(name) {
        var queryRegExp = new RegExp('[\\?&]' + name + '=([^&#]*)'),
            regExpMatches = queryRegExp.exec(window.location.href);
        if (regExpMatches === null) {
            return "";
        }
        else {
            return regExpMatches[1];
        }
    }

    var
        // IE/Chrome supports elem.innerText, but FF supports textContent
        hasInnerText,

        // Configuration stored for report
        config = {},

        // Temporary array of suite names, gets populated on prepare, gets drained on run
        suiteNames = [],

        // Test suites by name
        suites = {},

        // Tags that have been registered by suites as they get added
        tagsAvailable = {},

        // bool configuration variable which can prevent actual test runs
        // helpful for viewing everything without waiting for test runs
        run = (function () {
            var p = getUrlParam("run");
            return (p === "0" || p === "no" || p === "false") ? false : true;
        }()),

        // regex filter against test path for selecting tests (default empty)
        filter = getUrlParam("filter"),

        // selected priority for this run (default 0)
        priority = (function () {
            var p = getUrlParam("priority"),
                n = parseInt(p, 10);
            return isNaN(n) ? 0 : n;
        }()),

        // tags selected for this run (default empty)
        tagsSelected = (function () {
            var t = { count: 0 },
                names = getUrlParam("tags").split(','),
                i;
            for (i = 0; i < names.length && names[i].length; i++) {
                if (!t[names[i]]) {
                    t[names[i]] = true;
                    t.count += 1;
                }
            }
            return t;
        }()),

        // build a string of just raw selected tags
        tagsSelectedString = (function () {
            var names = [],
                text = "",
                t;
            for (t in tagsSelected) {
                if (t !== 'count') {
                    names.push(t);
                }
            }
            if (names.length > 0) {
                names.sort();
                text = names.toString();
            }
            return text;
        }());

        reportTo = (function () {
            var url = getUrlParam("reportTo");
            return url;
        } ());

    // Register a test suite.  Each suite is responsible for registering itself.
    this.addSuite = function (obj) {
        if (typeof suites[obj.name] === 'undefined') {
            suites[obj.name] = {
                name: obj.name,
                tests: [],
                defined: 0,
                selected: 0,
                completed: 0,
                passed: 0
            };
        }
        if (obj.tag) {
            suites[obj.name].tag = obj.tag;
            tagsAvailable[obj.tag] = true;
        }
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop) && typeof obj[prop] === 'function') {
                suites[obj.name].tests.push({
                    name: prop,
                    path: obj.name + "_" + prop,
                    test: obj[prop]
                });

                if (prop.tag) {
                    tagsAvailable[prop.tag] = true;
                }
            }
        }
    };

    // Helper function to set element text across browsers
    function setTextContent(elem, text) {
        if (typeof hasInnerText === 'undefined') {
            hasInnerText = (document.getElementsByTagName("body")[0].innerText !== undefined) ? true : false;
        }
        if (!hasInnerText) {
            elem.textContent = text;
        } else {
            elem.innerText = text;
        }
    }

    // Helper to display configuration key/value on page
    function addConfigItem(name, value) {
        var elem = document.createElement("p");
        if (typeof value === 'string' && !value) {
            value = "";
        }
        setTextContent(elem, name + " = " + value.toString());
        document.getElementById("config-listing").appendChild(elem);
        config[name] = value;
    }

    function getAvailableTagString() {
        var i = 0, s, t;
        for (t in tagsAvailable) {
            if (tagsAvailable.hasOwnProperty(t)) {
                s = (i === 0) ? t : s + ", " + t;
                i += 1;
            }
        }
        return s;
    }

    // Helper to sort functions by path
    function compareTests(a, b) {
        if (a.path < b.path) {
            return -1;
        }
        if (a.path > b.path) {
            return 1;
        }
        return 0;
    }

    // Helper to update suite header
    function updateSuiteHeader(elem, suite) {
        setTextContent(elem, suite.name + " (" +
            suite.defined.toString() + " defined, " +
            suite.selected.toString() + " selected, " +
            suite.completed.toString() + " completed, " +
            suite.passed.toString() + " passed)");
    }

    // Helper to update test summary section
    function setSummary() {
        var elem,
            sum = {
            suites: { defined: 0, selected: 0, completed: 0, passed: 0 },
            tests: { defined: 0, selected: 0, completed: 0, passed: 0 }
        };

        for (var s in suites) {
            if (suites.hasOwnProperty(s)) {
                var suite = suites[s];
                sum.tests.defined += suite.tests.length;
                var selected = false, completed = false, passed = true;
                for (var t in suite.tests) {
                    if (suite.tests.hasOwnProperty(t)) {
                        if (suite.tests[t].selected) {
                            sum.tests.selected += 1;
                            selected = true;
                        }
                        if (suite.tests[t].completed) {
                            sum.tests.completed += 1;
                            completed = true;
                        }
                        if (suite.tests[t].passed) {
                            sum.tests.passed += 1;
                        } else {
                            passed = false;
                        }
                    }
                }
                sum.suites.defined += 1;
                sum.suites.selected += (selected) ? 1 : 0;
                sum.suites.completed += (completed) ? 1 : 0;
                sum.suites.passed += (passed) ? 1 : 0;
            }
        }

        elem = document.getElementById("num-suites-defined");
        setTextContent(elem, sum.suites.defined.toString());

        elem = document.getElementById("num-suites-selected");
        setTextContent(elem, sum.suites.selected.toString());

        elem = document.getElementById("num-suites-completed");
        setTextContent(elem, sum.suites.completed.toString());

        elem = document.getElementById("num-suites-passed");
        setTextContent(elem, sum.suites.passed.toString());

        elem = document.getElementById("num-tests-defined");
        setTextContent(elem, sum.tests.defined.toString());

        elem = document.getElementById("num-tests-selected");
        setTextContent(elem, sum.tests.selected.toString());

        elem = document.getElementById("num-tests-completed");
        setTextContent(elem, sum.tests.completed.toString());

        elem = document.getElementById("num-tests-passed");
        setTextContent(elem, sum.tests.passed.toString());

        elem = document.getElementById("pct-tests-selected");
        setTextContent(elem, (sum.tests.defined > 0) ?
            Math.round((sum.tests.selected * 100 / sum.tests.defined)).toString() + "%" : "0%");
        elem.className = (sum.tests.selected === sum.tests.defined) ? "passed" : "warning";

        elem = document.getElementById("pct-tests-completed");
        setTextContent(elem, (sum.tests.completed > 0) ?
            Math.round((sum.tests.completed * 100 / sum.tests.selected)).toString() + "%" : "0%");
        elem.className = (sum.tests.completed === sum.tests.selected) ? "passed" : "warning";

        elem = document.getElementById("pct-tests-pass");
        setTextContent(elem, (sum.tests.selected > 0) ?
            Math.round((sum.tests.passed * 100 / sum.tests.selected)).toString() + "%" : "0%");
        elem.className = (sum.tests.passed === sum.tests.selected) ? "passed" : "failed";
    }

    // Completely setup page in preparation for running tests one by one
    function preparePage() {

        addConfigItem("run", (run) ? "yes" : "no");
        addConfigItem("filter", filter);
        addConfigItem("priority", priority);
        addConfigItem("tags", tagsSelectedString);
        addConfigItem("tags available", getAvailableTagString());

        var pathRegex = new RegExp(filter);

        suiteNames = [];
        for (var s in suites) {
            if (suites.hasOwnProperty(s)) {
                suiteNames.push(s);
            }
        }
        suiteNames.sort();

        for (s = 0; s < suiteNames.length; s++) {
            var suite = suites[suiteNames[s]];

            var divSelectedSuite = document.createElement("div");
            var divUnselectedSuite = document.createElement("div");
            divSelectedSuite.className = divUnselectedSuite.className = "suite";

            var hSelectedSuite = document.createElement("h3");
            var hUnselectedSuite = document.createElement("h3");
            hSelectedSuite.id = suite.name;
            setTextContent(hSelectedSuite, suite.name);
            setTextContent(hUnselectedSuite, suite.name);

            var divSelectedTests = document.createElement("div");
            var divUnselectedTests = document.createElement("div");
            divSelectedTests.className = divUnselectedTests.className = "tests";

            suite.tests.sort(compareTests);
            suite.defined = suite.tests.length;
            suite.selected = suite.completed = suite.passed = 0;

            for (var t in suite.tests) {
                if (suite.tests.hasOwnProperty(t)) {
                    var test = suite.tests[t];
                    var tag = test.tag || suite.tag;
                    var testPri = test.test.priority || 0;
                    var testLineElem;

                    if ((filter.length === 0 || (filter.length && pathRegex.exec(test.path))) &&
                    (testPri <= priority) &&
                    (tagsSelected.count === 0 || tagsSelected[tag])) {
                        test.selected = true;
                        suite.selected += 1;

                        testLineElem = document.createElement("p");
                        testLineElem.id = test.path;
                        setTextContent(testLineElem, test.name);
                        divSelectedTests.appendChild(testLineElem);
                    }
                    else {
                        test.selected = false;

                        testLineElem = document.createElement("p");
                        testLineElem.id = test.path;
                        setTextContent(testLineElem, test.name);
                        divUnselectedTests.appendChild(testLineElem);
                    }

                    test.completed = test.passed = false;
                }
            }

            suite.nextTest = 0;

            if (suite.selected > 0) {
                document.getElementById("selected-listing").appendChild(divSelectedSuite);
                divSelectedSuite.appendChild(hSelectedSuite);
                divSelectedSuite.appendChild(divSelectedTests);
            }

            if (suite.selected < suite.defined) {
                document.getElementById("unselected-listing").appendChild(divUnselectedSuite);
                divUnselectedSuite.appendChild(hUnselectedSuite);
                divUnselectedSuite.appendChild(divUnselectedTests);
            }

            updateSuiteHeader(hSelectedSuite, suite);
        }

        setSummary();
    }

    // The main entry point for page body
    this.go = function () {
        preparePage();
        if (run) {
            setTimeout(runner.runNextTest, 0);
        }
    };

    function complete() {

        if (reportTo.length) {
            // remove undesired properties for report
            delete config["run"];
            for (var suite in suites) {
                delete suites[suite].name;
                delete suites[suite].defined;
                delete suites[suite].selected;
                delete suites[suite].completed;
                delete suites[suite].passed;
                delete suites[suite].nextTest;
            }

            // generate JSON report
            var report = { report: { config: config, suites: suites} };
            var json = JSON.stringify(report, null);

            var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Msxml2.XMLHTTP");
            var url = reportTo;
            xhr.open("POST", url, true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    e = document.createElement("p");
                    if (xhr.status === 200) {
                        setTextContent(e, "Report sent to " + url);
                        e.className = "passed";
                    } else {
                        setTextContent(e, "Failed to send report to " + url + ", status " + xhr.status);
                        e.className = "failed";
                    }
                    document.getElementById("config-listing").appendChild(e);
                }
            };
            xhr.send(json);
        }
    }

    // Run the next selected test
    this.runNextTest = function () {
        var suite = suites[suiteNames[0]];
        if (suite.nextTest >= suite.tests.length) {
            suiteNames.shift();
            if (suiteNames.length === 0) {
                complete();
                return;
            }
            suite = suites[suiteNames[0]];
            suite.nextTest = 0;
        }

        var test = suite.tests[suite.nextTest];
        var testElem = document.getElementById(test.path);

        if (test.selected) {
            test.completed = true;
            suite.completed += 1;
            try {
                test.test();
                testElem.className = "passed";
                setTextContent(testElem, test.name);
                test.passed = true;
                suite.passed += 1;
            } catch (e) {
                testElem.className = "failed";
                setTextContent(testElem, test.name + " " + e.message);
                test.passed = false;

                var elem = document.createElement("p");
                elem.className = "failed";
                setTextContent(elem, test.path + " " + e.message);
                document.getElementById("fail-list").appendChild(elem);
            }
        }

        var suiteElem = document.getElementById(suite.name);
        if (suiteElem) {
            updateSuiteHeader(suiteElem, suite);
        }

        setSummary();

        suite.nextTest += 1;
        setTimeout(runner.runNextTest, 0);
    };
}

runner = new Runner();
