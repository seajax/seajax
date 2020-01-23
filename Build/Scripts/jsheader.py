# Copyright (c) Microsoft Corporation
# All rights reserved.
# BSD License
#
# Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
# following conditions are met:
#
# Redistributions of source code must retain the above copyright notice, this list of conditions and the following
# disclaimer.
#
# Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following
# disclaimer in the documentation and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS ""AS IS"" AND ANY EXPRESS OR IMPLIED WARRANTIES,
# INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
# SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
# WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE

# jsheader.py
# Utility class for adding/changing header comments at the top of JS files.

_TOKEN_BEGIN = "/**"
_TOKEN_MID = " * "
_TOKEN_END = " */\n"
_TOKEN_END_LEN = len(_TOKEN_END)


def _comment(text):
    """
    Returns the given text as a multi-lined JavaScript block comment.
    """
    if text is None or text == "":
        return ""
    output = [_TOKEN_BEGIN]
    lines = text.strip().split("\n")
    for line in lines:
        output.append(_TOKEN_MID + line)
    output.append(_TOKEN_END)
    return "\n".join(output)


def getHeader(js):
    """
    Returns the header comment at the top of this JS code, if there is one.
    Otherwise, returns the empty string.
    """
    if not js.startswith(_TOKEN_BEGIN):
        return ""
    return js[: js.find(_TOKEN_END) + _TOKEN_END_LEN]


def setHeader(js, header):
    """
    Prepends the given text as a comment header to the top of the given JS code,
    removing any previous header comment if there is one.
    """
    return js.replace(getHeader(js), _comment(header), 1)
