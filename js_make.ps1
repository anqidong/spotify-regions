# requires the following node.js modules installed globally:
# - typescript
# - uglify-js

pushd webapp
tsc main.ts --outFile main.temp.js
uglifyjs main.temp.js --compress --mangle --screw-ie8 -o main.js
rm main.temp.js
popd
