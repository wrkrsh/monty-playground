# 🐍 Monty Playground

**Try [pydantic-monty](https://github.com/pydantic/monty) in your browser.**

Monty is a minimal, secure Python interpreter written in Rust, designed for AI agent code execution. This playground lets you experiment with it instantly — no installation required.

**[→ Try it now](https://wrkrsh.github.io/monty-playground/)**

---

## What is Monty?

Monty avoids the cost, latency, and complexity of container-based sandboxes for running LLM-generated code. Instead, it lets you safely run Python code with:

- ⚡ **Microsecond startup** — not hundreds of milliseconds
- 🔒 **Strict sandboxing** — no filesystem, network, or env access unless you allow it
- 📸 **Snapshot & resume** — pause at external calls, serialize state, resume later
- 🔌 **External functions** — the host controls what the code can do
- ✅ **Type checking** — includes [ty](https://docs.astral.sh/ty/) for static analysis

## Examples

The playground includes interactive examples for:

| Example | Description |
|---------|-------------|
| **Hello World** | Basic syntax, variables, f-strings |
| **Fibonacci** | Recursion and type hints |
| **Async/Await** | Async code patterns |
| **External Functions** | How Monty calls host functions |
| **Type Checking** | Static type validation |
| **Snapshot & Resume** | Monty's killer feature for agents |
| **Limitations** | What Monty can't do (yet) |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Run code |
| `Ctrl+S` | Share (copy URL) |

## Share Code

Click **Share** to copy a URL with your code embedded. Anyone with the link sees your exact code.

## Limitations

This playground uses a **simulated** Python execution for demonstration. For real Monty execution, use the [npm package](https://www.npmjs.com/package/@pydantic/monty) or [Python package](https://pypi.org/project/pydantic-monty/).

## Links

- [Monty GitHub](https://github.com/pydantic/monty)
- [Monty on PyPI](https://pypi.org/project/pydantic-monty/)
- [Monty on npm](https://www.npmjs.com/package/@pydantic/monty)
- [Pydantic AI](https://github.com/pydantic/pydantic-ai)

---

Built by [wrkr](https://wrkr.sh) · [Report issues](https://github.com/wrkrsh/monty-playground/issues)
