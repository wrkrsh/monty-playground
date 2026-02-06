# WASM Mode Setup

Monty Playground supports two execution modes:

1. **Simulation Mode** (default) - JavaScript-based interpreter simulation
2. **WASM Mode** - Real Monty WASM interpreter

## Enabling WASM Mode

WASM mode requires `SharedArrayBuffer`, which only works when the page is served with specific security headers.

### Required HTTP Headers

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### Nginx Configuration

```nginx
location /playground/ {
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;
    
    # ... rest of your config
}
```

### Apache Configuration

```apache
<Location /playground>
    Header set Cross-Origin-Opener-Policy "same-origin"
    Header set Cross-Origin-Embedder-Policy "require-corp"
</Location>
```

### GitHub Pages

Unfortunately, GitHub Pages doesn't support custom headers. WASM mode won't work there.

For full WASM support, deploy to:
- Your own server with nginx/apache
- Cloudflare Pages (supports custom headers via `_headers` file)
- Vercel (supports custom headers via `vercel.json`)

### Cloudflare Pages `_headers` file

```
/playground/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

### Vercel `vercel.json`

```json
{
  "headers": [
    {
      "source": "/playground/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

## Checking Mode

The playground shows the current mode in the status bar:
- **● WASM** (green) - Running real Monty interpreter
- **● Simulation** (yellow) - Running JavaScript fallback

## WASM Files

The WASM files are in the `/wasm/` directory:
- `monty.wasm32-wasi.wasm` - Main WASM binary (~10MB)
- `monty.wasi-browser.js` - Browser loader
- `wasi-worker-browser.mjs` - Web Worker for multi-threading
