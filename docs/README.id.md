# Antigravity Control Center

[English](../README.md) | **Bahasa Indonesia**

[![CI](https://github.com/MrBray20/agy-control-center/actions/workflows/ci.yml/badge.svg)](https://github.com/MrBray20/agy-control-center/actions/workflows/ci.yml)

Dashboard kontrol terpadu untuk mengelola **Skills**, **Rules**, dan **MCP Servers** di Google Antigravity, tersedia sebagai **UI Plugin (MCP App)** langsung di dalam Antigravity maupun **web dashboard lokal** melalui CLI `agy-manager`.

## Fitur Utama

- **Skills (per item dan per kategori):**
  - Mengaktifkan atau menonaktifkan skill manual (`~/.gemini/config/skills/`), skill symlink (`~/.agents/skills/`), serta skill **Everything Claude Code (ECC)** berdasarkan kategori (*Metodologi & TDD*, *Frontend & UI*, *Backend & API*, *Database & Cache*, *Security & DevOps*, *AI & Orchestration*).
  - Pencarian, filter status (`Semua`, `Aktif`, `Nonaktif`), dan monitor **Skill Token Budget** (`20.000` token) secara langsung.
  - Aman untuk skill symlink: menonaktifkan skill symlink hanya melepas symlink di `~/.gemini/config/skills/` tanpa menghapus folder aslinya.
- **Rules (per file dan per grup bahasa):**
  - Mengelola Global Rules (`~/.gemini/config/rules/`) dan ECC Rules (`~/.agents/rules/`) per kelompok bahasa (*Common*, *TypeScript*, *Go*, *Rust*, dan lainnya) beserta pantauan ukuran dan estimasi token.
- **MCP Servers:**
  - Toggle server MCP global di `~/.gemini/config/mcp_config.json`. Entri yang dinonaktifkan diarsipkan ke `mcp_config.disabled.json` dengan izin file `0600`, serta menyamarkan API key atau token di tampilan UI.
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

## Pengujian

Suite pengujian menggunakan runner bawaan Node (`node --test`) pada direktori sementara terisolasi (`AGY_CC_HOME`) sehingga konfigurasi asli Anda tidak tersentuh:

```bash
npm test
```

## Pengembangan & Build

Jika Anda mengubah file di `ui/`, `lib/`, atau `bin/`, jalankan ulang build agar `dist/app.html` dan bundle mandiri `dist/mcp-server.mjs` diperbarui sebelum commit:

```bash
npm install
npm run build
```

## Lisensi

[MIT](../LICENSE)
