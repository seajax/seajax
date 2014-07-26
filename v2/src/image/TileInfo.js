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

// TileInfo.js
// Defines the Seadragon2.TileInfo class.

/*global SD, SDRect_$ */
/*jshint strict: false */

var

    /**
     *  Represents the identifying information for an image tile.
     *  @class TileInfo
     *  @namespace Seadragon2
     *  @private
     *  @constructor
     *  @param {string} url The URL of the tile. This can be absolute or relative to
     *  the page.
     *  @param {Rect} crop (optional) The cropping rect of the tile, relative to the image's
     *  natural size.
     */
    SDTileInfo = SD.TileInfo = function (url, crop) {

        /**
         *  The URL of the tile.
         *  @property url
         *  @type string
         */
	    this.url = url;

        /**
         *  The cropping rect of the tile, relative to the image's natural size.
         *  @property crop
         *  @type Rect
         */
	    this.crop = crop ? SDRect_$(crop) : null;
	},

    /**
     *  Returns a TileInfo instance representing the given {url,crop} object
     *  literal. If the object is already a TileInfo instance, the same instance is
     *  returned.
     *  @method $
     *  @static
     *  @param {object} obj An {url,crop} object literal representing a tile info.
     *  @return {TileInfo} A TileInfo instance representing the given object
     *  literal.
     */
    /**
     *  Returns a TileInfo instance for the given URL. The tile needs no cropping.
     *  @method $&nbsp;
     *  @static
     *  @param {string} url The URL of the tile.
     *  @return {TileInfo} A TileInfo instance representing the tile at the given
     *  URL. The tile needs no cropping.
     */
    SDTileInfo_$ = SDTileInfo.$ = function (obj) {
	    if (obj instanceof SDTileInfo) {
	        return obj;
	    } else if (typeof obj === "string") {
	        return new SDTileInfo(obj, null);
	    }
	
	    return new SDTileInfo(obj.url, obj.crop);
	};
