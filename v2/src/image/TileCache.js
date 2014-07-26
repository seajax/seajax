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

// This cache is just LRU, doesn't use higher priority for lower-res tiles.
/*jslint onevar: true, undef: true, nomen: true, eqeqeq: true, bitwise: true,
regexp: true, newcap: true, immed: true */
/*jshint strict: false */

function SDTileCache(capacity) {
    this.capacity = (capacity > 1) ? capacity : 2;
    this.oldest = null;
    this.newest = null;
}

// put a new item onto the end of the cache list. If it kicks something else
// out, return the something else.
// note: it must be okay for us to add a couple of properties to the items
// (cacheOlder and cacheNewer).
SDTileCache.prototype.insert = function (item) {
    var victim = null;
    
    if (this.capacity <= 0) {
        // kick out the oldest cache item
        victim = this.oldest;
        this.remove(victim);
    }
    this.capacity--;
    
    // insert the item into the linked list
    item.cacheOlder = this.newest;
    if (this.newest) {
        this.newest.cacheNewer = item;
    } else {
        // very first item to be added
        this.oldest = item;
    }
    this.newest = item;
    item.cacheNewer = null;

    return victim;
};

// remove an existing item from its position in the cache list.
SDTileCache.prototype.remove = function (item) {
    this.capacity++;
    if (item.cacheOlder) {
        item.cacheOlder.cacheNewer = item.cacheNewer;
    } else {
        this.oldest = item.cacheNewer;
    }
    if (item.cacheNewer) {
        item.cacheNewer.cacheOlder = item.cacheOlder;
    } else {
        this.newest = item.cacheOlder;
    }
};

SDTileCache.prototype.refresh = function (item) {
    this.remove(item);
    this.insert(item);
};
