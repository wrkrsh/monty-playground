# 🐍 Monty Playground

**Try [Monty](https://github.com/pydantic/monty) in your browser — no installation required.**

**[→ Launch Playground](https://wrkrsh.github.io/monty-playground/)**

---

## What is Monty?

**Monty** is a minimal, secure Python interpreter written in Rust, created by the [Pydantic](https://pydantic.dev) team (the folks behind [Pydantic](https://github.com/pydantic/pydantic), [FastAPI](https://fastapi.tiangolo.com/), and [Pydantic AI](https://github.com/pydantic/pydantic-ai)).

It's designed for one specific use case: **safely running code written by AI agents**.

### Why Monty exists

When LLMs write code to accomplish tasks, you need to run that code somewhere. Your options:

| Approach | Problem |
|----------|---------|
| Docker/containers | Slow startup (100-200ms), complex setup |
| Pyodide/WASM | Slow cold start (2-3s), no real sandboxing |
| `exec()` directly | Zero security, full system access |
| Sandbox services | Network latency, costs money |

**Monty's approach:**
- ⚡ **Microsecond startup** — not hundreds of milliseconds
- 🔒 **True sandboxing** — no filesystem, network, or env access unless explicitly allowed
- 🔌 **External functions** — you control exactly what the code can do
- 📸 **Snapshot & resume** — pause execution, serialize state, resume later (killer feature for agents)

### What Monty can do

- Run a useful subset of Python (functions, loops, comprehensions, async/await)
- Call host-defined external functions
- Type check code with [ty](https://docs.astral.sh/ty/)
- Serialize interpreter state mid-execution
- Run from Python, JavaScript/TypeScript, or Rust

### What Monty can't do (yet)

- Classes (coming soon)
- `*args`/`**kwargs` unpacking
- Standard library imports (except `asyncio`, `typing`, `sys`)
- Third-party packages

---

## This Playground

This playground lets you experiment with Monty's features interactively:

| Example | What it shows |
|---------|---------------|
| **Hello World** | Basic syntax, variables, f-strings |
| **Fibonacci** | Recursion and type hints |
| **Async/Await** | Async code patterns |
| **External Functions** | How Monty calls host functions |
| **Type Checking** | Static type validation |
| **Snapshot & Resume** | Monty's killer feature for agents |
| **Limitations** | What doesn't work yet |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Run code |

### Share Code

Click **Share** to copy a URL with your code embedded.

---

## Note on Execution

This playground uses **simulated** execution for demonstration purposes. The real Monty interpreter runs as a native binary or WASM module.

For actual Monty execution, use:
- **Python:** `pip install pydantic-monty` ([PyPI](https://pypi.org/project/pydantic-monty/))
- **JavaScript:** `npm install @pydantic/monty` ([npm](https://www.npmjs.com/package/@pydantic/monty))
- **Rust:** [crates.io/crates/monty](https://crates.io/crates/monty)

---

## Links

- [Monty GitHub](https://github.com/pydantic/monty) — source code & docs
- [Pydantic AI](https://github.com/pydantic/pydantic-ai) — AI agent framework using Monty
- [Pydantic](https://pydantic.dev) — the team behind Monty

---

Built by [wrkr](https://wrkr.sh) • [Playground source](https://github.com/wrkrsh/monty-playground) • [Report issues](https://github.com/wrkrsh/monty-playground/issues)
