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

// Object.js
// Defines the Seadragon2.Object class.

/*global SD */
/*jslint strict: false */

var

    /**
     *  A utility class for working with Javascript objects.
     *  @class Object
     *  @namespace Seadragon2
     *  @static
     */    
    SDObject = SD.Object = {},

    /**
     *  Extends the first given object to contain all of the second given object's
     *  properties, and returns the first object. By default, inherited properties
     *  are not copied; specify <code>all</code> to copy them. Note that the first
     *  object is explicitly modified, while the second one is not. Note also that
     *  only shallow copies are possible and that only enumerable properties are
     *  discovered.
     *  @method extend
     *  @param {object} obj The object to extend.
     *  @param {object} other The object whose properties should be copied.
     *  @param {boolean} all? If given, copies all enumerable properties, including
     *  inherited ones.
     *  @return {object} <code>obj</code> after it has been extended with the
     *  properties of <code>other</code>.
     */
    SDObject_extend = SDObject.extend = function (obj, other, all) {
        for (var prop in other) {
            if (all || other.hasOwnProperty(prop)) {
                obj[prop] = other[prop];
            }
        }

        return obj;
    },

    /**
     *  Copies all of the given object's properties into a new object and returns
     *  the new object. By default, inherited properties are not copied; specify
     *  <code>all</code> to copy them. Note that only shallow copies are possible
     *  and that only enumerable properties are discovered. This is equivalent to
     *  extending a new empty object with the given object; that is, this is
     *  equivalent to calling <code>extend({}, obj, all)</code>.
     *  @method clone
     *  @param {object} obj The object to clone.
     *  @param {boolean} all? If given, copies all enumerable properties, including
     *  inherited ones.
     *  @return {object} A new object that is a clone of the given one.
     */
    SDObject_clone = SDObject.clone = function (obj, all) {
        return SDObject_extend({}, obj, all);
    };
