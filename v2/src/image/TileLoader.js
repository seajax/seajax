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

// TileLoader.js
// defines the Seadragon2.TileLoader class
/*global SDNetwork_numSpotsAvailable, SDNetwork_tryMakeImageRequest, SDDebug_error, SDTileCache, SDDebug_warn,
 SDMath_min*/

var
    // This "class" is just a collection of static methods. The only "public" methods
    // are nominate and getImgInfo, both used by the Image class.

    // dictionary of all <img>s that have been loaded, keyed by their src.
    // value of each key is {loading, loaded, failed, img, owners, tileInfos}
    SDTileLoader_imgInfos = {},
    
    // whenever we nominate tiles or receive tiles, we'll want to dispatch the
    // next network request. this variable shows whether we've requested it.
    SDTileLoader_trigger = false,
    
    // just a function. defined here to make jslint happy.
    SDTileLoader_triggerProcessing,
    
    // cache to use
    SDTileLoader_cache = new SDTileCache(1000),
    
    // "nominations" for images to download each frame
    SDTileLoader_nominations = {},   // dictionary from URL to {area, distance, owners, tileInfos}
    
    // This object should be treated as read-only and final.
    // It is the default response for getImgInfo if the requested image hasn't been loaded.
    SDTileLoader_nullImgInfo = {
        loading: false,
        loaded: false,
        failed: false,
        img: null,
        owners: null,
        tileInfos: null
    };

// comparison function used by Array.sort(); sorts URLs with higher areas to be
// earlier in the array (i.e. lower indices) than URLs with lower areas.
function SDTileLoader_compareNominatedUrls(urlA, urlB) {
    var nominationA = SDTileLoader_nominations[urlA],
        nominationB = SDTileLoader_nominations[urlB],
        diffArea = nominationB.area - nominationA.area,
        diffDist;
    
    // first go by area (larger tiles first)
    if (diffArea) {
        return diffArea;
    }
    
    // second, go by distance to center (foviation); CLOSER means BETTER
    diffDist = nominationA.distance - nominationB.distance;
    if (diffDist) {
        return diffDist;
    }
    
    // third, go by level: get low-res images first
    return nominationA.level - nominationB.level;
}

function SDTileLoader_imgCallback(url, success, img) {
    var info = SDTileLoader_imgInfos[url], tiles, callbacks, args, i, n, victim;
    
    if (!info) {
        SDDebug_error("Seadragon2.TileLoader: [internal] no img info for " + url);
    }
    
    victim = SDTileLoader_cache.insert(info);
    if (victim) {
        delete SDTileLoader_imgInfos[victim.url];
    }
    
    info.loading = false;
    info.loaded = success;
    info.failed = !success;
    info.img = img;
    
    tiles = info.tiles;
    callbacks = info.callbacks;
    args = info.args;
    
    // to prevent memory leaks, delete these owners (HTML <sdimg> elements) and
    // tileInfos (which may also reference HTML elements) after using them!
    try {
        delete info.tiles;
        delete info.callbacks;
        delete info.args;
    } catch (e) {
        info.tiles = null;
        info.callbacks = null;
        info.args = null;
    }

    // now callback all of the owner images, with their respective tileInfos
    n = tiles.length;
    for (i = 0; i < n; i++) {
        if (tiles[i]) {
            callbacks[i](args[i], tiles[i], info);
        }
    }
    
    // presumably a spot has opened up, so begin downloading next best tile!
    SDTileLoader_triggerProcessing();
}

function SDTileLoader_processNominations() {
    var i,
        n,
        url,
        urls = [],
        numRequestsLeft = SDNetwork_numSpotsAvailable(),
        nomination;
    
    // this function should ONLY be called as a result of SDTileLoader_triggerProcessing().
    SDTileLoader_trigger = false;
    
    // here, we want to download as much as possible, across hostnames. the
    // Network class already contains logic to clamp the number of requests to
    // each hostname, so we'll just try a request for every nominated tile in
    // order of best to worst, downloading as many as possible.
    // one optimization: reading the total number of requests left across all
    // hostnames just once at the start, and stopping early once that's up.
    
    // step 1: sort all URLs by their score, best to worst.
    // sub-step 1A: compute priorities and copy the dictionary to an array
    for (url in SDTileLoader_nominations) {
        if (SDTileLoader_nominations.hasOwnProperty(url) && SDTileLoader_nominations[url]) {
            urls.push(url);
        }
    }
    // sub-step 1B: sort the array by score
    urls.sort(SDTileLoader_compareNominatedUrls);

    // step 2: iterate over all of the URLs until we run out of spots or URLs
    n = urls.length;
    for (i = 0; i < n && numRequestsLeft > 0; i++) {
        url = urls[i];
        if (SDNetwork_tryMakeImageRequest(url, SDTileLoader_imgCallback)) {
            numRequestsLeft--;
            nomination = SDTileLoader_nominations[url];
            SDTileLoader_imgInfos[url] = {
                loading: true,
                loaded: false,
                failed: false,
                img: null,
                tiles: nomination.tiles,
                callbacks: nomination.callbacks,
                args: nomination.args,
                url: url
            };
            
            // since we're fetching it, delete this nomination
            try {
                delete SDTileLoader_nominations[url];
            } catch (e) {
                SDTileLoader_nominations[url] = null;
            }
        }
    }
}

// process nominations after whatever is happening right now
SDTileLoader_triggerProcessing = function () {
    if (!SDTileLoader_trigger) {
        SDTileLoader_trigger = true;
        setTimeout(SDTileLoader_processNominations, 0);
    }
};

// Nominate the given URL for download
// owner must provide getTilePriority() and onTileLoad() callbacks.
function SDTileLoader_nominate(tile, callback, callbackArg) {
    var url = tile.url,
        info = SDTileLoader_imgInfos[url];
    
    // if it's listed in imgInfos, it's probably already loading. just add another nominator.
    if (info) {
        if (info.tiles) {
            info.tiles.push(tile);
            info.callbacks.push(callback);
            info.args.push(callbackArg);
            info.nominators++;
        } else {
            // the tile must have failed, so just give up
            SDDebug_warn("Nomination dropped: " + url);
        }
        return;
    }
    
    // it's not already loading, so look next in nominations
    info = SDTileLoader_nominations[url];
    
    // if this is the first time we're seeing this URL, initialize the info for
    // it, otherwise update the existing info.
    if (info) {
        info.tiles.push(tile);
        info.callbacks.push(callback);
        info.args.push(callbackArg);
        info.area += tile.area;
        info.distance = SDMath_min(info.distance, tile.distance);
        info.nominators++;
    } else {
        SDTileLoader_nominations[url] = {
            tiles: [tile],
            callbacks: [callback],
            args: [callbackArg],
            nominators: 1,
            area: tile.area,
            distance: tile.distance,
            level: tile.level
        };
    }
    SDTileLoader_triggerProcessing();
    
    // return a token that the nominator can use to un-nominate if necessary
    return SDTileLoader_nominations[url].tiles.length - 1;
}

/*function SDTileLoader_unNominate(url, index) {
    var nominations = SDTileLoader_nominations[url];
    if (nominations) {
        // tile hasn't already started loading
        nominations.nominators--;
        if (nominations.nominators <= 0) {
            // nobody wants the tile anymore, clear the nomination
            delete SDTileLoader_nominations[url];
        } else {
            // remove only the current nominator
            delete nominations.owners[index];
            delete nominations.tileInfos[index];
        }
    }
    // else do nothing, since network request has already been sent
}*/

function SDTileLoader_getImgInfo(url) {
    var info = SDTileLoader_imgInfos[url];
    // refresh the tile-cache LRU order, but only if the image has already finished loading!
    if (info && !info.loading) {
        SDTileLoader_cache.refresh(info);
    }
    return info || SDTileLoader_nullImgInfo;
}
