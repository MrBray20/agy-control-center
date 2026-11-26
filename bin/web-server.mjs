#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getState,
  toggleSkill,
  toggleSkillCategory,
  toggleRule,
  toggleRuleCategory,
  toggleMcp,
  applyPreset,
  saveCustomPreset,
  deleteCustomPreset,
} from '../lib/manager.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_HTML = path.resolve(__dirname, '..', 'dist', 'app.html');

function parseArgs(argv) {
  const opts = { host: '127.0.0.1', port: 4310, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if ((arg === '--port' || arg === '-p') && argv[i + 1]) {
      const parsed = Number(argv[++i]);
      if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
        opts.port = parsed;
      }
    } else if (arg === '--host' && argv[i + 1]) {
      opts.host = argv[++i];
    }
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  console.log(`Antigravity Control Center Web Dashboard

Usage:
  agy-manager [--port <number>] [--host <address>]

Options:
  -p, --port <number>  Port HTTP lokal (default: 4310)
      --host <address> Host bind address (default: 127.0.0.1)
  -h, --help           Tampilkan bantuan ini
`);
  process.exit(0);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > 65536) {
        reject(new Error('Payload terlalu besar.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('JSON body tidak valid.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const urlPath = new URL(req.url || '/', `http://${opts.host}:${opts.port}`).pathname;

  try {
    if (req.method === 'GET' && urlPath === '/') {
      const html = fs.readFileSync(DIST_HTML, 'utf-8');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(html);
      return;
    }

    if (req.method === 'GET' && urlPath === '/api/state') {
      sendJson(res, 200, getState());
      return;
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      if (urlPath === '/api/skill/toggle') {
        sendJson(res, 200, toggleSkill(body.id, body.enabled));
        return;
      }
      if (urlPath === '/api/skill/category') {
        sendJson(res, 200, toggleSkillCategory(body.categoryId, body.enabled));
        return;
      }
      if (urlPath === '/api/rule/toggle') {
        sendJson(res, 200, toggleRule(body.id, body.enabled));
        return;
      }
      if (urlPath === '/api/rule/category') {
        sendJson(res, 200, toggleRuleCategory(body.categoryId, body.enabled));
        return;
      }
      if (urlPath === '/api/mcp/toggle') {
        sendJson(res, 200, toggleMcp(body.name, body.enabled));
        return;
      }
      if (urlPath === '/api/preset/apply') {
        sendJson(res, 200, applyPreset(body.presetId));
        return;
      }
      if (urlPath === '/api/preset/save') {
        sendJson(res, 200, saveCustomPreset(body.name, body.description, body.includeMcp));
        return;
      }
      if (urlPath === '/api/preset/delete') {
        sendJson(res, 200, deleteCustomPreset(body.presetId));
        return;
      }
    }

    sendJson(res, 404, { error: 'Endpoint tidak ditemukan.' });
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : String(err) });
  }
});

server.listen(opts.port, opts.host, () => {
  console.log(`Antigravity Control Center aktif di http://${opts.host}:${opts.port}`);
});
