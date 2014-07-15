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

// Run an LZW compression on the given UTF-8 string, and base64-encode the result.
// This encoder is probably not quite compatible with the unix compress program.
// It starts with 8-bit codes and grows as necessary, allowing the codes to get as
// long as 16 bits. Once the code table is full with 65536 entries, it will remain
// constant for the rest of the compression.
function lzwEncode(data) {
    // first, coerce the string into UTF-8
    data = unescape(encodeURIComponent(data));
    
    // set up state
    var dict = {},
        currChar,
        chunk = data[0],
        lastCode = 255,
        i,
        n = data.length,
        newChunk,
        bitLength = 8,
        base64table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
        encoderState = 0, // the current partial six-bit sequence that the base64 encoder is working on
        encoderBits = 0, // the number of bits in the encoderState
        output = [], // output from base64 encode
        maxCode = 0xffff; // dictionary can't grow beyond 64k entries
        
    // initialize the dictionary
    for (i = 0; i < 256; i++) {
        dict[String.fromCharCode(i)] = i;
    }
    
    // this is a base-64-encoding output stream
    function pushOutput(code) {
        // variable size encoding - we must occasionally make the outputs bigger
        if ((1 << bitLength) <= lastCode) {
            bitLength++;
        }
        
        // update encoder state
        encoderState = (encoderState << bitLength) | code;
        encoderBits += bitLength;
        
        // encode anything we can from the current state
        while (encoderBits >= 6) {
            encoderBits -= 6;
            output.push(base64table[(encoderState >> encoderBits) & 63]);
        }
    }
    
    // iterate over the characters of the input
    for (i = 1; i < n; i++) {
        currChar=data[i];
        newChunk = chunk + currChar;
        
        // check whether the dictionary already has this sequence of characters.
        // note that standard object properties such as __proto__ and hasOwnProperty
        // are possible chunks.
        if (hasOwnProperty.call(dict, newChunk)) {
            // we can keep building this chunk
            chunk = newChunk;
        } else {
            // output the code for the current substring
            pushOutput(dict[chunk]);
            
            // put this new item in the dictionary
            if (lastCode < maxCode) {
                lastCode++;
                dict[newChunk] = lastCode;
            }
            
            // reset the current substring to only one character
            chunk=currChar;
        }
    }
    
    // output the last substring
    pushOutput(dict[chunk]);
    
    // flush the rest of the encoder state.
    if (encoderBits) {
        output.push(base64table[(encoderState << (6 - encoderBits)) & 63]);
    }
    
    // base64 encoding likes bytes, so we must pad it out as if we cared.
    // we'll assume for now that it's okay to have extra null characters at the
    // end of our data stream.
    while (output.length % 4) {
        output.push("A");
    }
    
    return output.join("");
}
