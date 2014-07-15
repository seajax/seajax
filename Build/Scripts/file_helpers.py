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

# file_helpers.py
# Utility methods for working with files and trees in Python and a source
# control environment, where e.g. files are typically marked read-only.
# 
# These methods can also be invoked from the command line, which is useful for
# pre- and post-build rules, since CMD lacks commands like copying a tree.
# 
# Command-line usage:
# python file_helpers.py {command} [{args...}]
# 
# Examples:
# python file_helpers.py copytree foo\bar foo\baz
# 
# Notes:
# All paths will be relative to the working directory.
# Currently, only copytree is available via the command line. :)

from os import chdir, getcwd, listdir, makedirs, walk
from os import sep as SEP
from os.path import isdir, join
from shutil import rmtree
from zipfile import ZipFile

# FILE TYPES

_BINARY_TYPES = ("cur", "dll", "jpeg", "jpg", "ico", "pdb", "png", "xap")
_TEXT_TYPES = ("asp", "aspx", "cs", "css", "js", "htm", "html", "txt")

def isbinary(path, default=None):
    '''
    Attempts to automatically determine whether the file at the given path is
    binary or not, based on its file extension. If the file has no extension, or
    if the extension is unknown, returns the default, which can be overridden.
    '''
    default = True if default is None else default  # if not given, True
    lastDot = path.rfind('.')
    if lastDot == -1:
        return default
    elif path.endswith(_BINARY_TYPES, lastDot):
        return True
    elif path.endswith(_TEXT_TYPES, lastDot):
        return False
    return default

# FILE HELPERS

def readfile(path, binary=None):
    '''
    Reads the file at the given path and returns the result. For unknown file
    types, the file is read in a default binary or text mode, which can be
    overridden via the binary flag.
    '''
    mode = 'rb' if isbinary(path, binary) else 'r'
    file = open(path, mode)
    result = file.read()
    file.close()
    return result

def readfiles(paths, binary=None):
    '''
    Reads the files at the given paths and returns the concatenated results. For
    unknown file types, the files are read in a default binary or text mode,
    which can be overridden via the binary flag.
    '''
    return '\n'.join([readfile(path, binary) for path in paths])

def writefile(path, contents, binary=None):
    '''
    Writes the given contents to the file at the given path. For unknown file
    types, the file is written in a default binary or text mode, which can be
    overridden via the binary flag.
    '''
    mode = 'wb' if isbinary(path, binary) else 'w'
    file = open(path, mode)
    file.write(contents)
    file.close()

def copyfile(srcPath, dstPath, binary=None, transform=None):
    '''
    Copies the file at the given source path to the given destination path.
    A transform may optionally be given that accepts the contents of the
    source and returns a transformed version to write to the destination.
    '''
    contents = readfile(srcPath, binary)
    if transform is not None:
        contents = transform(contents)
    writefile(dstPath, contents, binary)

def copytree(src, dst, binary=None, transform=None):
    '''
    Copies the tree at the given source path to the given destination path.
    Unlike shutil.copytree, manually copies to bypass read-only permissions.
    Optionally applies a transform to each file before copying (see copyfile).
    '''
    src = src.replace('/', SEP)
    dst = dst.replace('/', SEP)
    if src[-1] != SEP:
        src = src + SEP
    if dst[-1] != SEP:
        dst = dst + SEP
    offset = len(src)
    for root, dirs, files in walk(src):
        root = root[offset:]    # eliminate redundancy in path (contains src).
        if len(root) > 0:       # don't duplicate separator if root is empty.
            root = root + SEP
        srcRoot = src + root
        dstRoot = dst + root
        if not isdir(dstRoot):
            makedirs(dstRoot)
        for file in files:
            copyfile(srcRoot + file, dstRoot + file, binary, transform)

def maketree(path):
    '''
    Makes the tree at the given path, clearing old files first and creating
    intermediate directories.
    '''
    if isdir(path):
        rmtree(path)    # remove tree first to clear old files
    makedirs(path)      # this makes sure intermediate directories exist

def ziptree(path, zipPath):
    '''
    Zips the tree at the given path into the given zip file. Ensures that the
    zip file itself is not zipped if it's part of the tree.
    '''
    path = path.replace('/', SEP)
    zipPath = zipPath.replace('/', SEP)
    if path[-1] != SEP:
        path = path + SEP
    offset = len(path)
    zipFile = ZipFile(zipPath, 'w')
    for root, dirs, files in walk(path):
        root = root[offset:]    # eliminate redundancy in path (contains src).
        if len(root) > 0:       # don't duplicate separator if root is empty.
            root = root + SEP
        srcRoot = path + root
        for file in files:
            srcPath = srcRoot + file
            dstPath = root + file
            if srcPath != zipPath:
                zipFile.write(srcPath, dstPath)
    zipFile.close()


if __name__ == "__main__":
    
    from sys import argv, exit
    
    if len(argv) <= 1:
        print
        print "Usage:"
        print "python file_helpers.py {command} [{args...}]"
        print 
        print "Example:"
        print "python file_helpers.py copytree foo/bar foo/baz"
        print 
        print "Only copytree is available from the command line currently."
        
    elif argv[1] != "copytree":
        print "Error: unrecognized command. Currently, only copytree is supported. Sorry!"
    
    elif len(argv) < 4:
        print "Error: copytree requires {src} and {dst} args."
    
    elif len(argv) > 4:
        print "Error: copytree via the command line doesn't support the {binary} or {transform} args."
    
    else:
        copytree(argv[2], argv[3])
