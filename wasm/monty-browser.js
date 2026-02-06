/**
 * Monty WASM Browser Loader
 * Bundled version that works without npm dependencies
 */

import {
  getDefaultContext,
  instantiateNapiModuleSync,
  WASI,
} from './runtime-bundle.js';

const wasi = new WASI({
  version: 'preview1',
});

const wasmUrl = new URL('./monty.wasm32-wasi.wasm', import.meta.url).href;
const emnapiContext = getDefaultContext();

const sharedMemory = new WebAssembly.Memory({
  initial: 4000,
  maximum: 65536,
  shared: true,
});

const wasmFile = await fetch(wasmUrl).then((res) => res.arrayBuffer());

const {
  instance: napiInstance,
  module: wasiModule,
  napiModule,
} = instantiateNapiModuleSync(wasmFile, {
  context: emnapiContext,
  asyncWorkPoolSize: 4,
  wasi: wasi,
  onCreateWorker() {
    const worker = new Worker(new URL('./worker-bundle.js', import.meta.url), {
      type: 'module',
    });
    return worker;
  },
  overwriteImports(importObject) {
    importObject.env = {
      ...importObject.env,
      ...importObject.napi,
      ...importObject.emnapi,
      memory: sharedMemory,
    };
    return importObject;
  },
  beforeInit({ instance }) {
    for (const name of Object.keys(instance.exports)) {
      if (name.startsWith('__napi_register__')) {
        instance.exports[name]();
      }
    }
  },
});

export default napiModule.exports;
export const Monty = napiModule.exports.Monty;
export const MontyComplete = napiModule.exports.MontyComplete;
export const MontyException = napiModule.exports.MontyException;
export const JsMontyException = napiModule.exports.JsMontyException;
export const MontySnapshot = napiModule.exports.MontySnapshot;
export const MontyTypingError = napiModule.exports.MontyTypingError;
