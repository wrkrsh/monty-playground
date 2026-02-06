/**
 * Monty Playground - Main Application
 * https://github.com/wrkrsh/monty-playground
 * 
 * WASM-only execution using @pydantic/monty
 */

// ============================================
// EXAMPLES
// ============================================
const EXAMPLES = {
    hello: `# 🐍 Welcome to Monty!
# A Python interpreter that's small, fast, and secure.
# Built by the Pydantic team for AI agents.

print("Hey! I'm Monty — a tiny Python interpreter.")
print("I was built in Rust, and I run in microseconds.")

numbers = [1, 2, 3, 4, 5]
squares = [n ** 2 for n in numbers]
print(f"Squares: {numbers} → {squares}")

"🐍 Made with 🦀 by Pydantic"`,

    fibonacci: `# Fibonacci - Recursion in Monty
def fib(n: int) -> int:
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

print("Fibonacci sequence:")
for i in range(12):
    print(f"  fib({i}) = {fib(i)}")

fib(12)`,

    external: `# External Functions - Monty's Superpower
# Monty can call functions on the host system.

data = fetch("https://api.example.com/users")
print(f"Fetched: {data}")

weather = get_weather("London")
print(f"Weather: {weather}")

"External functions demo complete!"`,

    types: `# Type Checking with 'ty'
def greet(name: str) -> str:
    return f"Hello, {name}!"

def add(a: int, b: int) -> int:
    return a + b

print(greet("World"))
print(f"10 + 20 = {add(10, 20)}")

"Type checking works!"`,

    snapshot: `# Snapshot & Resume - Monty's Killer Feature
# Monty can pause, serialize state, and resume later.

print("Snapshot & Resume enables:")
print("  • Pause at external calls")
print("  • Serialize to bytes")
print("  • Store anywhere")
print("  • Resume in different process")

"This is why Monty exists!"`,
};

// ============================================
// EXTERNAL FUNCTIONS
// ============================================
const EXTERNAL_FUNCTIONS = {
    fetch: (url) => `{"status":"ok","data":[{"id":1,"name":"Alice"}]}`,
    get_weather: (city) => `{"city":"${city}","temp_c":18,"conditions":"Cloudy"}`,
    search: (q) => `[{"title":"Result","url":"https://example.com"}]`,
};

// ============================================
// GLOBALS
// ============================================
let editor = null;
let MontyWasm = null;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Check for required browser features
    const support = checkBrowserSupport();
    if (!support.ok) {
        showError(support.error, support.help);
        return;
    }
    
    // Initialize Monaco editor
    initEditor();
});

function checkBrowserSupport() {
    // Check SharedArrayBuffer (required for WASM threads)
    if (typeof SharedArrayBuffer === 'undefined') {
        return {
            ok: false,
            error: 'SharedArrayBuffer not available',
            help: `This playground requires specific security headers to run WebAssembly.

The page must be served with:
• Cross-Origin-Opener-Policy: same-origin
• Cross-Origin-Embedder-Policy: require-corp

GitHub Pages doesn't support these headers.
Use Cloudflare Pages, Vercel, or your own server.`
        };
    }
    
    // Check WebAssembly
    if (typeof WebAssembly === 'undefined') {
        return {
            ok: false,
            error: 'WebAssembly not supported',
            help: 'Please use a modern browser with WebAssembly support.'
        };
    }
    
    return { ok: true };
}

function showError(title, message) {
    const loading = document.getElementById('loading');
    loading.innerHTML = `
        <div class="error-container">
            <div class="error-icon">⚠️</div>
            <h2 class="error-title">${title}</h2>
            <pre class="error-message">${message}</pre>
            <a href="https://github.com/wrkrsh/monty-playground#deployment" class="btn btn-primary">
                Deployment Guide
            </a>
        </div>
    `;
}

function initEditor() {
    require.config({ 
        paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } 
    });

    require(['vs/editor/editor.main'], async function() {
        // Theme
        monaco.editor.defineTheme('monty-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
                { token: 'keyword', foreground: '10b981' },
                { token: 'string', foreground: 'fbbf24' },
                { token: 'number', foreground: 'a78bfa' },
            ],
            colors: {
                'editor.background': '#0a0a0a',
                'editor.foreground': '#fafafa',
                'editor.lineHighlightBackground': '#18181b',
                'editorCursor.foreground': '#10b981',
                'editor.selectionBackground': '#10b98133',
            }
        });

        // Create editor
        editor = monaco.editor.create(document.getElementById('editor'), {
            value: EXAMPLES.hello,
            language: 'python',
            theme: 'monty-dark',
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            minimap: { enabled: false },
            automaticLayout: true,
            padding: { top: 12 },
            tabSize: 4,
        });

        // Keyboard shortcut
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, runCode);
        
        // Load from URL
        loadFromUrl();
        
        // Try to load WASM
        try {
            MontyWasm = await import('../wasm/monty-browser.js');
            console.log('Monty WASM loaded');
            updateStatus('ready', 'Ready');
        } catch (err) {
            console.error('WASM load failed:', err);
            updateStatus('error', 'WASM failed: ' + err.message);
        }
        
        // Hide loading
        document.getElementById('loading').style.display = 'none';
    });
}

// ============================================
// EXECUTION
// ============================================
async function runCode() {
    const code = editor.getValue();
    clearOutput();
    
    updateStatus('running', 'Running...');
    document.getElementById('runBtn').disabled = true;
    
    const startTime = performance.now();
    
    try {
        if (!MontyWasm) {
            throw new Error('Monty WASM not loaded');
        }
        
        // Extract external functions from code
        const externalFns = Object.keys(EXTERNAL_FUNCTIONS).filter(fn => 
            code.includes(fn + '(')
        );
        
        // Create Monty instance
        const result = MontyWasm.Monty.create(code, {
            scriptName: 'main.py',
            externalFunctions: externalFns,
        });
        
        // Check for compile errors
        if (result?.constructor?.name === 'MontyException') {
            throw new Error(result.message || 'Syntax error');
        }
        if (result?.constructor?.name === 'MontyTypingError') {
            throw new Error('Type error: ' + (result.displayDiagnostics?.('concise') || ''));
        }
        
        // Run
        const output = result.run({
            externalFunctions: EXTERNAL_FUNCTIONS,
            limits: { maxDurationSecs: 5, maxRecursionDepth: 100 },
        });
        
        // Check for runtime errors
        if (output?.constructor?.name === 'MontyException') {
            const err = new Error(output.message || 'Runtime error');
            err.traceback = output.traceback?.();
            throw err;
        }
        
        // Display result
        if (output !== null && output !== undefined) {
            appendOutput('result', `→ ${formatValue(output)}`);
        }
        
        const elapsed = (performance.now() - startTime).toFixed(1);
        document.getElementById('execTime').style.display = 'flex';
        document.getElementById('execTimeValue').textContent = elapsed;
        
        updateStatus('ready', 'Done');
    } catch (error) {
        appendOutput('error', `Error: ${error.message}`);
        if (error.traceback) {
            appendOutput('error', error.traceback);
        }
        updateStatus('error', 'Error');
    }
    
    document.getElementById('runBtn').disabled = false;
}

function formatValue(value) {
    if (value === null) return 'None';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

// ============================================
// OUTPUT
// ============================================
function appendOutput(type, text) {
    const output = document.getElementById('output');
    const div = document.createElement('div');
    div.className = `output-line output-${type}`;
    div.textContent = text;
    output.appendChild(div);
}

function clearOutput() {
    document.getElementById('output').innerHTML = '';
    document.getElementById('execTime').style.display = 'none';
}

function updateStatus(state, text) {
    const dot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    dot.className = 'status-dot';
    if (state === 'running') dot.classList.add('running');
    if (state === 'error') dot.classList.add('error');
    
    statusText.textContent = text;
}

// ============================================
// EXAMPLES & SHARING
// ============================================
function loadExample(name) {
    if (EXAMPLES[name] && editor) {
        editor.setValue(EXAMPLES[name]);
        clearOutput();
    }
}

function shareCode() {
    const code = editor.getValue();
    const encoded = btoa(unescape(encodeURIComponent(code)));
    const url = `${location.origin}${location.pathname}#code=${encoded}`;
    
    navigator.clipboard.writeText(url).then(() => {
        showToast('Link copied!');
    }).catch(() => {
        prompt('Copy this link:', url);
    });
}

function loadFromUrl() {
    const hash = location.hash;
    if (hash.startsWith('#code=')) {
        try {
            const code = decodeURIComponent(escape(atob(hash.slice(6))));
            editor.setValue(code);
        } catch (e) {
            console.error('Failed to load from URL:', e);
        }
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}
