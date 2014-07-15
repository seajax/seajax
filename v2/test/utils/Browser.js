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

function BrowserTestSuite() {

    this.name = "Browser";
    this.tag = "utils";

    function BrowserProps(ua, name, version, engine, engineVersion) {
        this.ua = ua;
        this.name = name;
        this.version = version;
        this.engine = engine;
        this.engineVersion = engineVersion;
    }

    // for convenience, shorter names for constants
    var TRIDENT = Seadragon2.Browser.TRIDENT,
    GECKO = Seadragon2.Browser.GECKO,
    WEBKIT = Seadragon2.Browser.WEBKIT,
    PRESTO = Seadragon2.Browser.PRESTO,
    IE = Seadragon2.Browser.IE,
    FIREFOX = Seadragon2.Browser.FIREFOX,
    SAFARI = Seadragon2.Browser.SAFARI,
    CHROME = Seadragon2.Browser.CHROME,
    OPERA = Seadragon2.Browser.OPERA;

    // Known user agent strings
    var BROWSERS = [
    /* IE */
    new BrowserProps(   // minimal IE8 UA, from http://blogs.msdn.com/ie/archive/2009/01/09/the-internet-explorer-8-user-agent-string-updated-edition.aspx
        'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)',
        IE, 8.0, TRIDENT, 4),
    new BrowserProps(   // my own IE8 UA, lots of extra crap in it
        'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1; Trident/4.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; InfoPath.2; OfficeLiveConnector.1.3; OfficeLivePatch.0.0; Zune 3.0)',
        IE, 8.0, TRIDENT, 4),
    new BrowserProps(   // minimal IE8-in-compat-mode UA, from same IEBlog link above
        'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0; Trident/4.0)',
        IE, 7.0, TRIDENT, 4),
    new BrowserProps(   // my own IE8-in-compat-mode UA
        'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.1; Trident/4.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; InfoPath.2; OfficeLiveConnector.1.3; OfficeLivePatch.0.0; Zune 3.0)',
        IE, 7.0, TRIDENT, 4),
    new BrowserProps(   // minimal IE7 UA
        'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)',
        IE, 7.0, TRIDENT, null),  // Trident wasn't versioned before IE8
    new BrowserProps(   // my own IE8-in-IE7-mode UA
        'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.1; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; InfoPath.2; OfficeLiveConnector.1.3; OfficeLivePatch.0.0; Zune 3.0)',
        IE, 7.0, TRIDENT, null),
    new BrowserProps(   // minimal IE6.1 string
        'Mozilla/4.0 (compatible; MSIE 6.1; Windows XP)',
        IE, 6.1, TRIDENT, null),
    /* FIREFOX */
    new BrowserProps(   // minimal FF3.5 UA
        'Mozilla/5.0 (Windows; U; Windows NT 6.0; en-US; rv:1.9.0.12) Gecko/2009070611 Firefox/3.5.12',
        FIREFOX, "3.5.12", GECKO, "1.9.0.12"),
    new BrowserProps(   // my own FF3.5 UA
        'Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US; rv:1.9.1.2) Gecko/20090729 Firefox/3.5.2 (.NET CLR 3.5.30729)',
        FIREFOX, "3.5.2", GECKO, "1.9.1.2"),
    /* SAFARI */
    new BrowserProps(   // minimal Safari 4 UA
        'Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US) AppleWebKit/532+ (KHTML, like Gecko) Version/4.0.2 Safari/530.19.1',
        SAFARI, "4.0.2", WEBKIT, "530.19.1"),   // note that AppleWebKit version and Safari version are different! Use Safari, it's more detailed.
    new BrowserProps(   // my own Safari 4 UA
        'Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US) AppleWebKit/531.9 (KHTML, like Gecko) Version/4.0.3 Safari/531.9.1',
        SAFARI, "4.0.3", WEBKIT, "531.9.1"),
    /* CHROME */
    new BrowserProps(   // my own Chrome 2 UA
        'Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US) AppleWebKit/530.5 (KHTML, like Gecko) Chrome/2.0.172.43 Safari/530.5',
        CHROME, "2.0.172.43", WEBKIT, "530.5")
    ];

    this.parseUserAgent = function () {

        function verify(expProps) {
            // NOTE: this relies on a private method that's not exposed publicly!
            var props = SDBrowser_parseUserAgent(expProps.ua);
            expectEqual(props.name, expProps.name);
            expectEqual(props.version, expProps.version);
            expectEqual(props.engine, expProps.engine);
            expectEqual(props.engineVersion, expProps.engineVersion);
        };

        for (var i = 0; i < BROWSERS.length; i++) {
            var browser = BROWSERS[i];
            verify(browser);
        }
    }

    this.viaUser = function () {
        var browser = Seadragon2.Browser;
        expectTrue(window.confirm([
        "You're running ", browser.name, " ", browser.version, ". Is that correct?"
        ].join('')));
    }

    // don't run this test by default as it requires user input
    this.viaUser.priority = 1;
}

runner.addSuite(new BrowserTestSuite());
