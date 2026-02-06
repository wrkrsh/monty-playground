/**
 * Monty Playground - Main Application
 * https://github.com/wrkrsh/monty-playground
 * 
 * Supports two execution modes:
 * - WASM: Real Monty interpreter (requires SharedArrayBuffer)
 * - Simulation: JavaScript-based fallback
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
print("")

# ✅ What I CAN do:
print("✅ Things I'm great at:")
print("   • Run Python code blazingly fast")
print("   • Keep your system completely safe")
print("   • Pause mid-execution and resume later")
print("   • Call functions YOU control")
print("")

# Here's some actual Python I can run:
numbers = [1, 2, 3, 4, 5]
squares = [n ** 2 for n in numbers]
print(f"   Example: {numbers} → {squares}")
print("")

# ❌ What I WON'T do (by design):
print("🔒 Things I refuse to do (for your safety):")
print("   • Access your filesystem")
print("   • Make network requests")
print("   • Read environment variables")
print("   • Import random libraries")
print("")
print("That's not a bug — it's the whole point!")
print("I only do what you explicitly allow.")
print("")

# The magic trick:
print("🎩 My secret trick: I can PAUSE at any external")
print("   function call, save my entire state to bytes,")
print("   and wake up later — even in a different process.")
print("   Perfect for AI agents that need to wait for APIs.")
print("")
print("Try the examples above to see more! ↑")

# Press Run to see me in action!
"🐍 Made with 🦀 by Pydantic"`,

    fibonacci: `# Fibonacci - Recursion in Monty
def fib(n: int) -> int:
    """Calculate the nth Fibonacci number."""
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

# Print the sequence
print("Fibonacci sequence:")
for i in range(12):
    print(f"  fib({i}) = {fib(i)}")

# Return the 12th number
fib(12)`,

    async: `# Async/Await - Monty supports async code
import asyncio

async def process_item(item: str) -> str:
    """Process a single item asynchronously."""
    print(f"Processing: {item}")
    # In real usage, this could call external async functions
    await asyncio.sleep(0)  # Yield control
    return f"Processed: {item}"

async def main():
    items = ["apple", "banana", "cherry"]
    results = []
    
    for item in items:
        result = await process_item(item)
        results.append(result)
    
    print(f"\\nAll done! Processed {len(results)} items")
    return results

# Run the async code
await main()`,

    external: `# External Functions - Monty's Superpower
# 
# Monty can call functions on the host system.
# The host controls what functions are available.
# This is how Monty stays secure!

# Declare external functions (host provides implementations)
# In real usage, these would be defined with externalFunctions option

# Simulate external function calls
data = fetch("https://api.example.com/users")
print(f"Fetched data: {data}")

weather = get_weather("London")
print(f"Weather: {weather}")

# The key insight: Monty can PAUSE at external calls,
# serialize its state, and RESUME later with the result.
# This enables powerful agent patterns.

"External functions demo complete!"`,

    types: `# Type Checking - Monty includes 'ty' typechecker
def greet(name: str) -> str:
    """Greet someone by name."""
    return f"Hello, {name}!"

def add_numbers(a: int, b: int) -> int:
    """Add two integers."""
    return a + b

def process_items(items: list[str]) -> int:
    """Count items in a list."""
    return len(items)

# These all type-check correctly
greeting = greet("World")
print(greeting)

total = add_numbers(10, 20)
print(f"10 + 20 = {total}")

count = process_items(["a", "b", "c"])
print(f"Item count: {count}")

# Try uncommenting this to see type error:
# bad = add_numbers("one", "two")

"Type checking works!"`,

    snapshot: `# Snapshot & Resume - Monty's Killer Feature
#
# Monty can be paused at any external function call,
# serialized to bytes, stored, and resumed later.
# This enables powerful patterns for AI agents!

# Example: Agent execution flow
# 
# Python code:
#   data = fetch(url)        # <- Pause here
#   result = process(data)   # <- Resume with fetch result
#   return result
#
# Host code (pseudocode):
#   snapshot = monty.start({url: "..."})
#   bytes = snapshot.dump()  # Save state to DB
#   
#   # ... later, maybe in another process ...
#   
#   snapshot = Monty.load(bytes)
#   result = snapshot.resume({returnValue: fetchedData})

print("Snapshot & Resume enables:")
print("  • Pause execution at external calls")
print("  • Serialize state to bytes")
print("  • Store in database or file")
print("  • Resume in different process")
print("  • Perfect for serverless/agents")

"This is why Monty exists!"`,

    limitations: `# What Monty Can't Do (Yet)
# Monty is intentionally limited for security

# ❌ Classes (coming soon!)
# class MyClass:
#     def __init__(self):
#         pass

# ❌ *args/**kwargs unpacking
# items = [1, 2, 3]
# print(*items)  # Not supported

# ❌ Standard library (except asyncio, typing, sys)
# import json
# import os
# import requests

# ❌ Third-party libraries
# import pydantic
# import numpy

# ✅ But these work great!
print("What DOES work:")

# Functions and closures
def make_adder(n):
    return lambda x: x + n
add5 = make_adder(5)
print(f"  • Closures: add5(10) = {add5(10)}")

# List comprehensions
squares = [x**2 for x in range(5)]
print(f"  • List comp: {squares}")

# Dictionary comprehensions
d = {x: x**2 for x in range(3)}
print(f"  • Dict comp: {d}")

# F-strings
name = "Monty"
print(f"  • F-strings: Hello, {name}!")

# Type hints (checked with 'ty')
def typed_fn(x: int) -> int:
    return x * 2
print(f"  • Type hints: typed_fn(21) = {typed_fn(21)}")

"Monty: Limited by design, powerful for agents"`,
};

// ============================================
// EXTERNAL FUNCTIONS (mock implementations)
// ============================================
const EXTERNAL_FUNCTIONS = {
    fetch: (url) => `{"status":"ok","data":[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]}`,
    get_weather: (city) => `{"city":"${city}","temp_c":18,"conditions":"Partly cloudy"}`,
    search: (q) => `[{"title":"Result 1","url":"https://example.com"}]`,
};

// ============================================
// EXECUTION MODE
// ============================================
let executionMode = 'simulation'; // 'wasm' or 'simulation'
let MontyWasm = null;

/**
 * Check if WASM mode is available
 */
function checkWasmSupport() {
    // Check for SharedArrayBuffer (required for WASM threads)
    if (typeof SharedArrayBuffer === 'undefined') {
        return { 
            supported: false, 
            reason: 'SharedArrayBuffer not available (requires COOP/COEP headers)' 
        };
    }
    
    // Check for WebAssembly
    if (typeof WebAssembly === 'undefined') {
        return { 
            supported: false, 
            reason: 'WebAssembly not supported in this browser' 
        };
    }
    
    return { supported: true };
}

/**
 * Initialize WASM module if available
 */
async function initWasm() {
    const support = checkWasmSupport();
    if (!support.supported) {
        console.log('WASM not available:', support.reason);
        return false;
    }
    
    try {
        // Dynamic import of WASM module
        MontyWasm = await import('../wasm/monty.wasi-browser.js');
        executionMode = 'wasm';
        console.log('WASM Monty loaded successfully');
        return true;
    } catch (error) {
        console.log('WASM load failed:', error.message);
        return false;
    }
}

// ============================================
// MONTY SIMULATOR (JavaScript fallback)
// ============================================
class MontySimulator {
    constructor() {
        this.output = [];
        this.variables = {};
    }
    
    fib(n) {
        if (n <= 1) return n;
        let a = 0, b = 1;
        for (let i = 2; i <= n; i++) {
            [a, b] = [b, a + b];
        }
        return b;
    }
    
    runFibonacciExample() {
        this.output.push({ type: 'stdout', text: 'Fibonacci sequence:' });
        for (let i = 0; i < 12; i++) {
            this.output.push({ type: 'stdout', text: `  fib(${i}) = ${this.fib(i)}` });
        }
        return { output: this.output, result: this.fib(12) };
    }
    
    runAsyncExample() {
        const items = ['apple', 'banana', 'cherry'];
        items.forEach(item => {
            this.output.push({ type: 'stdout', text: `Processing: ${item}` });
        });
        this.output.push({ type: 'stdout', text: '' });
        this.output.push({ type: 'stdout', text: `All done! Processed ${items.length} items` });
        return { output: this.output, result: items.map(i => `Processed: ${i}`) };
    }
    
    run(code) {
        this.output = [];
        this.variables = {};
        
        // Handle specific examples
        if (code.includes('Fibonacci sequence') && code.includes('for i in range(12)')) {
            return this.runFibonacciExample();
        }
        if (code.includes('async def process_item') && code.includes('await main()')) {
            return this.runAsyncExample();
        }
        
        const lines = code.split('\n');
        let result = null;
        let inFunction = false;
        let functionIndent = 0;
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            // Track function definitions
            if (trimmed.startsWith('def ') || trimmed.startsWith('async def ')) {
                inFunction = true;
                functionIndent = line.search(/\S/);
                continue;
            }
            
            if (inFunction) {
                const currentIndent = line.search(/\S/);
                if (currentIndent > functionIndent || !trimmed) continue;
                inFunction = false;
            }
            
            // Handle print statements
            const printMatch = trimmed.match(/^print\s*\(\s*f?(['"])(.*)\1\s*\)$/);
            if (printMatch) {
                let text = printMatch[2];
                text = text.replace(/\{([^}]+)\}/g, (_, expr) => this.evalExpr(expr.trim()));
                text = text.replace(/\\n/g, '\n');
                this.output.push({ type: 'stdout', text });
                continue;
            }
            
            // Handle assignments
            const assignMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
            if (assignMatch && !trimmed.includes('==')) {
                this.variables[assignMatch[1]] = this.evalExpr(assignMatch[2]);
                continue;
            }
            
            // Handle external function calls
            for (const [fnName, fn] of Object.entries(EXTERNAL_FUNCTIONS)) {
                const fnMatch = trimmed.match(new RegExp(`${fnName}\\s*\\(\\s*["']([^"']+)["']\\s*\\)`));
                if (fnMatch) {
                    const fnResult = fn(fnMatch[1]);
                    this.output.push({ 
                        type: 'external', 
                        text: `📞 ${fnName}("${fnMatch[1]}")\n   → ${fnResult}` 
                    });
                    const assignFnMatch = trimmed.match(/^(\w+)\s*=\s*/);
                    if (assignFnMatch) {
                        this.variables[assignFnMatch[1]] = fnResult;
                    }
                }
            }
            
            // Track last expression as result
            if (!trimmed.includes('=') && !trimmed.startsWith('print') && 
                !trimmed.startsWith('def ') && !trimmed.startsWith('for ') &&
                !trimmed.startsWith('if ') && !trimmed.startsWith('return ') &&
                !trimmed.startsWith('import ') && !trimmed.startsWith('await ')) {
                result = this.evalExpr(trimmed);
            }
        }
        
        // Check for unsupported features
        if (code.includes('class ') && !code.includes('# class')) {
            this.output.push({ type: 'warning', text: '⚠️ Classes not yet supported (coming soon!)' });
        }
        if (code.match(/print\s*\(\s*\*/) || code.includes('*args')) {
            this.output.push({ type: 'warning', text: '⚠️ *args/**kwargs unpacking not supported' });
        }
        
        return { output: this.output, result };
    }
    
    evalExpr(expr) {
        expr = expr.trim();
        
        if ((expr.startsWith('"') && expr.endsWith('"')) ||
            (expr.startsWith("'") && expr.endsWith("'"))) {
            return expr.slice(1, -1);
        }
        
        if (/^-?\d+(\.\d+)?$/.test(expr)) return parseFloat(expr);
        if (this.variables.hasOwnProperty(expr)) return this.variables[expr];
        
        const fnMatch = expr.match(/^(\w+)\s*\(([^)]*)\)$/);
        if (fnMatch) {
            const [, fn, args] = fnMatch;
            if (fn === 'len') {
                const arg = this.evalExpr(args);
                return Array.isArray(arg) ? arg.length : (arg?.length || 0);
            }
            if (fn === 'range') return Array.from({length: parseInt(args)}, (_, i) => i);
            if (fn === 'fib') return this.fib(parseInt(args));
            if (fn === 'add5') return parseInt(args) + 5;
            if (fn === 'typed_fn') return parseInt(args) * 2;
        }
        
        if (expr.startsWith('[') && expr.endsWith(']')) {
            try { return JSON.parse(expr.replace(/'/g, '"')); } catch { return expr; }
        }
        
        return expr;
    }
}

// ============================================
// MONTY WASM RUNNER
// ============================================
class MontyWasmRunner {
    constructor() {
        this.output = [];
    }
    
    async run(code) {
        this.output = [];
        
        if (!MontyWasm) {
            throw new Error('WASM not initialized');
        }
        
        try {
            // Extract external function names from code
            const externalFns = [];
            for (const fnName of Object.keys(EXTERNAL_FUNCTIONS)) {
                if (code.includes(fnName + '(')) {
                    externalFns.push(fnName);
                }
            }
            
            // Create Monty instance
            const result = MontyWasm.Monty.create(code, {
                scriptName: 'main.py',
                externalFunctions: externalFns,
            });
            
            // Check for syntax errors
            if (result instanceof MontyWasm.MontyException || 
                result?.constructor?.name === 'MontyException') {
                throw new Error(result.message || 'Syntax error');
            }
            if (result instanceof MontyWasm.MontyTypingError ||
                result?.constructor?.name === 'MontyTypingError') {
                throw new Error('Type error: ' + (result.displayDiagnostics?.('concise') || ''));
            }
            
            const monty = result;
            
            // Run with external functions
            const runResult = monty.run({
                externalFunctions: EXTERNAL_FUNCTIONS,
                limits: {
                    maxDurationSecs: 5,
                    maxRecursionDepth: 100,
                },
            });
            
            // Check for runtime errors
            if (runResult instanceof MontyWasm.MontyException ||
                runResult?.constructor?.name === 'MontyException') {
                const err = new Error(runResult.message || 'Runtime error');
                err.traceback = runResult.traceback?.();
                throw err;
            }
            
            return { output: this.output, result: runResult };
        } catch (error) {
            this.output.push({ type: 'error', text: error.message });
            if (error.traceback) {
                this.output.push({ type: 'error', text: error.traceback });
            }
            throw error;
        }
    }
}

// ============================================
// GLOBALS
// ============================================
let editor;
const simulator = new MontySimulator();
const wasmRunner = new MontyWasmRunner();

// ============================================
// EDITOR SETUP
// ============================================
require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

require(['vs/editor/editor.main'], async function () {
    // Custom theme
    monaco.editor.defineTheme('monty-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
            { token: 'keyword', foreground: '10b981' },
            { token: 'string', foreground: 'fbbf24' },
            { token: 'number', foreground: 'a78bfa' },
            { token: 'type', foreground: '60a5fa' },
        ],
        colors: {
            'editor.background': '#0a0a0a',
            'editor.foreground': '#fafafa',
            'editor.lineHighlightBackground': '#18181b',
            'editorCursor.foreground': '#10b981',
            'editor.selectionBackground': '#10b98133',
            'editorLineNumber.foreground': '#3f3f46',
            'editorLineNumber.activeForeground': '#71717a',
        }
    });

    // Create editor
    editor = monaco.editor.create(document.getElementById('editor'), {
        value: EXAMPLES.hello,
        language: 'python',
        theme: 'monty-dark',
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 12, bottom: 12 },
        tabSize: 4,
        renderWhitespace: 'none',
        smoothScrolling: true,
        cursorBlinking: 'smooth',
    });

    // Keyboard shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, runCode);
    
    // Load from URL
    loadFromUrl();
    
    // Try to initialize WASM
    const wasmLoaded = await initWasm();
    updateModeIndicator(wasmLoaded);
    
    // Hide loading
    document.getElementById('loading').style.display = 'none';
});

/**
 * Update the mode indicator in the status bar
 */
function updateModeIndicator(wasmAvailable) {
    const statusRight = document.querySelector('.status-right');
    if (!statusRight) return;
    
    const modeSpan = document.createElement('span');
    modeSpan.id = 'modeIndicator';
    modeSpan.style.marginRight = '8px';
    
    if (wasmAvailable) {
        modeSpan.innerHTML = '<span style="color: var(--success);">● WASM</span>';
        modeSpan.title = 'Running real Monty WASM interpreter';
    } else {
        modeSpan.innerHTML = '<span style="color: var(--warning);">● Simulation</span>';
        modeSpan.title = 'Running JavaScript simulation (WASM requires COOP/COEP headers)';
    }
    
    statusRight.insertBefore(modeSpan, statusRight.firstChild);
}

// ============================================
// EXECUTION
// ============================================
async function runCode() {
    const code = editor.getValue();
    clearOutput();
    
    setStatus('running', 'Running...');
    document.getElementById('runBtn').disabled = true;
    
    const startTime = performance.now();
    
    try {
        let output, result;
        
        if (executionMode === 'wasm') {
            const wasmResult = await wasmRunner.run(code);
            output = wasmResult.output;
            result = wasmResult.result;
        } else {
            const simResult = simulator.run(code);
            output = simResult.output;
            result = simResult.result;
        }
        
        // Display output
        output.forEach(item => {
            appendOutput(item.type, item.text);
        });
        
        // Display result
        if (result !== null && result !== undefined) {
            appendOutput('result', `→ ${formatValue(result)}`);
        }
        
        const elapsed = (performance.now() - startTime).toFixed(1);
        document.getElementById('execTime').style.display = 'flex';
        document.getElementById('execTimeValue').textContent = elapsed;
        
        setStatus('ready', 'Done');
    } catch (error) {
        appendOutput('error', `Error: ${error.message}`);
        if (error.traceback) {
            appendOutput('error', error.traceback);
        }
        setStatus('error', 'Error');
    }
    
    document.getElementById('runBtn').disabled = false;
}

function formatValue(value) {
    if (value === null) return 'None';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

// ============================================
// OUTPUT HELPERS
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

function setStatus(state, text) {
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
    if (EXAMPLES[name]) {
        editor.setValue(EXAMPLES[name]);
        clearOutput();
    }
}

function shareCode() {
    const code = editor.getValue();
    const encoded = btoa(unescape(encodeURIComponent(code)));
    const url = `${window.location.origin}${window.location.pathname}#code=${encoded}`;
    
    navigator.clipboard.writeText(url).then(() => {
        showToast('Link copied!');
    }).catch(() => {
        prompt('Copy this link:', url);
    });
}

function loadFromUrl() {
    const hash = window.location.hash;
    if (hash.startsWith('#code=')) {
        try {
            const encoded = hash.slice(6);
            const code = decodeURIComponent(escape(atob(encoded)));
            editor.setValue(code);
        } catch (e) {
            console.error('Failed to load code from URL:', e);
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
