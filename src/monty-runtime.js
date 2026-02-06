/**
 * Monty Runtime - Browser wrapper for @pydantic/monty WASM
 * 
 * This module provides a clean API for running Python code in the browser
 * using the Monty interpreter compiled to WebAssembly.
 */

let MontyModule = null;
let initPromise = null;

/**
 * Initialize the Monty WASM module
 * Must be called before using any Monty functionality
 */
export async function initMonty() {
    if (MontyModule) return MontyModule;
    if (initPromise) return initPromise;
    
    initPromise = (async () => {
        // Dynamic import of the browser WASM module
        const mod = await import('../wasm/monty.wasi-browser.js');
        MontyModule = mod;
        return mod;
    })();
    
    return initPromise;
}

/**
 * Check if SharedArrayBuffer is available (required for WASM threads)
 */
export function checkSharedArrayBufferSupport() {
    if (typeof SharedArrayBuffer === 'undefined') {
        return {
            supported: false,
            reason: 'SharedArrayBuffer is not available. This requires HTTPS and specific security headers (COOP/COEP).'
        };
    }
    return { supported: true };
}

/**
 * Error classes for Monty exceptions
 */
export class MontyError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MontyError';
    }
}

export class MontySyntaxError extends MontyError {
    constructor(exc) {
        const msg = exc?.message || exc?.toString?.() || 'Syntax error';
        super(msg);
        this.name = 'MontySyntaxError';
        this.line = exc?.line;
        this.column = exc?.column;
        this.original = exc;
    }
}

export class MontyRuntimeError extends MontyError {
    constructor(exc) {
        const msg = exc?.message || exc?.toString?.() || 'Runtime error';
        super(msg);
        this.name = 'MontyRuntimeError';
        this.typeName = exc?.typeName;
        this.original = exc;
        this._traceback = null;
        
        // Try to get traceback
        if (exc?.traceback) {
            try {
                this._traceback = exc.traceback();
            } catch (e) {
                // Ignore
            }
        }
    }

    traceback() {
        return this._traceback;
    }
}

export class MontyTypeError extends MontyError {
    constructor(exc) {
        super('Type error');
        this.name = 'MontyTypeError';
        this.original = exc;
    }

    displayDiagnostics(mode = 'full') {
        if (this.original?.displayDiagnostics) {
            try {
                return this.original.displayDiagnostics(mode);
            } catch (e) {
                return this.original?.toString?.() || 'Type error';
            }
        }
        return 'Type error';
    }
}

/**
 * MontyRuntime - High-level wrapper for Monty interpreter
 */
export class MontyRuntime {
    constructor() {
        this.monty = null;
        this.code = '';
        this.options = {};
    }

    /**
     * Parse and compile Python code
     * @param {string} code - Python source code
     * @param {Object} options - { inputs: [], externalFunctions: [], typeCheck: false }
     */
    async create(code, options = {}) {
        const mod = await initMonty();
        
        this.code = code;
        this.options = {
            scriptName: options.scriptName || 'main.py',
            inputs: options.inputs || [],
            externalFunctions: options.externalFunctions || [],
            typeCheck: options.typeCheck || false,
        };

        const result = mod.Monty.create(code, this.options);

        // Check for errors
        if (result instanceof mod.MontyException || result?.constructor?.name === 'MontyException') {
            throw new MontySyntaxError(result);
        }
        if (result instanceof mod.MontyTypingError || result?.constructor?.name === 'MontyTypingError') {
            throw new MontyTypeError(result);
        }

        this.monty = result;
        return this;
    }

    /**
     * Run code with synchronous external functions
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

        if (MontyModule && (result instanceof MontyModule.MontyException || result?.constructor?.name === 'MontyException')) {
            throw new MontyRuntimeError(result);
        }

        return result;
    }

    /**
     * Start iterative execution (for snapshot/resume flow)
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
     * Type check the current code
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
     * Serialize to bytes
     */
    dump() {
        if (!this.monty) throw new Error('Call create() first');
        return this.monty.dump();
    }

    /**
     * Load from bytes
     */
    static async load(data) {
        const mod = await initMonty();
        const runtime = new MontyRuntime();
        runtime.monty = mod.Monty.load(data);
        return runtime;
    }

    /**
     * Get declared input variable names
     */
    get inputs() {
        return this.monty?.inputs || [];
    }

    /**
     * Get declared external function names
     */
    get externalFunctions() {
        return this.monty?.externalFunctions || [];
    }

    _wrapProgress(result) {
        if (!MontyModule) return result;
        
        const isSnapshot = result instanceof MontyModule.MontySnapshot || 
                          result?.constructor?.name === 'MontySnapshot';
        const isComplete = result instanceof MontyModule.MontyComplete || 
                          result?.constructor?.name === 'MontyComplete';
        const isException = result instanceof MontyModule.MontyException || 
                           result?.constructor?.name === 'MontyException';

        if (isSnapshot) {
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
        if (isComplete) {
            return {
                type: 'complete',
                output: result.output,
            };
        }
        if (isException) {
            throw new MontyRuntimeError(result);
        }
        return result;
    }
}

// Re-export for convenience
export { MontyModule };
