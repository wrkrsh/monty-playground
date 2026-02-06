# Monty Playground 🐍

Interactive playground for [pydantic-monty](https://github.com/pydantic/monty) - a minimal, secure Python interpreter written in Rust for AI agents.

## Features

- **Real WASM execution** - Uses @pydantic/monty compiled to WebAssembly
- **Monaco editor** - Full Python syntax highlighting
- **External functions** - Simulate host-provided functions
- **Share code** - Copy shareable links

## Deployment

This playground requires specific security headers to enable SharedArrayBuffer for WASM threads.

### Cloudflare Pages (Recommended)

1. Fork this repo
2. Connect to Cloudflare Pages
3. Build command: (leave empty)
4. Output directory: `/`
5. The `_headers` file automatically configures COOP/COEP

### Vercel

Create `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

### Self-hosted (nginx)

```nginx
location / {
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;
}
```

### Why GitHub Pages doesn't work

GitHub Pages doesn't support custom HTTP headers. The WASM module requires SharedArrayBuffer which is only available in cross-origin isolated contexts.

## Setup WASM

The WASM binary is not included in the repo (10MB). To set up locally:

```bash
./setup-wasm.sh
```

Or manually:
```bash
npm install
# Downloads @pydantic/monty-wasm32-wasi and copies files to /wasm
```

## License

MIT
