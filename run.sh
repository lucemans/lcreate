#!/bin/sh
rm -rf ./test
mkdir ./test
deno run -A --unstable ./index.ts ./test