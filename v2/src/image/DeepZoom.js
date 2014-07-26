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

// DeepZoom.js
// Defines the Seadragon2.DeepZoom class.

/*global SD, SDXml_parse, SDDisplayRect, SDRect, SDDziTileSource$, SDDzcTileSource$
 SDNetwork_tryMakeXmlHttpRequest, SDDebug_warn*/
/*jshint strict: false */

var
    
    /**
     * Provides functionality for fetching DZI or DZC tile sources from URLs.
     * @class DeepZoom
     * @namespace Seadragon2
     * @static
     */
    SDDeepZoom = SD.DeepZoom = {},
    
    SDDeepZoom_storedXml = {},
    
    SDDeepZoom_parseDziXml = function (imageNode) {
        var sizeNode = imageNode.getElementsByTagName("Size")[0],
            dispRectNodes = imageNode.getElementsByTagName("DisplayRect"),
        
            dziInfo = {
                width: parseInt(sizeNode.getAttribute("Width"), 10),
                height: parseInt(sizeNode.getAttribute("Height"), 10),
                tileSize: parseInt(imageNode.getAttribute("TileSize"), 10),
                tileOverlap: parseInt(imageNode.getAttribute("Overlap"), 10),
                imageFormat: imageNode.getAttribute("Format"),
                dispRects: []
            },
            i,
            dispRectNode,
            rectNode,
            dispRect;
        
        for (i = 0; i < dispRectNodes.length; i++) {
            dispRectNode = dispRectNodes[i];
            rectNode = dispRectNode.getElementsByTagName("Rect")[0];
            
            dispRect = new SDDisplayRect(
                parseInt(rectNode.getAttribute("X"), 10),
                parseInt(rectNode.getAttribute("Y"), 10),
                parseInt(rectNode.getAttribute("Width"), 10),
                parseInt(rectNode.getAttribute("Height"), 10),
                0,      // MinLevel bug in DZI XML
                parseInt(dispRectNode.getAttribute("MaxLevel"), 10)
            );
            
            dziInfo.dispRects.push(dispRect);
        }
        
        return dziInfo;
    },
    
    SDDeepZoom_parseDzcXml = function (collectionNode) {
        var dzcImageFormat = collectionNode.getAttribute("Format"),
            dzcMaxLevel = parseInt(collectionNode.getAttribute("MaxLevel"), 10),
            dzcTileSize = parseInt(collectionNode.getAttribute("TileSize"), 10),
        
            itemNodes = collectionNode.getElementsByTagName("I"),
            numItems = itemNodes.length,
            itemInfos = new Array(numItems),
            i,
            itemNode,
            sizeNode,
            viewportNodes,
            itemInfo,
            viewportNode,
            viewportWidth;
        
        for (i = 0; i < itemNodes.length; i++) {
            itemNode = itemNodes[i];
            sizeNode = itemNode.getElementsByTagName("Size")[0];
            viewportNodes = itemNode.getElementsByTagName("Viewport");
            
            itemInfo = {
                id: parseInt(itemNode.getAttribute("Id"), 10),
                n: parseInt(itemNode.getAttribute("N"), 10),
                width: parseInt(sizeNode.getAttribute("Width"), 10),
                height: parseInt(sizeNode.getAttribute("Height"), 10),
                source: itemNode.getAttribute("Source"),
                viewport: null,
                dzcTileSize: dzcTileSize,
                dzcMaxLevel: dzcMaxLevel,
                dzcImageFormat: dzcImageFormat
            };
            
            if (viewportNodes.length >= 1) {
                viewportNode = viewportNodes[0];
                viewportWidth = parseFloat(viewportNode.getAttribute("Width"));
                
                itemInfo.viewport = new SDRect(
                    parseFloat(viewportNode.getAttribute("X")),
                    parseFloat(viewportNode.getAttribute("Y")),
                    viewportWidth,
                    viewportWidth * itemInfo.height / itemInfo.width
                );
            }
            
            itemInfos[i] = itemInfo;
        }
        
        return itemInfos;
    },
    
    // Takes either string or XML Document.
    SDDeepZoom_parseXml = function (xml) {
        var root, rootName;
        
        if (typeof xml === "string") {
            xml = SDXml_parse(xml);
        }
        
        if (!xml || !xml.documentElement) {
            return null;
        }
        
        root = xml.documentElement;
        rootName = root.tagName;
        
        if (rootName === "Image") {
            return SDDeepZoom_parseDziXml(root);
        } else if (rootName === "Collection") {
            return SDDeepZoom_parseDzcXml(root);
        }
        
        return null;    // unrecognized root element
    },
    
    SDDeepZoom_getTilesUrl = SDDeepZoom.getTilesUrl = function (xmlUrl) {
        var parts = xmlUrl.split('/'),
            lastI = parts.length - 1,
            filename = parts[lastI],
            lastDotI = filename.lastIndexOf('.');
        
        if (lastDotI > -1) {
            parts[lastI] = filename.slice(0, lastDotI);
        }
        
        return parts.join('/') + "_files/";
    },
    
    SDDeepZoom_getExpansionUrl = function (url, dziSource) {
        return dziSource ?
            url.substr(0, url.lastIndexOf("/")) + "/" + dziSource :
            null;
    },
    
    SDDeepZoom_makeDzcSources = function (info, url, tilesUrl) {
        var i,
            n = info.length,
            result = new Array(n),
            infoItem;
        for (i = 0; i < n; i++) {
            infoItem = info[i];
            infoItem.dzcItemId = infoItem.id;   // bridging the APIs
            infoItem.dzcItemN = infoItem.n;
            infoItem.dzcTilesUrl = tilesUrl;
            infoItem.dzcExpansionUrl = SDDeepZoom_getExpansionUrl(url, infoItem.source);
            result[i] = SDDzcTileSource$(infoItem);
        }
        return result;
    },
    
    SDDeepZoom_infoToTileSource = function (info, url) {
        var tilesUrl = SDDeepZoom_getTilesUrl(url),
            i;
        
        if (info instanceof Array) {
            i = parseInt(url.substring(url.lastIndexOf("#") + 1), 10);
            if (isNaN(i)) {
                // No specific collection item was requested, so return all of them!
                return SDDeepZoom_makeDzcSources(info, url, tilesUrl);
            }
            info = info[i];
            info.dzcItemId = info.id;   // bridging the APIs
            info.dzcItemN = info.n;
            info.dzcTilesUrl = tilesUrl;
            info.dzcExpansionUrl = SDDeepZoom_getExpansionUrl(url, info.source);
            return SDDzcTileSource$(info);
        } else {
            info.tilesUrl = tilesUrl;
            return SDDziTileSource$(info);
        }
    },
    
    SDDeepZoom_getTileSource = function (url, xml) {
        var info = SDDeepZoom_parseXml(xml);
        return SDDeepZoom_infoToTileSource(info, url);
    },
    
    // Perf note: This function uses multiple anonymous functions.
    // Probably not a big deal because it's called infrequently.
    /**
     * Given a URL, make a TileSource or an array of TileSources,
     * and pass them to the provided callback function.
     * If the URL is for a DZI or a particular image from a DZC
     * (such as mycollection.dzc#22), this function will create
     * a single TileSource.
     * If the URL is for a DZC file, this function will create
     * a new TileSource for each item in the collection, and call the
     * provided callback function with an array containing all of the
     * TileSources.
     * @method fetchTileSource
     * @param {string} url The location of the DZI or DZC file.
     * @param {function} callback The function to pass results to, once
     * the requested deep zoom content has been fetched.
     */
    SDDeepZoom_fetchTileSource = SDDeepZoom.fetchTileSource = function (url, callback) {
        var shortUrl = url.split("#", 1)[0],
            info = SDDeepZoom_storedXml[shortUrl],
            status;
        
        // case 1: The needed XML has already been fetched.
        // To keep the API simple, we'll wait on a timeout and
        // return the TileSource asynchronously.
        if (info) {
            setTimeout(function () {
                callback(SDDeepZoom_infoToTileSource(info, url));
            }, 0);
        }
        
        // case 2: The needed XML has not been fetched yet. Get it.
        // Note that the Network module is responsible for noticing
        // multiple requests to the same URL and calling back each.
        else {
            status = SDNetwork_tryMakeXmlHttpRequest(shortUrl, function (url2, success, xhr) {
                var xml,
                    info2;
                if (!success) {
                    SDDebug_warn("DeepZoom.fetchTileSource (callback): XML fetch failed.");
                } else {
                    
                    // If there have been multiple requests for the same XML, don't waste time
                    // parsing it again.
                    info2 = SDDeepZoom_storedXml[url2];
                    if (!info2) {
                        
                        // This is the first callback for this URL, so we need to parse the XML.
                        xml = xhr.responseXML || xhr.responseText;
                        info2 = SDDeepZoom_parseXml(xml);
                        
                        // check for failure (malformed XML, probably)
                        if (!info2) {
                            return;
                        }
                        
                        // Save the parsed XML for any future use.
                        SDDeepZoom_storedXml[url2] = info2;
                    }
                    
                    // Now call back the requestor.
                    callback(SDDeepZoom_infoToTileSource(info2, url));
                }
            }, true);
            if (!status) {
                SDDebug_warn("DeepZoom.fetchTileSource: Failed to make request.");
            }
        }
    };
