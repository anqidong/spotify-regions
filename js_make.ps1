#!/bin/sh

# Requires the following node.js modules installed globally:
# - typescript
# - uglify-js
#
# This is nominally a .ps1 (Powershell) script to keep Windows happy, but this script is simple
# enough that it should work correctly in any POSIX shell as well.

pushd webapp
python ../file_subst.py main.ts
mv main.ts.sub main.sub.ts
# FIXME running file_subst.py first messes up line numbers
tsc main.sub.ts --strict --noImplicitReturns --noFallthroughCasesInSwitch --noUnusedLocals --noUnusedParameters --outFile main.temp.js # --pretty
uglifyjs main.temp.js --compress --mangle --screw-ie8 -o main.js
rm main.sub.ts
# rm main.temp.js
popd
