# Monty Playground - Project Plan

## Vision

**"Try Monty in your browser"**

Een interactieve web playground waar developers pydantic-monty kunnen uitproberen zonder installatie. Positioneert wrkr als serieuze speler in de agent infrastructure space en creëert goodwill bij het pydantic team.

---

## Waarom Dit Waardevol Is

### Voor de Community
1. **Zero friction** - geen `pip install`, geen setup, direct uitproberen
2. **Learning tool** - begrijp monty's mogelijkheden en beperkingen hands-on
3. **Documentation companion** - levende voorbeelden naast de docs
4. **Debugging aid** - snel testen of code werkt in monty

### Voor Wrkr
1. **Exposure** - pydantic heeft 20M+ monthly downloads, actieve community
2. **Credibility** - laat zien dat we serieus zijn over agent infrastructure
3. **Timing** - we hebben net issue #106 geopend, perfecte follow-up
4. **Backlinks** - elke mention van monty-playground linkt naar wrkr

### Voor Pydantic Team
1. **Docs enhancement** - kunnen embedden in hun documentation
2. **Adoption driver** - lagere barrier voor developers om monty te proberen
3. **Bug reports** - users ontdekken edge cases sneller

---

## Killer Feature: monty-js

Monty heeft een **JavaScript/WASM package** (`@pydantic/monty`). Dit betekent:

- ✅ **100% client-side** - geen server nodig
- ✅ **Instant execution** - geen network latency
- ✅ **Free hosting** - GitHub Pages / Cloudflare Pages
- ✅ **Embeddable** - kan in iframes in docs
- ✅ **Offline capable** - werkt zonder internet na eerste load

Dit is een enorm voordeel. De meeste "playground" tools hebben backend servers nodig.

---

## Core Features (MVP)

### 1. Code Editor
- **Monaco Editor** (VS Code's editor) - syntax highlighting, autocomplete
- Python language support
- Dark theme (consistent met wrkr branding)
- Line numbers, bracket matching

### 2. Execution Panel
- **Run button** - executes code via monty-js
- Real-time output display
- Error messages met duidelijke uitleg
- Execution time indicator

### 3. External Functions Panel
- Toon welke external functions beschikbaar zijn
- Mock implementations (web_search, fetch, etc.)
- Live preview van function calls en returns

### 4. Examples Dropdown
- Curated voorbeelden die monty's features tonen:
  - Basic Python (loops, functions, classes coming soon)
  - Async/await patterns
  - External function calls
  - Type checking demo
  - Snapshot/resume demo (monty's killer feature)

### 5. Limitations Helper
- Wanneer code faalt, toon waarom
- Link naar monty docs voor meer info
- Suggest workarounds waar mogelijk

---

## Advanced Features (V1)

### 6. Share Functionality
- Generate shareable URL met code embedded
- Base64 encoded in URL hash (geen server nodig)
- Copy button voor easy sharing
- Open Graph meta tags voor Twitter/Slack previews

### 7. External Functions Configurator
- Users kunnen eigen mock functions definiëren
- JSON schema voor input/output types
- Persist in localStorage

### 8. Type Checking Toggle
- Monty heeft `ty` (type checker) built-in
- Toggle om type checking aan/uit te zetten
- Toon type errors inline

### 9. Side-by-Side Comparison
- Run zelfde code in monty vs browser's eval
- Highlight verschillen in output
- Useful voor understanding monty's subset

### 10. Keyboard Shortcuts
- Cmd/Ctrl + Enter = Run
- Cmd/Ctrl + S = Save to localStorage
- Cmd/Ctrl + Shift + S = Share

---

## Technical Architecture

```
monty-playground/
├── index.html           # Single page app
├── css/
│   └── style.css        # Dark theme, wrkr branding
├── js/
│   ├── app.js           # Main application logic
│   ├── editor.js        # Monaco editor wrapper
│   ├── executor.js      # Monty-js integration
│   ├── examples.js      # Curated code examples
│   ├── share.js         # URL sharing logic
│   └── ui.js            # UI helpers
├── assets/
│   ├── logo.svg         # wrkr logo
│   └── og-image.png     # Social share image
├── examples/
│   └── *.py             # Example Python files
├── README.md
├── LICENSE              # MIT
└── package.json         # For npm publishing (optional)
```

### Dependencies
- **@pydantic/monty** - WASM-compiled monty interpreter
- **Monaco Editor** - VS Code's editor (CDN)
- Geen andere dependencies - keep it simple

### Hosting
- **Primary:** GitHub Pages (free, fast CDN)
- **Domain:** playground.wrkr.sh (CNAME)
- **Backup:** Cloudflare Pages

---

## Design Specs

### Layout (Desktop)
```
┌─────────────────────────────────────────────────────────────┐
│  🎪 Monty Playground                    [Examples ▾] [Run ▶]│
├───────────────────────────────┬─────────────────────────────┤
│                               │  Output                     │
│  Code Editor                  │  ─────────────────────────  │
│                               │  > Hello, World!            │
│  async def main():            │  > 42                       │
│      result = await fetch(url)│                             │
│      return len(result)       │  External Function Calls    │
│                               │  ─────────────────────────  │
│                               │  📞 fetch("https://...")    │
│                               │     → "response data..."    │
│                               │                             │
├───────────────────────────────┴─────────────────────────────┤
│  ⚠️ Note: *args unpacking not yet supported [Learn more →]  │
└─────────────────────────────────────────────────────────────┘
```

### Color Palette (wrkr brand)
- Background: #09090b
- Surface: #111111
- Border: #1a1a1a
- Primary: #00D4AA (teal accent)
- Text: #ffffff
- Text muted: #a1a1aa
- Error: #ef4444
- Success: #22c55e

### Typography
- Font: Inter (consistent met wrkr)
- Monospace: JetBrains Mono (code)

---

## Example Scripts

### 1. Hello World
```python
print("Hello from Monty! 🐍")
result = 1 + 1
print(f"1 + 1 = {result}")
```

### 2. Async External Function
```python
async def main():
    # fetch is an external function - mocked in playground
    data = await fetch("https://api.example.com/data")
    print(f"Fetched {len(data)} bytes")
    return data

await main()
```

### 3. Type Checking
```python
def greet(name: str) -> str:
    return f"Hello, {name}!"

# This will pass type checking
result = greet("World")

# This would fail type checking (uncomment to try):
# result = greet(42)
```

### 4. Snapshot & Resume (Killer Feature)
```python
# Monty can pause at external function calls
# and resume later with the result!

data = fetch("https://api.example.com")
# ^ Execution pauses here, waiting for fetch result
# ^ State can be serialized and stored

processed = process(data)
print(processed)
```

### 5. What Doesn't Work (Educational)
```python
# These features are not yet supported in Monty:

# ❌ *args unpacking
# items = [1, 2, 3]
# print(*items)  # Not supported

# ❌ Classes (coming soon)
# class MyClass:
#     pass

# ❌ Standard library imports
# import json  # Not supported

# ✅ But basic Python works great!
for i in range(5):
    print(f"Count: {i}")
```

---

## Launch Strategy

### Phase 1: Build MVP (Day 1-2)
- [ ] Setup repo, basic HTML structure
- [ ] Integrate Monaco Editor
- [ ] Integrate monty-js (WASM)
- [ ] Basic execution flow
- [ ] 3-5 examples
- [ ] Error handling

### Phase 2: Polish (Day 3)
- [ ] External functions panel
- [ ] Share functionality
- [ ] Mobile responsive
- [ ] README with screenshots
- [ ] Demo GIF

### Phase 3: Launch (Day 4)
- [ ] Deploy to GitHub Pages
- [ ] Setup playground.wrkr.sh subdomain
- [ ] Comment on our issue #106 with link
- [ ] Post on Twitter from @wrkrsh
- [ ] Submit to Hacker News (Show HN)
- [ ] Post in pydantic Discord/Slack

### Phase 4: Iterate (Week 2)
- [ ] Gather feedback
- [ ] Add requested features
- [ ] Pitch to pydantic team for docs embed
- [ ] Write blog post about building it

---

## Success Metrics

### Quantitative
- GitHub stars (target: 100+ first week)
- Unique visitors (target: 1000+ first week)
- Shares/mentions on Twitter
- Backlinks to wrkr.sh

### Qualitative
- Pydantic team acknowledgment
- Community feedback positivity
- Feature requests (engagement signal)
- Bug reports (usage signal)

---

## Risk Mitigation

### Risk: monty-js doesn't work well
**Mitigation:** Test thoroughly before launch. Have fallback messaging if WASM fails to load.

### Risk: Low engagement
**Mitigation:** Time launch with monty-related news. Cross-post to multiple communities.

### Risk: Someone else builds this first
**Mitigation:** Move fast. MVP in 2 days. First mover advantage matters.

### Risk: Pydantic team ignores it
**Mitigation:** Make it genuinely useful. Quality > speed to impress them.

---

## Content for Launch

### Twitter Thread
```
we built a playground for @pydantic's new monty interpreter.

try python code in your browser, no install needed.

→ async/await support
→ external function mocking  
→ type checking built-in
→ see monty's killer snapshot feature in action

[link]

🧵 why we built this...
```

### GitHub README Intro
```markdown
# 🎪 Monty Playground

Try [pydantic-monty](https://github.com/pydantic/monty) in your browser.

Monty is a minimal, secure Python interpreter written in Rust, 
designed for AI agent code execution. This playground lets you 
experiment with it without any installation.

**[→ Try it now](https://playground.wrkr.sh)**
```

### HN Post Title
```
Show HN: Monty Playground – Try Pydantic's new Python-in-Rust interpreter in your browser
```

---

## Open Questions

1. **Subdomain:** `playground.wrkr.sh` of `monty.wrkr.sh`?
2. **Branding:** Prominent wrkr logo of subtiel?
3. **Examples:** Hoeveel en welke use cases highlighten?
4. **npm publish:** Package ook publishen voor embedding?

---

## Next Steps

1. ✅ Plan goedkeuren
2. [ ] Repo setup + basic structure
3. [ ] monty-js integratie testen
4. [ ] MVP bouwen
5. [ ] Review met Pablo
6. [ ] Launch

---

*Plan created: 2026-02-06*
*Author: Maeve (wrkr)*
