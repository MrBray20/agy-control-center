# Antigravity Control Center

Dashboard kontrol terpadu untuk mengelola **Skills**, **Rules**, dan **MCP Servers** di Google Antigravity, tersedia sebagai **UI Plugin (MCP App)** di dalam Antigravity maupun **Web Dashboard lokal** via CLI `agy-manager`.

## Fitur Utama

- **Skills (per item & per kategori):**
  - Mengaktifkan/menonaktifkan skill manual (`~/.gemini/config/skills/`), skill symlink (`~/.agents/skills/`), maupun skill **Everything Claude Code (ECC)** berdasarkan kategori (*Metodologi & TDD*, *Frontend & UI*, *Backend & API*, *Database & Cache*, *Security & DevOps*, *AI & Orchestration*).
  - Pencarian, filter status (`Semua`, `Aktif`, `Nonaktif`), dan monitor **Skill Token Budget** (`20.000` token) secara langsung.
  - Aman untuk skill symlink: mematikan skill symlink hanya melepas symlink di `~/.gemini/config/skills/` tanpa menghapus folder aslinya.
- **Rules (per file & per grup bahasa):**
  - Mengontrol Global Rules (`~/.gemini/config/rules/`) dan ECC Rules (`~/.agents/rules/`) per kategori bahasa (*Common*, *TypeScript*, *Go*, *Rust*, dll.) beserta pemantauan batas token.
- **MCP Servers:**
  - Toggle server MCP global (`~/.gemini/config/mcp_config.json`) dengan arsip aman ke `mcp_config.disabled.json` (izin file `0600`) dan penyamaran kredensial/API key pada tampilan UI.
- **Presets:**
  - Preset satu klik: **Hemat Token**, **Frontend & UI**, dan **Full-Stack ECC**.

## Instalasi

### 1. Sebagai Antigravity UI Plugin (Tanpa `npm install`)

```bash
agy plugin install https://github.com/MrBray20/agy-control-center
```

Setelah terpasang, buka **Control Center** langsung dari **Sidebar kiri** atau menu **`+` di Side Pane** Antigravity.

### 2. Sebagai Web Dashboard Lokal (`agy-manager`)

```bash
npx github:MrBray20/agy-control-center
```

Lalu buka `http://127.0.0.1:4310` di browser (gunakan `--port <angka>` untuk mengganti port).

## Pengembangan & Build

Jika Anda memodifikasi file di `ui/` atau `bin/mcp-server.mjs`, jalankan ulang build agar `dist/app.html` dan `dist/mcp-server.mjs` diperbarui:

```bash
npm install
npm run build
```

## Lisensi

[MIT](./LICENSE)
