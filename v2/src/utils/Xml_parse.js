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

// Xml_parse.js
// Defines the Seadragon2.Xml.parse() method.

/*global SD, SDXml, SDDebug_error, SDFunction_EMPTY, DOMParser, ActiveXObject */
/*jshint strict: false */

var

    /**
     *  If the browser supports XML, parses the given XML string and returns the
     *  resulting XML Document object. If the browser does not support XML, or if
     *  the given XML string is not well-formed XML, returns null.
     *  @method parse
     *  @static
     *  @param {string} xml The XML string to parse.
     *  @return {XML Document} The resulting XML Document object if the browser
     *  supports XML and the XML was successfully parsed, otherwise null.
     */
    SDXml_parse = SDXml.parse = (function () {
        
        // using a closure so that we do the cross-browser (i.e. IE) checks
        // only and exactly once instead of on every call to this method.
        
        // parsing is very different across browsers (i.e. IE), so returning
        // entirely different functions depending on the browser.
        
        // case 1: W3C DOMParser object
        if (typeof DOMParser !== "undefined") {
            return function (xml) {
                var parser = new DOMParser(),
                    xmlDoc = parser.parseFromString(xml, "text/xml"),
                    xmlRoot = xmlDoc && xmlDoc.documentElement;
                
                // may still silently parse even if not well-formed, but the
                // parsed XML will be <parsererror> XML.
                if (!xmlRoot || xmlRoot.nodeName === "parsererror") {
                    return null;
                }
                
                return xmlDoc;
            };
        }
        
        // case 2: IE ActiveX object
        else if (typeof ActiveXObject !== "undefined") {
            return function (xml) {
                var xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                
                xmlDoc.async = false;
                
                // the loadXML() function returns true if successfully parsed,
                // otherwise false, e.g. not well-formed.
                return xmlDoc.loadXML(xml) && xmlDoc;
            };
        }
        
        // case 3: browser doesn't support parsing XML!
        // return empty function that does no parsing
        SDDebug_error("Seadragon2.Xml: no parsing ability.");
        return SDFunction_EMPTY;
        
    }());
