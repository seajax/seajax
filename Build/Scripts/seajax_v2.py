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

# seajax_v2.py
# Build script for Seajax v2.
#
# Can be called directly from the command line, with no arguments or with one build-number argument, from any working directory.
# python seajax_v2
# python seajax_v2 pivot
#
# Python usage: (current working directory must be this script's directory)
# import seajax_v2
# seajax_v2.build(target)
#
# Dependencies:
# file_helpers.py

# relative to this build script.
PATH_SEAJAX_V2 = "../../v2/"

# relative to this build script. args are target (e.g. image, map, full) and
# type (e.g. standalone, jquery, etc.).
PATH_FILE_LIST = PATH_SEAJAX_V2 + "build/%s/%s.txt"

# relative to the src dir. arg is type (e.g. standalone, jquery, etc.).
PATH_PRE_FILE = "_pre/%s.txt"
PATH_POST_FILE = "_post/%s.txt"

# relative to this build script.
PATH_SRC_FILES = PATH_SEAJAX_V2 + "src/"
PATH_APP_FILES = PATH_SEAJAX_V2 + "app/"
PATH_COMPILED_FILES = PATH_SEAJAX_V2 + "compiled/"

# relative to this build script.
PATH_OUTPUT_DIR = "../../bin/v2/"

# relative to this build script. args are target (e.g. image, map, full),
# type (e.g. standalone) and debug type (e.g. raw, min).
PATH_OUTPUT_FILE = PATH_OUTPUT_DIR + "seadragon-%s-%s%s.js"

TARGETS = {
    "image": ["standalone"],
    "zoom": ["standalone"],
    "zoomimage": ["standalone"],
    "ajax": ["standalone"],
    "utils": ["standalone"],
    "pivot": ["standalone"],
    "collegevine": ["standalone"],
}

from os import chdir, getcwd
from sys import argv, path
from file_helpers import *  # under %SDROOT%/Build/Scripts/
from subprocess import call

import shutil


def build_specific(target, type):
    # this list will contain the names of the files to concatenate.
    files = []
    # first file is the _pre wrapper for this type.
    files.append(PATH_PRE_FILE % type)
    # in the middle are all of the src files for this target and type, which
    # are read from the appropriate file list.
    files.extend(readfile(PATH_FILE_LIST % (target, type)).splitlines())
    # at the end is the _post wrapper for this type.
    files.append(PATH_POST_FILE % type)

    shutil.rmtree(PATH_COMPILED_FILES)
    shutil.copytree(PATH_APP_FILES, PATH_COMPILED_FILES + "app")
    shutil.copytree(PATH_SRC_FILES, PATH_COMPILED_FILES + "src")

    call(
        [
            "npx",
            "babel",
            PATH_COMPILED_FILES,
            "--config-file",
            "../../.babelrc.json",
            "--extensions",
            ".jsx",
            "--quiet",
            "--out-dir",
            PATH_COMPILED_FILES,
        ]
    )

    # prepend the correct path to all of the file names.
    files = map(lambda filename: PATH_COMPILED_FILES + "src/" + filename, files)

    # read all files and concatenate them together into one
    concatenated = readfiles(files)
    # output raw version of this concatenation
    writefile(PATH_OUTPUT_FILE % (target, type, ""), concatenated)
    # output min version of this concatenation
    # TODO add header
    # try:
    #     call(
    #         [
    #             "npx",
    #             "uglifyjs",
    #             PATH_OUTPUT_FILE % (target, type, ""),
    #             "--mangle",
    #             "--output",
    #             PATH_OUTPUT_FILE % (target, type, "-min"),
    #         ]
    #     )
    # except OSError:
    #     print(
    #         "Error: Could not find UglifyJS. Install it using `npm install` (see README.md)."
    #     )


def build(target):
    # TODO validate each source file against jslint, just once
    # make output directory
    maketree(PATH_OUTPUT_DIR)
    # build each target and type
    targets = TARGETS if target == "all" else [target]
    for target in targets:
        for type in TARGETS[target]:
            build_specific(target, type)


# IMMEDIATE EXECUTION

if __name__ == "__main__":
    # parse command-line args
    target = argv[1] if len(argv) > 1 else "all"

    # change directories to this script's directory temporarily
    olddir = getcwd()
    chdir(path[0])

    # run the main function
    build(target)

    # and finally, restore old working directory
    chdir(olddir)
