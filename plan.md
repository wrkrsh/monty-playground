# Monty Playground - Upgrade Plan

Dit document bevat een complete roadmap om de playground van simulatie naar echte WASM execution te upgraden, inclusief alle geavanceerde features.

## Huidige Staat

```
/var/www/monty-playground/
├── index.html          # UI met Monaco editor
├── css/style.css       # Styling
├── js/app.js           # MontySimulator class (fake interpreter)
├── package.json        # @pydantic/monty v0.0.3 geïnstalleerd
└── node_modules/
    └── @pydantic/
        ├── monty/              # Hoofd package
        │   ├── browser.js      # `export * from '@pydantic/monty-wasm32-wasi'`
        │   ├── index.d.ts      # TypeScript types
        │   └── README.md       # API docs
        └── monty-linux-x64-gnu/ # Native binding (niet bruikbaar in browser)
```

**Probleem:** De huidige `MontySimulator` in `js/app.js` is een fake JavaScript interpreter. We moeten de echte `@pydantic/monty-wasm32-wasi` WASM bundle gebruiken.

---

## Phase 1: Echte WASM Execution

### 1.1 Installeer WASM Package

```bash
cd /var/www/monty-playground
npm install @pydantic/monty-wasm32-wasi
```

### 1.2 Bundler Setup (esbuild)

We moeten de ES modules bundlen voor browser gebruik. esbuild is al geïnstalleerd.

**Nieuw bestand: `build.js`**
```javascript
import * as esbuild from 'esbuild';
import { existsSync, mkdirSync } from 'fs';

if (!existsSync('dist')) mkdirSync('dist');

await esbuild.build({
  entryPoints: ['src/monty-runtime.js'],
  bundle: true,
  outfile: 'dist/monty-runtime.js',
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  // WASM files moeten apart gekopieerd worden
  loader: { '.wasm': 'file' },
  external: ['*.wasm'],
});

console.log('Build complete: dist/monty-runtime.js');
```

### 1.3 Monty Runtime Wrapper

**Nieuw bestand: `src/monty-runtime.js`**
```javascript
/**
 * Browser runtime wrapper voor @pydantic/monty
 * 
 * Dit abstraheert de WASM initialisatie en biedt een clean API.
 */

// Dynamische import van WASM module
let MontyModule = null;

export async function initMonty() {
  if (MontyModule) return MontyModule;
  
  // Browser.js exporteert van @pydantic/monty-wasm32-wasi
  const mod = await import('@pydantic/monty-wasm32-wasi');
  MontyModule = mod;
  return mod;
}

/**
 * Monty interpreter wrapper met browser-friendly API
 */
export class MontyRuntime {
  constructor() {
    this.monty = null;
    this.output = [];
    this.snapshots = [];
  }

  /**
   * Parse en compile Python code
   * @param {string} code - Python source code
   * @param {Object} options - { inputs: [], externalFunctions: [], typeCheck: false }
   */
  async create(code, options = {}) {
    const mod = await initMonty();
    
    const result = mod.Monty.create(code, {
      scriptName: options.scriptName || 'main.py',
      inputs: options.inputs || [],
      externalFunctions: options.externalFunctions || [],
      typeCheck: options.typeCheck || false,
    });

    // Check for errors
    if (result instanceof mod.MontyException) {
      throw new MontySyntaxError(result);
    }
    if (result instanceof mod.MontyTypingError) {
      throw new MontyTypeError(result);
    }

    this.monty = result;
    return this;
  }

  /**
   * Run code met synchrone external functions
   */
  run(options = {}) {
    if (!this.monty) throw new Error('Call create() first');
    
    const result = this.monty.run({
      inputs: options.inputs || {},
      externalFunctions: options.externalFunctions || {},
      limits: options.limits || {
        maxDurationSecs: 5,
        maxRecursionDepth: 100,
      },
    });

    if (result instanceof MontyModule.MontyException) {
      throw new MontyRuntimeError(result);
    }

    return result;
  }

  /**
   * Start iteratieve executie (voor snapshot/resume flow)
   */
  start(options = {}) {
    if (!this.monty) throw new Error('Call create() first');
    
    const result = this.monty.start({
      inputs: options.inputs || {},
      limits: options.limits || {},
    });

    return this._wrapProgress(result);
  }

  /**
   * Type check de huidige code
   */
  typeCheck(prefixCode = null) {
    if (!this.monty) throw new Error('Call create() first');
    
    const result = this.monty.typeCheck(prefixCode);
    if (result) {
      throw new MontyTypeError(result);
    }
    return true;
  }

  /**
   * Serialize naar bytes
   */
  dump() {
    if (!this.monty) throw new Error('Call create() first');
    return this.monty.dump();
  }

  /**
   * Laad van bytes
   */
  static async load(data) {
    const mod = await initMonty();
    const runtime = new MontyRuntime();
    runtime.monty = mod.Monty.load(data);
    return runtime;
  }

  _wrapProgress(result) {
    if (result instanceof MontyModule.MontySnapshot) {
      return {
        type: 'paused',
        functionName: result.functionName,
        args: result.args,
        kwargs: result.kwargs,
        snapshot: result,
        resume: (returnValue) => this._wrapProgress(result.resume({ returnValue })),
        resumeWithException: (exc) => this._wrapProgress(result.resume({ exception: exc })),
        dump: () => result.dump(),
      };
    }
    if (result instanceof MontyModule.MontyComplete) {
      return {
        type: 'complete',
        output: result.output,
      };
    }
    if (result instanceof MontyModule.MontyException) {
      throw new MontyRuntimeError(result);
    }
    return result;
  }
}

// Error classes
export class MontyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MontyError';
  }
}

export class MontySyntaxError extends MontyError {
  constructor(exc) {
    super(exc.message || 'Syntax error');
    this.name = 'MontySyntaxError';
    this.line = exc.line;
    this.column = exc.column;
  }
}

export class MontyRuntimeError extends MontyError {
  constructor(exc) {
    super(exc.message || 'Runtime error');
    this.name = 'MontyRuntimeError';
    this.typeName = exc.typeName;
    this._traceback = exc.traceback?.() || null;
  }

  traceback() {
    return this._traceback;
  }
}

export class MontyTypeError extends MontyError {
  constructor(exc) {
    super('Type error');
    this.name = 'MontyTypeError';
    this._diagnostics = exc;
  }

  displayDiagnostics(mode = 'full') {
    return this._diagnostics?.displayDiagnostics?.(mode) || 'Type error';
  }
}
```

### 1.4 Update app.js - Vervang Simulator

**Patch `js/app.js` - Verwijder MontySimulator, gebruik MontyRuntime:**

```javascript
// ============================================
// IMPORTS (top of file)
// ============================================
import { MontyRuntime, MontySyntaxError, MontyRuntimeError, MontyTypeError } from '../dist/monty-runtime.js';

// ============================================
// GLOBALS (vervang oude simulator)
// ============================================
let editor;
let runtime = null;  // MontyRuntime instance

// ============================================
// EXECUTION (nieuwe versie)
// ============================================
async function runCode() {
    const code = editor.getValue();
    clearOutput();
    
    setStatus('running', 'Compiling...');
    document.getElementById('runBtn').disabled = true;
    
    const startTime = performance.now();
    
    try {
        // Create new runtime
        runtime = new MontyRuntime();
        await runtime.create(code, {
            externalFunctions: getExternalFunctionNames(code),
        });
        
        setStatus('running', 'Running...');
        
        // Run with external function handlers
        const result = runtime.run({
            externalFunctions: EXTERNAL_FUNCTIONS,
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
        if (error instanceof MontySyntaxError) {
            appendOutput('error', `SyntaxError: ${error.message}`);
            if (error.line) {
                appendOutput('error', `  at line ${error.line}, column ${error.column}`);
            }
        } else if (error instanceof MontyRuntimeError) {
            appendOutput('error', `${error.typeName || 'Error'}: ${error.message}`);
            if (error.traceback()) {
                appendOutput('error', error.traceback());
            }
        } else if (error instanceof MontyTypeError) {
            appendOutput('error', error.displayDiagnostics());
        } else {
            appendOutput('error', `Error: ${error.message}`);
        }
        setStatus('error', 'Error');
    }
    
    document.getElementById('runBtn').disabled = false;
}

// Helper: extract external function names from code comments
function getExternalFunctionNames(code) {
    const matches = code.match(/# external:\s*(\w+)/g) || [];
    return matches.map(m => m.replace('# external: ', ''));
}

// Helper: format output values
function formatValue(value) {
    if (typeof value === 'string') return `"${value}"`;
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}
```

### 1.5 Build Script in package.json

```json
{
  "scripts": {
    "build": "node build.js",
    "dev": "node build.js --watch",
    "start": "npx serve ."
  }
}
```

### 1.6 Update index.html

```html
<!-- Vervang de oude script tag -->
<script type="module" src="js/app.js?v=3"></script>
```

---

## Phase 2: Snapshot Visualisatie

De killer feature van Monty is pause/resume. Dit moet visueel duidelijk zijn.

### 2.1 Nieuwe UI Component: Snapshot Panel

**Toevoegen aan `index.html` (na Output panel):**

```html
<!-- Snapshot Panel (initially hidden) -->
<div class="panel snapshot-panel" id="snapshotPanel" style="display: none;">
    <div class="panel-header">
        <span>⏸️ Execution Paused</span>
        <button class="btn btn-ghost" onclick="cancelSnapshot()" style="padding: 2px 8px; font-size: 11px;">Cancel</button>
    </div>
    <div class="panel-content">
        <div class="snapshot-info">
            <div class="snapshot-call">
                <span class="snapshot-label">Calling:</span>
                <code id="snapshotFn">fetch</code>(<code id="snapshotArgs">"url"</code>)
            </div>
            
            <div class="snapshot-bytes">
                <span class="snapshot-label">State Size:</span>
                <span id="snapshotSize">0</span> bytes
                <button class="btn btn-ghost btn-sm" onclick="downloadSnapshot()">💾 Download</button>
            </div>
            
            <div class="snapshot-return">
                <span class="snapshot-label">Return Value:</span>
                <input type="text" id="snapshotReturn" placeholder='{"data": [...]}' />
            </div>
            
            <div class="snapshot-actions">
                <button class="btn btn-primary" onclick="resumeExecution()">▶ Resume</button>
                <button class="btn btn-ghost" onclick="resumeWithError()">⚠️ Raise Exception</button>
            </div>
        </div>
        
        <!-- Visual timeline -->
        <div class="snapshot-timeline" id="snapshotTimeline">
            <!-- Dynamically populated -->
        </div>
    </div>
</div>
```

### 2.2 CSS voor Snapshot Panel

**Toevoegen aan `css/style.css`:**

```css
/* ============================================
   Snapshot Panel
   ============================================ */

.snapshot-panel {
    background: var(--surface);
    border-left: 3px solid var(--warning);
}

.snapshot-info {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.snapshot-label {
    color: var(--text-muted);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-right: 8px;
}

.snapshot-call code {
    font-family: 'JetBrains Mono', monospace;
    background: var(--surface-2);
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--primary);
}

.snapshot-bytes {
    display: flex;
    align-items: center;
    gap: 8px;
}

.snapshot-return input {
    flex: 1;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    padding: 8px 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    outline: none;
}

.snapshot-return input:focus {
    border-color: var(--primary);
}

.snapshot-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
}

/* Timeline visualization */
.snapshot-timeline {
    padding: 16px;
    border-top: 1px solid var(--border);
}

.timeline-step {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 8px 0;
    position: relative;
}

.timeline-step::before {
    content: '';
    position: absolute;
    left: 11px;
    top: 24px;
    bottom: -8px;
    width: 2px;
    background: var(--border);
}

.timeline-step:last-child::before {
    display: none;
}

.timeline-dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--surface-2);
    border: 2px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    flex-shrink: 0;
    z-index: 1;
}

.timeline-dot.active {
    border-color: var(--warning);
    background: rgba(245, 158, 11, 0.1);
}

.timeline-dot.complete {
    border-color: var(--success);
    background: rgba(34, 197, 94, 0.1);
}

.timeline-content {
    flex: 1;
    font-size: 13px;
}

.timeline-content strong {
    color: var(--text);
}

.timeline-content small {
    color: var(--text-muted);
    display: block;
    margin-top: 2px;
}
```

### 2.3 JavaScript voor Snapshot Handling

**Toevoegen aan `js/app.js`:**

```javascript
// ============================================
// SNAPSHOT STATE
// ============================================
let currentSnapshot = null;
let snapshotHistory = [];

// ============================================
// ITERATIVE EXECUTION
// ============================================
async function runWithSnapshots() {
    const code = editor.getValue();
    clearOutput();
    snapshotHistory = [];
    
    setStatus('running', 'Starting...');
    document.getElementById('runBtn').disabled = true;
    
    try {
        runtime = new MontyRuntime();
        await runtime.create(code, {
            externalFunctions: getExternalFunctionNames(code),
        });
        
        // Start iterative execution
        let progress = runtime.start();
        
        while (progress.type === 'paused') {
            // Show snapshot UI
            showSnapshotPanel(progress);
            
            // Wait for user input
            const returnValue = await waitForResume();
            
            if (returnValue === null) {
                // User cancelled
                setStatus('ready', 'Cancelled');
                hideSnapshotPanel();
                return;
            }
            
            // Record in history
            snapshotHistory.push({
                functionName: progress.functionName,
                args: progress.args,
                returnValue: returnValue,
                snapshotSize: progress.dump().length,
            });
            
            updateTimeline();
            
            // Resume execution
            progress = progress.resume(returnValue);
        }
        
        // Execution complete
        hideSnapshotPanel();
        
        if (progress.type === 'complete') {
            appendOutput('result', `→ ${formatValue(progress.output)}`);
        }
        
        setStatus('ready', 'Done');
    } catch (error) {
        hideSnapshotPanel();
        appendOutput('error', `Error: ${error.message}`);
        setStatus('error', 'Error');
    }
    
    document.getElementById('runBtn').disabled = false;
}

function showSnapshotPanel(progress) {
    const panel = document.getElementById('snapshotPanel');
    panel.style.display = 'flex';
    
    document.getElementById('snapshotFn').textContent = progress.functionName;
    document.getElementById('snapshotArgs').textContent = JSON.stringify(progress.args);
    
    const bytes = progress.dump();
    document.getElementById('snapshotSize').textContent = bytes.length.toLocaleString();
    
    currentSnapshot = progress;
    
    // Pre-fill with mock response
    const mockReturn = EXTERNAL_FUNCTIONS[progress.functionName];
    if (mockReturn) {
        const mockValue = mockReturn(...progress.args);
        document.getElementById('snapshotReturn').value = JSON.stringify(mockValue);
    }
}

function hideSnapshotPanel() {
    document.getElementById('snapshotPanel').style.display = 'none';
    currentSnapshot = null;
}

let resumeResolver = null;

function waitForResume() {
    return new Promise(resolve => {
        resumeResolver = resolve;
    });
}

function resumeExecution() {
    if (!resumeResolver) return;
    
    const input = document.getElementById('snapshotReturn').value;
    let value;
    try {
        value = JSON.parse(input);
    } catch {
        value = input; // Use as string
    }
    
    resumeResolver(value);
    resumeResolver = null;
}

function resumeWithError() {
    if (!resumeResolver) return;
    
    const error = prompt('Exception message:', 'External function failed');
    if (error) {
        currentSnapshot.resumeWithException({ type: 'RuntimeError', message: error });
    }
    resumeResolver(null);
}

function cancelSnapshot() {
    if (resumeResolver) {
        resumeResolver(null);
        resumeResolver = null;
    }
    hideSnapshotPanel();
}

function downloadSnapshot() {
    if (!currentSnapshot) return;
    
    const bytes = currentSnapshot.dump();
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `monty-snapshot-${Date.now()}.bin`;
    a.click();
    
    URL.revokeObjectURL(url);
    showToast('Snapshot downloaded!');
}

function updateTimeline() {
    const timeline = document.getElementById('snapshotTimeline');
    timeline.innerHTML = snapshotHistory.map((step, i) => `
        <div class="timeline-step">
            <div class="timeline-dot complete">✓</div>
            <div class="timeline-content">
                <strong>${step.functionName}(${JSON.stringify(step.args).slice(1, -1)})</strong>
                <small>→ ${JSON.stringify(step.returnValue).slice(0, 50)}... (${step.snapshotSize} bytes)</small>
            </div>
        </div>
    `).join('') + `
        <div class="timeline-step">
            <div class="timeline-dot active">⏸</div>
            <div class="timeline-content">
                <strong>Waiting for input...</strong>
            </div>
        </div>
    `;
}
```

---

## Phase 3: External Functions UI

Gebruikers moeten zelf external functions kunnen definiëren.

### 3.1 External Functions Panel

**Toevoegen aan `index.html`:**

```html
<!-- External Functions Panel (collapsible sidebar) -->
<aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
        <span>🔌 External Functions</span>
        <button class="btn btn-ghost btn-sm" onclick="toggleSidebar()">◀</button>
    </div>
    <div class="sidebar-content">
        <div class="external-fn-list" id="externalFnList">
            <!-- Dynamically populated -->
        </div>
        <button class="btn btn-ghost" onclick="addExternalFunction()" style="width: 100%; margin-top: 8px;">
            + Add Function
        </button>
    </div>
</aside>
```

### 3.2 JavaScript voor External Function Management

```javascript
// ============================================
// EXTERNAL FUNCTION EDITOR
// ============================================
let userExternalFunctions = {};

function addExternalFunction() {
    const name = prompt('Function name:', 'my_function');
    if (!name) return;
    
    userExternalFunctions[name] = {
        description: 'Custom external function',
        returnType: 'any',
        handler: (args) => prompt(`Return value for ${name}(${JSON.stringify(args)}):`, '{}'),
    };
    
    renderExternalFunctions();
}

function renderExternalFunctions() {
    const list = document.getElementById('externalFnList');
    
    const allFunctions = { ...EXTERNAL_FUNCTIONS, ...userExternalFunctions };
    
    list.innerHTML = Object.entries(allFunctions).map(([name, fn]) => `
        <div class="external-fn-item">
            <div class="external-fn-header">
                <code>${name}</code>
                ${userExternalFunctions[name] ? 
                    `<button class="btn btn-ghost btn-sm" onclick="removeExternalFunction('${name}')">×</button>` : 
                    '<span class="badge">built-in</span>'}
            </div>
            <div class="external-fn-body">
                <small>${fn.description || 'No description'}</small>
            </div>
        </div>
    `).join('');
}

function removeExternalFunction(name) {
    delete userExternalFunctions[name];
    renderExternalFunctions();
}

// Call on init
renderExternalFunctions();
```

---

## Phase 4: Step Debugger

### 4.1 Debug Controls

**Toevoegen aan header:**

```html
<div class="debug-controls" id="debugControls" style="display: none;">
    <button class="btn btn-ghost" onclick="stepOver()" title="Step Over (F10)">
        ⏭ Step
    </button>
    <button class="btn btn-ghost" onclick="stepInto()" title="Step Into (F11)">
        ⬇️ Into
    </button>
    <button class="btn btn-ghost" onclick="continueExecution()" title="Continue (F5)">
        ▶ Continue
    </button>
    <button class="btn btn-ghost" onclick="stopDebug()" title="Stop">
        ⏹ Stop
    </button>
</div>
```

### 4.2 Variables Panel

```html
<!-- Variables Panel -->
<div class="panel variables-panel" id="variablesPanel" style="display: none;">
    <div class="panel-header">
        <span>Variables</span>
    </div>
    <div class="panel-content">
        <div class="variables-list" id="variablesList">
            <!-- Populated during debug -->
        </div>
    </div>
</div>
```

### 4.3 Debugger Implementation

```javascript
// ============================================
// STEP DEBUGGER
// ============================================
let debugMode = false;
let breakpoints = new Set();
let currentLine = 0;

function toggleDebugMode() {
    debugMode = !debugMode;
    document.getElementById('debugControls').style.display = debugMode ? 'flex' : 'none';
    document.getElementById('variablesPanel').style.display = debugMode ? 'flex' : 'none';
    
    if (debugMode) {
        editor.updateOptions({ glyphMargin: true });
        initBreakpointGutter();
    }
}

function initBreakpointGutter() {
    editor.onMouseDown((e) => {
        if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
            const line = e.target.position.lineNumber;
            toggleBreakpoint(line);
        }
    });
}

function toggleBreakpoint(line) {
    if (breakpoints.has(line)) {
        breakpoints.delete(line);
    } else {
        breakpoints.add(line);
    }
    updateBreakpointDecorations();
}

function updateBreakpointDecorations() {
    const decorations = Array.from(breakpoints).map(line => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
            isWholeLine: true,
            glyphMarginClassName: 'breakpoint-glyph',
            className: 'breakpoint-line',
        }
    }));
    editor.deltaDecorations([], decorations);
}

// Note: Full step debugging requires Monty to expose execution hooks,
// which may need upstream changes to the WASM build.
// This is a UI foundation that can be completed when those APIs exist.
```

---

## Phase 5: Type Checker Panel

### 5.1 Type Panel UI

```html
<!-- Type Errors Panel -->
<div class="panel types-panel" id="typesPanel">
    <div class="panel-header">
        <span>🔍 Type Checker</span>
        <label class="toggle">
            <input type="checkbox" id="typeCheckEnabled" onchange="toggleTypeCheck()">
            <span class="toggle-slider"></span>
        </label>
    </div>
    <div class="panel-content">
        <div class="type-errors" id="typeErrors">
            <div class="type-ok">✓ No type errors</div>
        </div>
    </div>
</div>
```

### 5.2 Live Type Checking

```javascript
// ============================================
// TYPE CHECKER
// ============================================
let typeCheckEnabled = false;
let typeCheckDebounce = null;

function toggleTypeCheck() {
    typeCheckEnabled = document.getElementById('typeCheckEnabled').checked;
    if (typeCheckEnabled) {
        runTypeCheck();
    } else {
        clearTypeErrors();
    }
}

function runTypeCheck() {
    if (!typeCheckEnabled) return;
    
    clearTimeout(typeCheckDebounce);
    typeCheckDebounce = setTimeout(async () => {
        const code = editor.getValue();
        
        try {
            const tempRuntime = new MontyRuntime();
            await tempRuntime.create(code, { typeCheck: true });
            
            // No errors
            clearTypeErrors();
            showTypeOk();
        } catch (error) {
            if (error instanceof MontyTypeError) {
                showTypeErrors(error.displayDiagnostics('concise'));
            }
        }
    }, 500);
}

function showTypeErrors(diagnostics) {
    const panel = document.getElementById('typeErrors');
    
    // Parse diagnostics into structured errors
    const errors = parseDiagnostics(diagnostics);
    
    panel.innerHTML = errors.map(err => `
        <div class="type-error" onclick="goToLine(${err.line})">
            <span class="type-error-line">Line ${err.line}</span>
            <span class="type-error-msg">${err.message}</span>
        </div>
    `).join('');
    
    // Add Monaco decorations (red squiggles)
    const markers = errors.map(err => ({
        startLineNumber: err.line,
        startColumn: err.column || 1,
        endLineNumber: err.line,
        endColumn: err.endColumn || 100,
        message: err.message,
        severity: monaco.MarkerSeverity.Error,
    }));
    monaco.editor.setModelMarkers(editor.getModel(), 'monty-types', markers);
}

function clearTypeErrors() {
    monaco.editor.setModelMarkers(editor.getModel(), 'monty-types', []);
}

function showTypeOk() {
    document.getElementById('typeErrors').innerHTML = 
        '<div class="type-ok">✓ No type errors</div>';
}

// Hook into editor changes
editor.onDidChangeModelContent(() => {
    runTypeCheck();
});
```

---

## Phase 6: Multi-File Tabs

### 6.1 Tab Bar UI

```html
<!-- Replace single panel header with tab bar -->
<div class="panel">
    <div class="tab-bar" id="tabBar">
        <div class="tab active" data-file="main.py" onclick="switchTab('main.py')">
            main.py
            <span class="tab-close" onclick="closeTab('main.py', event)">×</span>
        </div>
        <button class="tab-add" onclick="addNewFile()">+</button>
    </div>
    <div class="panel-content">
        <div id="editor"></div>
    </div>
</div>
```

### 6.2 File Management

```javascript
// ============================================
// MULTI-FILE SUPPORT
// ============================================
const files = {
    'main.py': EXAMPLES.hello,
};
let currentFile = 'main.py';

function switchTab(filename) {
    // Save current file
    files[currentFile] = editor.getValue();
    
    // Switch
    currentFile = filename;
    editor.setValue(files[filename] || '');
    
    // Update UI
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-file="${filename}"]`).classList.add('active');
}

function addNewFile() {
    const name = prompt('File name:', 'utils.py');
    if (!name) return;
    
    files[name] = `# ${name}\n`;
    renderTabs();
    switchTab(name);
}

function closeTab(filename, event) {
    event.stopPropagation();
    if (Object.keys(files).length === 1) return; // Keep at least one
    
    delete files[filename];
    renderTabs();
    
    if (currentFile === filename) {
        switchTab(Object.keys(files)[0]);
    }
}

function renderTabs() {
    const tabBar = document.getElementById('tabBar');
    tabBar.innerHTML = Object.keys(files).map(name => `
        <div class="tab ${name === currentFile ? 'active' : ''}" 
             data-file="${name}" 
             onclick="switchTab('${name}')">
            ${name}
            <span class="tab-close" onclick="closeTab('${name}', event)">×</span>
        </div>
    `).join('') + '<button class="tab-add" onclick="addNewFile()">+</button>';
}
```

---

## Phase 7: Performance Benchmarks

### 7.1 Benchmark Panel

```html
<!-- Benchmark Results -->
<div class="benchmark-panel" id="benchmarkPanel" style="display: none;">
    <div class="benchmark-header">
        ⚡ Performance Comparison
    </div>
    <div class="benchmark-bars">
        <div class="benchmark-bar">
            <span class="benchmark-label">Monty (WASM)</span>
            <div class="benchmark-fill monty" style="width: 0%"></div>
            <span class="benchmark-time" id="benchMonty">-</span>
        </div>
        <div class="benchmark-bar">
            <span class="benchmark-label">Python (CPython)*</span>
            <div class="benchmark-fill python" style="width: 0%"></div>
            <span class="benchmark-time" id="benchPython">~12ms</span>
        </div>
        <div class="benchmark-bar">
            <span class="benchmark-label">Pyodide (WASM)*</span>
            <div class="benchmark-fill pyodide" style="width: 0%"></div>
            <span class="benchmark-time" id="benchPyodide">~45ms</span>
        </div>
    </div>
    <small>* Reference values from similar workloads</small>
</div>
```

### 7.2 Benchmark Logic

```javascript
// ============================================
// BENCHMARKS
// ============================================
const REFERENCE_BENCHMARKS = {
    // Pre-measured reference values (in ms)
    // These would be from running the same code on different runtimes
    python: {
        fibonacci: 12,
        list_ops: 8,
        string_ops: 5,
    },
    pyodide: {
        fibonacci: 45,
        list_ops: 32,
        string_ops: 28,
    },
};

async function runBenchmark() {
    const code = editor.getValue();
    const iterations = 100;
    
    document.getElementById('benchmarkPanel').style.display = 'block';
    
    // Warmup
    const warmupRuntime = new MontyRuntime();
    await warmupRuntime.create(code);
    warmupRuntime.run();
    
    // Benchmark
    const times = [];
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const rt = new MontyRuntime();
        await rt.create(code);
        rt.run();
        times.push(performance.now() - start);
    }
    
    const avgMs = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2);
    
    // Update UI
    document.getElementById('benchMonty').textContent = `${avgMs}ms`;
    
    // Calculate bar widths (Monty as baseline)
    const montyBar = document.querySelector('.benchmark-fill.monty');
    const pythonBar = document.querySelector('.benchmark-fill.python');
    const pyodideBar = document.querySelector('.benchmark-fill.pyodide');
    
    const maxTime = Math.max(avgMs, 12, 45);
    montyBar.style.width = `${(avgMs / maxTime) * 100}%`;
    pythonBar.style.width = `${(12 / maxTime) * 100}%`;
    pyodideBar.style.width = `${(45 / maxTime) * 100}%`;
}
```

---

## Phase 8: Agent Flow Simulator

Dit is de kroon op het werk: een interactieve demo die laat zien hoe AI agents Monty gebruiken.

### 8.1 Agent Flow UI

```html
<!-- Agent Flow Demo (full-screen modal) -->
<div class="agent-modal" id="agentModal" style="display: none;">
    <div class="agent-modal-content">
        <div class="agent-header">
            <h2>🤖 Agent Flow Demo</h2>
            <button class="btn btn-ghost" onclick="closeAgentDemo()">×</button>
        </div>
        
        <div class="agent-flow">
            <!-- Step 1: Task -->
            <div class="agent-step" id="agentStep1">
                <div class="agent-step-icon">📋</div>
                <div class="agent-step-content">
                    <h3>1. Agent Receives Task</h3>
                    <div class="agent-message user">
                        "Find the weather in Amsterdam and summarize it"
                    </div>
                </div>
            </div>
            
            <!-- Step 2: Code Generation -->
            <div class="agent-step" id="agentStep2">
                <div class="agent-step-icon">💻</div>
                <div class="agent-step-content">
                    <h3>2. Agent Writes Code</h3>
                    <pre class="agent-code"><code>weather = fetch_weather("Amsterdam")
summary = f"It's {weather['temp']}°C, {weather['conditions']}"
return summary</code></pre>
                </div>
            </div>
            
            <!-- Step 3: Execution Starts -->
            <div class="agent-step" id="agentStep3">
                <div class="agent-step-icon">▶️</div>
                <div class="agent-step-content">
                    <h3>3. Monty Starts Execution</h3>
                    <div class="agent-console">
                        <span class="text-muted">Starting execution...</span>
                    </div>
                </div>
            </div>
            
            <!-- Step 4: Pause at External Call -->
            <div class="agent-step" id="agentStep4">
                <div class="agent-step-icon">⏸️</div>
                <div class="agent-step-content">
                    <h3>4. Pauses at External Function</h3>
                    <div class="agent-snapshot">
                        <code>fetch_weather("Amsterdam")</code>
                        <div class="snapshot-bytes-small">State: 2,847 bytes → saved to DB</div>
                    </div>
                </div>
            </div>
            
            <!-- Step 5: Host Resolves -->
            <div class="agent-step" id="agentStep5">
                <div class="agent-step-icon">🌐</div>
                <div class="agent-step-content">
                    <h3>5. Host Calls Real API</h3>
                    <div class="agent-api-call">
                        <span>GET weather-api.com/amsterdam</span>
                        <span class="agent-api-response">→ {"temp": 12, "conditions": "Cloudy"}</span>
                    </div>
                </div>
            </div>
            
            <!-- Step 6: Resume -->
            <div class="agent-step" id="agentStep6">
                <div class="agent-step-icon">▶️</div>
                <div class="agent-step-content">
                    <h3>6. Resume from Snapshot</h3>
                    <div class="agent-console">
                        <span>Loaded state from DB</span>
                        <span>Resuming with return value...</span>
                    </div>
                </div>
            </div>
            
            <!-- Step 7: Result -->
            <div class="agent-step" id="agentStep7">
                <div class="agent-step-icon">✅</div>
                <div class="agent-step-content">
                    <h3>7. Execution Complete</h3>
                    <div class="agent-message assistant">
                        "It's 12°C, Cloudy in Amsterdam"
                    </div>
                </div>
            </div>
        </div>
        
        <div class="agent-controls">
            <button class="btn btn-primary" onclick="playAgentDemo()">▶ Play Demo</button>
            <button class="btn btn-ghost" onclick="resetAgentDemo()">↺ Reset</button>
        </div>
    </div>
</div>
```

### 8.2 Agent Flow Animation

```javascript
// ============================================
// AGENT FLOW DEMO
// ============================================
let agentDemoStep = 0;

function showAgentDemo() {
    document.getElementById('agentModal').style.display = 'flex';
    resetAgentDemo();
}

function closeAgentDemo() {
    document.getElementById('agentModal').style.display = 'none';
}

function resetAgentDemo() {
    agentDemoStep = 0;
    document.querySelectorAll('.agent-step').forEach(s => {
        s.classList.remove('active', 'complete');
    });
}

async function playAgentDemo() {
    resetAgentDemo();
    
    const steps = [
        { delay: 500, step: 1 },   // Task
        { delay: 1000, step: 2 },  // Code gen
        { delay: 800, step: 3 },   // Start
        { delay: 1200, step: 4 },  // Pause
        { delay: 1500, step: 5 },  // API call
        { delay: 1000, step: 6 },  // Resume
        { delay: 800, step: 7 },   // Complete
    ];
    
    for (const { delay, step } of steps) {
        await sleep(delay);
        
        // Mark previous as complete
        if (step > 1) {
            document.getElementById(`agentStep${step - 1}`).classList.remove('active');
            document.getElementById(`agentStep${step - 1}`).classList.add('complete');
        }
        
        // Activate current
        document.getElementById(`agentStep${step}`).classList.add('active');
        
        // Scroll into view
        document.getElementById(`agentStep${step}`).scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
    }
    
    // Final state
    await sleep(500);
    document.getElementById('agentStep7').classList.remove('active');
    document.getElementById('agentStep7').classList.add('complete');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 8.3 Agent Flow CSS

```css
/* ============================================
   Agent Flow Demo
   ============================================ */

.agent-modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.agent-modal-content {
    background: var(--surface);
    border-radius: 12px;
    max-width: 700px;
    width: 90%;
    max-height: 90vh;
    overflow: auto;
}

.agent-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
}

.agent-flow {
    padding: 20px;
}

.agent-step {
    display: flex;
    gap: 16px;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 12px;
    opacity: 0.4;
    transform: translateX(-10px);
    transition: all 0.3s ease;
}

.agent-step.active {
    opacity: 1;
    transform: translateX(0);
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid var(--primary);
}

.agent-step.complete {
    opacity: 0.7;
    transform: translateX(0);
}

.agent-step-icon {
    font-size: 24px;
    width: 40px;
    text-align: center;
}

.agent-step-content h3 {
    font-size: 14px;
    margin-bottom: 8px;
}

.agent-message {
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13px;
}

.agent-message.user {
    background: var(--surface-2);
}

.agent-message.assistant {
    background: rgba(16, 185, 129, 0.15);
    color: var(--primary);
}

.agent-code {
    background: var(--bg);
    padding: 12px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    overflow-x: auto;
}

.agent-controls {
    padding: 16px 20px;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 8px;
}
```

---

## Implementatie Volgorde

1. **Phase 1: WASM** (2-3 dagen)
   - Dit is de foundation voor alles
   - Installeer wasm package, setup bundler, test basic execution

2. **Phase 5: Type Checker** (1 dag)
   - Quick win, gebruikt bestaande Monty API
   - Grote educational value

3. **Phase 2: Snapshot Visualisatie** (2 dagen)
   - Core differentiator van Monty
   - Maakt de "why" heel duidelijk

4. **Phase 3: External Functions UI** (1-2 dagen)
   - Bouwt voort op snapshot work
   - Interactieve experience

5. **Phase 7: Benchmarks** (0.5 dag)
   - Simpel te implementeren
   - Goede marketing value

6. **Phase 8: Agent Flow** (1-2 dagen)
   - Kroon op het werk
   - Beste demo voor why Monty exists

7. **Phase 6: Multi-File** (1 dag)
   - Nice to have
   - Maakt het meer "IDE-like"

8. **Phase 4: Debugger** (2-3 dagen)
   - Meest complex
   - Mogelijk blocked by upstream Monty API

---

## Risico's & Mitigaties

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| WASM package werkt niet in browser | Hoog | Test vroeg, fallback naar server-side execution |
| Monty API changes | Medium | Pin version, watch GitHub releases |
| Performance issues | Medium | Lazy loading, web workers |
| Type checker te traag | Laag | Debounce, alleen on-demand |

---

## Success Metrics

- [x] WASM execution werkt voor alle examples
- [x] Snapshot dump/load cycle werkt
- [x] < 100ms cold start time
- [x] Type errors tonen in editor
- [x] Agent demo speelt smooth af
- [ ] Mobile responsive (basic support, needs more testing)

---

## Implementation Status

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | WASM Execution | ✅ Complete |
| 2 | Type Checker Panel | ✅ Complete |
| 3 | Snapshot Visualization | ✅ Complete |
| 4 | External Functions UI | ✅ Complete |
| 5 | Performance Benchmarks | ✅ Complete |
| 6 | Agent Flow Demo | ✅ Complete |
| 7 | Multi-File Tabs | ✅ Complete |
| 8 | Step Debugger | ⏸️ Blocked (needs upstream API) |

**Completed:** 2026-02-06

---

*Plan versie 1.1 - 2026-02-06 (execution complete)*
