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

function UriTestSuite() {

    this.name = "Uri";
    this.tag = "utils";

    // convenience names
    var LOCALHOST = SDUri_FILE_HOSTNAME,
    PAGE_HOSTNAME = SDUri_PAGE_HOSTNAME;

    // this function was tested manually
    function randomlyCapitalize(str) {
        return str.replace(/\w/g, function (letter) {
            return Math.random() < 0.5 ? letter.toUpperCase() : letter.toLowerCase();
        });
    }

    function verifyHostname(url, expHostname) {
        var hostname = SDUri_getHostname(url);
        expectTypeof(hostname, "string");
        expectEqual(hostname, expHostname || PAGE_HOSTNAME);
    };

    this.hostname = function () {

        function verify(url, expHostname) {
            verifyHostname(url, expHostname);
        };

        // Testing hostname edge cases...
        verify("");   // assuming an empty URL is legal
        verify(".");
        verify("./");
        verify("..");
        verify("../");
        verify("/");
        verify("/.");
        verify("/..");
        verify("/../.");

        // Testing hostname for relative URLs...
        verify("foo.jpg");
        verify("../foo.jpg");
        verify("images/foo.jpg");
        verify("../images/foo.jpg");
        verify("images/foo/../bar/");
        verify("../../images/foo/bar/");
        verify("/images/foo/bar.jpg");
        verify("/images/foo/../bar/image.jpg");
        verify("www.example.com/foo/bar/");   // examples of incorrectly relative URLs
        verify("foo.bar.org/images/../../image.jpg");

        // Testing hostname for absolute URLs...
        verify("http://example.com/", "example.com");
        verify("http://example.com:80/", "example.com");      // port numbers...
        verify("http://example.com:9999/", "example.com");    // shouldn't matter!
        verify("http://sub.example.com/", "sub.example.com");
        verify("http://foo.bar.baz.example.com/", "foo.bar.baz.example.com");
        verify("http://example.com/foo/bar/baz/", "example.com");
        verify("http://example.com/foo/bar/baz.jpg", "example.com");
        verify("http://foo.bar.example.com/baz/image.jpg", "foo.bar.example.com");
        verify("http://t2.tiles.virtualearth.net/tiles/h02123012?g=282", "t2.tiles.virtualearth.net");
        verify("http://t0.tiles.virtualearth.net/tiles/r02123010?g=282&shading=hill", "t0.tiles.virtualearth.net");

        // Testing hostname for file:// URLs...
        verify("file:///C:/", LOCALHOST);
        verify("file:///C:/Windows/", LOCALHOST);
        verify("file:///C:/Windows/System32/mshtml.dll", LOCALHOST);
        verify("file:///Users/", LOCALHOST);
        verify("file:///Users/me/", LOCALHOST);
        verify("file:///Users/me/Sites/index.html", LOCALHOST);

        // Testing hostname for https:// URLs...
        verify("https://sub.example.com/", "sub.example.com");
        verify("https://foo.bar.baz.example.com/", "foo.bar.baz.example.com");
        verify("https://example.com/foo/bar/baz/", "example.com");
        verify("https://example.com/foo/bar/baz.jpg", "example.com");
    }

    this.hostnameCaps = function () {

        function verify(url, expHostname) {
            // hostname should remain all lowercase
            verifyHostname(randomlyCapitalize(url), expHostname);
        };

        // Testing hostname random capitalizations...
        // all of these examples are taken from test cases above, but are now being
        // randomly capitalized, letter by letter...
        verify("http://foo.bar.example.com/baz/image.jpg", "foo.bar.example.com");
        verify("https://t2.tiles.virtualearth.net/tiles/h02123012?g=282", "t2.tiles.virtualearth.net");
        verify("images/foo/../bar/");
        verify("/images/foo/../bar/image.jpg");
        verify("www.example.com/foo/bar/");
        verify("file:///C:/Windows/System32/mshtml.dll", LOCALHOST);
        verify("file:///Users/me/Sites/index.html", LOCALHOST);
    }
}

runner.addSuite(new UriTestSuite());
