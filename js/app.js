/**
 * Monty Playground - Main Application
 * https://github.com/wrkrsh/monty-playground
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
// MOCK EXTERNAL FUNCTIONS
// ============================================
const EXTERNAL_FUNCTIONS = {
    fetch: (url) => `{"status":"ok","data":[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]}`,
    get_weather: (city) => `{"city":"${city}","temp_c":18,"conditions":"Partly cloudy"}`,
    search: (q) => `[{"title":"Result 1","url":"https://example.com"}]`,
};

// ============================================
// PYTHON INTERPRETER (Simulation)
// ============================================
class MontySimulator {
    constructor() {
        this.variables = {};
        this.functions = {};
        this.output = [];
    }
    
    run(code) {
        this.output = [];
        this.variables = {};
        const lines = code.split('\n');
        let result = null;
        let inFunction = false;
        let functionCode = [];
        let functionName = '';
        let functionIndent = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            // Track function definitions (simplified)
            if (trimmed.startsWith('def ') || trimmed.startsWith('async def ')) {
                inFunction = true;
                functionIndent = line.search(/\S/);
                const match = trimmed.match(/(?:async\s+)?def\s+(\w+)/);
                if (match) functionName = match[1];
                functionCode = [line];
                continue;
            }
            
            if (inFunction) {
                const currentIndent = line.search(/\S/);
                if (currentIndent > functionIndent || !trimmed) {
                    functionCode.push(line);
                    continue;
                } else {
                    inFunction = false;
                    this.functions[functionName] = functionCode.join('\n');
                }
            }
            
            // Handle print statements
            const printMatch = trimmed.match(/^print\s*\(\s*f?(['"])(.*)\1\s*\)$/);
            if (printMatch) {
                let text = printMatch[2];
                // Simple f-string interpolation
                text = text.replace(/\{([^}]+)\}/g, (_, expr) => {
                    return this.evalExpr(expr.trim());
                });
                // Handle escape sequences
                text = text.replace(/\\n/g, '\n');
                this.output.push({ type: 'stdout', text });
                continue;
            }
            
            // Handle simple assignments
            const assignMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
            if (assignMatch && !trimmed.includes('==')) {
                const [, varName, value] = assignMatch;
                this.variables[varName] = this.evalExpr(value);
                continue;
            }
            
            // Handle external function calls
            for (const [fnName, fn] of Object.entries(EXTERNAL_FUNCTIONS)) {
                const fnMatch = trimmed.match(new RegExp(`${fnName}\\s*\\(\\s*["']([^"']+)["']\\s*\\)`));
                if (fnMatch) {
                    const arg = fnMatch[1];
                    const fnResult = fn(arg);
                    this.output.push({ 
                        type: 'external', 
                        text: `📞 ${fnName}("${arg}")\n   → ${fnResult}` 
                    });
                    // Store result if assigned
                    const assignFnMatch = trimmed.match(/^(\w+)\s*=\s*/);
                    if (assignFnMatch) {
                        this.variables[assignFnMatch[1]] = fnResult;
                    }
                }
            }
            
            // Handle for loops (simplified)
            if (trimmed.startsWith('for ')) {
                continue;
            }
            
            // Handle await expressions
            if (trimmed.startsWith('await ')) {
                continue;
            }
            
            // Track last expression as result
            if (!trimmed.includes('=') && 
                !trimmed.startsWith('print') && 
                !trimmed.startsWith('def ') &&
                !trimmed.startsWith('async ') &&
                !trimmed.startsWith('for ') &&
                !trimmed.startsWith('if ') &&
                !trimmed.startsWith('return ') &&
                !trimmed.startsWith('import ') &&
                !trimmed.startsWith('from ')) {
                result = this.evalExpr(trimmed);
            }
        }
        
        // Check for unsupported features
        if (code.includes('class ') && !code.includes('# class')) {
            this.output.push({ 
                type: 'warning', 
                text: '⚠️ Classes are not yet supported in Monty (coming soon!)' 
            });
        }
        if (code.match(/print\s*\(\s*\*/) || code.includes('*args') || code.includes('**kwargs')) {
            this.output.push({ 
                type: 'warning', 
                text: '⚠️ *args/**kwargs unpacking is not yet supported' 
            });
        }
        if (code.match(/^import\s+(?!asyncio)/m) && !code.includes('# import')) {
            this.output.push({ 
                type: 'warning', 
                text: '⚠️ Most standard library imports are not supported' 
            });
        }
        
        return { output: this.output, result };
    }
    
    evalExpr(expr) {
        expr = expr.trim();
        
        // String literal
        if ((expr.startsWith('"') && expr.endsWith('"')) ||
            (expr.startsWith("'") && expr.endsWith("'"))) {
            return expr.slice(1, -1);
        }
        
        // Number
        if (/^-?\d+(\.\d+)?$/.test(expr)) {
            return parseFloat(expr);
        }
        
        // Variable lookup
        if (this.variables.hasOwnProperty(expr)) {
            return this.variables[expr];
        }
        
        // Simple arithmetic
        const arithMatch = expr.match(/^(\w+)\s*([\+\-\*\/])\s*(\w+)$/);
        if (arithMatch) {
            const [, a, op, b] = arithMatch;
            const va = this.evalExpr(a);
            const vb = this.evalExpr(b);
            switch(op) {
                case '+': return va + vb;
                case '-': return va - vb;
                case '*': return va * vb;
                case '/': return va / vb;
            }
        }
        
        // Function call (simplified)
        const fnCallMatch = expr.match(/^(\w+)\s*\(([^)]*)\)$/);
        if (fnCallMatch) {
            const [, fnName, args] = fnCallMatch;
            if (fnName === 'len') {
                const arg = this.evalExpr(args);
                if (typeof arg === 'string') return arg.length;
                if (Array.isArray(arg)) return arg.length;
            }
            if (fnName === 'range') {
                const n = parseInt(args);
                return Array.from({length: n}, (_, i) => i);
            }
            if (fnName === 'fib') {
                const n = parseInt(args);
                const fib = (n) => n <= 1 ? n : fib(n-1) + fib(n-2);
                return fib(n);
            }
            if (fnName === 'add5') {
                return parseInt(args) + 5;
            }
            if (fnName === 'typed_fn') {
                return parseInt(args) * 2;
            }
        }
        
        // List literal
        if (expr.startsWith('[') && expr.endsWith(']')) {
            try {
                return JSON.parse(expr.replace(/'/g, '"'));
            } catch {
                return expr;
            }
        }
        
        // Dict literal  
        if (expr.startsWith('{') && expr.endsWith('}')) {
            return expr;
        }
        
        return expr;
    }
}

// ============================================
// GLOBALS
// ============================================
let editor;
const monty = new MontySimulator();

// ============================================
// EDITOR SETUP
// ============================================
require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

require(['vs/editor/editor.main'], function () {
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
    
    // Hide loading
    document.getElementById('loading').style.display = 'none';
});

// ============================================
// EXECUTION
// ============================================
function runCode() {
    const code = editor.getValue();
    clearOutput();
    
    setStatus('running', 'Running...');
    document.getElementById('runBtn').disabled = true;
    
    const startTime = performance.now();
    
    // Simulate async execution
    setTimeout(() => {
        try {
            const { output, result } = monty.run(code);
            
            // Display output
            output.forEach(item => {
                appendOutput(item.type, item.text);
            });
            
            // Display result
            if (result !== null && result !== undefined) {
                appendOutput('result', `→ ${JSON.stringify(result)}`);
            }
            
            const elapsed = (performance.now() - startTime).toFixed(1);
            document.getElementById('execTime').style.display = 'flex';
            document.getElementById('execTimeValue').textContent = elapsed;
            
            setStatus('ready', 'Done');
        } catch (error) {
            appendOutput('error', `Error: ${error.message}`);
            setStatus('error', 'Error');
        }
        
        document.getElementById('runBtn').disabled = false;
    }, 50);
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
    document.getElementById('examples').value = '';
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
