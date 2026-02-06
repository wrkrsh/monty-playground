#!/bin/bash
# Setup WASM files for Monty Playground
# Run this after npm install

set -e

echo "Setting up WASM files..."

# Create wasm directory if it doesn't exist
mkdir -p wasm

# Download the WASM package directly (npm won't install it on non-wasm platforms)
WASM_PKG_URL=$(npm view @pydantic/monty-wasm32-wasi dist.tarball)
echo "Downloading from: $WASM_PKG_URL"

# Download and extract
curl -sL "$WASM_PKG_URL" | tar -xzf - -C /tmp

# Copy files to wasm directory
cp /tmp/package/monty.wasm32-wasi.wasm wasm/
cp /tmp/package/monty.wasi-browser.js wasm/
cp /tmp/package/wasi-worker-browser.mjs wasm/
cp /tmp/package/wasi-worker.mjs wasm/

# Cleanup
rm -rf /tmp/package

echo "WASM files installed:"
ls -la wasm/

echo ""
echo "Done! WASM mode will be available when served with COOP/COEP headers."
echo "See WASM-SETUP.md for details."
