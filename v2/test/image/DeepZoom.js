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

function DeepZoomTestSuite() {

    this.name = "DeepZoom";
    this.tag = "image";

    this.getTilesUrl = function (url, exp) {

        function verify(url, exp) {
            expectEqual(Seadragon2.DeepZoom.getTilesUrl(url), exp, "tiles URL for " + url);
        }

        verify("foo.dzi", "foo_files/");
        verify("foo.dzc", "foo_files/");
        verify("foo.xml", "foo_files/");
        verify("../foo.xml", "../foo_files/");
        verify("foo-bar.xml", "foo-bar_files/");
        verify("foo_bar.xml", "foo_bar_files/");
        verify("foo.bar.xml", "foo.bar_files/");
        verify("../foo.bar.xml", "../foo.bar_files/");
        verify("http://example.com/foo.xml", "http://example.com/foo_files/");
        verify("http://example.com/path/foo.xml", "http://example.com/path/foo_files/");
        verify("http://example.com/path/to/foo.bar.xml", "http://example.com/path/to/foo.bar_files/");
        verify("http://example.com/path/to/../foo.bar.xml", "http://example.com/path/to/../foo.bar_files/");
    }
}

runner.addSuite(new DeepZoomTestSuite());
