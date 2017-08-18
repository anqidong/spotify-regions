#!/bin/sh

# Requires the following node.js modules installed globally:
# - typescript
# - uglify-js
#
# This is nominally a .ps1 (Powershell) script to keep Windows happy, but this script is simple
# enough that it should work correctly in any POSIX shell as well.

pushd webapp
tsc main.ts --strict --noImplicitReturns --noFallthroughCasesInSwitch --noUnusedLocals --noUnusedParameters --outFile main.temp.js # --pretty
uglifyjs main.temp.js --compress --mangle --screw-ie8 -o main.js
# rm main.temp.js
popd
