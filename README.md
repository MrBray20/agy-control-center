# Antigravity Control Center

**English** | [Bahasa Indonesia](./docs/README.id.md)

[![CI](https://github.com/MrBray20/agy-control-center/actions/workflows/ci.yml/badge.svg)](https://github.com/MrBray20/agy-control-center/actions/workflows/ci.yml)

A unified control dashboard for managing **Skills**, **Rules**, and **MCP Servers** in Google Antigravity. It runs both as a native **Antigravity UI Plugin (MCP App)** inside the IDE and as a **local web dashboard** via the `agy-manager` CLI.

## Features

- **Skills (per-item and per-category):**
  - Toggle standalone manual skills (`~/.gemini/config/skills/`), symlinked skills (`~/.agents/skills/`), and **Everything Claude Code (ECC)** skills grouped by category (*Methodology & TDD*, *Frontend & UI*, *Backend & API*, *Database & Cache*, *Security & DevOps*, *AI & Orchestration*).
  - Search, status filtering (`All`, `Active`, `Disabled`), and a live **Skill Token Budget** bar (`20,000` token cap).
  - Safe symlink handling: turning off a symlinked skill only removes the symlink in `~/.gemini/config/skills/` and keeps the original skill directory intact.
- **Rules (per-file and per-language group):**
  - Toggle global rules (`~/.gemini/config/rules/`) and ECC rules (`~/.agents/rules/`) grouped by language prefix (*Common*, *TypeScript*, *Go*, *Rust*, and more) with size and token tracking.
- **MCP Servers:**
  - Toggle global MCP servers in `~/.gemini/config/mcp_config.json`. Disabled entries are archived to `mcp_config.disabled.json` with `0600` file permissions, and API keys or tokens are masked in the UI.
- **Presets:**
  - One-click presets: **Hemat Token** (token-saver), **Frontend & UI**, and **Full-Stack ECC**.

## Installation

### 1. As an Antigravity UI Plugin (Zero-Install)

```bash
agy plugin install https://github.com/MrBray20/agy-control-center
```

Once installed, open **Control Center** from the **left sidebar** or the **`+` menu in the Side Pane**.

### 2. As a Local Web Dashboard (`agy-manager`)

```bash
npx github:MrBray20/agy-control-center
```

Then open `http://127.0.0.1:4310` in your browser (pass `--port <number>` to use a custom port).

## Testing

The test suite uses Node's built-in test runner (`node --test`) against an isolated temporary directory (`AGY_CC_HOME`) so your local configuration is never modified:

```bash
npm test
```

## Development & Build

If you modify files under `ui/`, `lib/`, or `bin/`, rebuild `dist/app.html` and the standalone `dist/mcp-server.mjs` bundle before committing:

```bash
npm install
npm run build
```

## License

[MIT](./LICENSE)
