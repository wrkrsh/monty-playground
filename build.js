import * as esbuild from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure dist directory exists
if (!existsSync('dist')) mkdirSync('dist');

// Copy WASM files to dist (they need to be served alongside the JS)
const wasmFiles = [
    'monty.wasm32-wasi.wasm',
    'wasi-worker-browser.mjs',
];

for (const file of wasmFiles) {
    const src = join(__dirname, 'wasm', file);
    const dest = join(__dirname, 'dist', file);
    if (existsSync(src)) {
        copyFileSync(src, dest);
        console.log(`Copied: ${file}`);
    }
}

// Build the main runtime bundle
try {
    await esbuild.build({
        entryPoints: ['src/monty-runtime.js'],
        bundle: true,
        outfile: 'dist/monty-runtime.js',
        format: 'esm',
        platform: 'browser',
        target: 'es2020',
        sourcemap: true,
        // Don't bundle the WASM browser module - it has special loading requirements
        external: ['../wasm/monty.wasi-browser.js'],
        define: {
            'process.env.NODE_ENV': '"production"',
        },
    });
    console.log('Built: dist/monty-runtime.js');
} catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
}

// Build the app bundle
try {
    await esbuild.build({
        entryPoints: ['js/app.js'],
        bundle: true,
        outfile: 'dist/app.js',
        format: 'esm',
        platform: 'browser',
        target: 'es2020',
        sourcemap: true,
        external: ['../dist/monty-runtime.js'],
    });
    console.log('Built: dist/app.js');
} catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
}

console.log('\\nBuild complete!');
console.log('\\nNote: For WASM with SharedArrayBuffer to work, serve with these headers:');
console.log('  Cross-Origin-Opener-Policy: same-origin');
console.log('  Cross-Origin-Embedder-Policy: require-corp');
