import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

let tmpHome = '';

function setupFixtureHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-cc-srv-'));
  const geminiCfg = path.join(home, '.gemini', 'config');
  const agentsDir = path.join(home, '.agents');

  fs.mkdirSync(path.join(geminiCfg, 'skills', 'graphify'), { recursive: true });
  fs.writeFileSync(
    path.join(geminiCfg, 'skills', 'graphify', 'SKILL.md'),
    '---\nname: graphify\ndescription: Knowledge graph skill.\n---\n',
    'utf-8'
  );

  fs.mkdirSync(path.join(agentsDir, 'skills.disabled', 'postgres-patterns'), { recursive: true });
  fs.writeFileSync(
    path.join(agentsDir, 'skills.disabled', 'postgres-patterns', 'SKILL.md'),
    '---\nname: postgres-patterns\ndescription: Postgres patterns.\n---\n',
    'utf-8'
  );
  fs.writeFileSync(
    path.join(agentsDir, '.ecc-state.json'),
    JSON.stringify({ status: 'disabled', managedSkills: ['postgres-patterns'] }),
    'utf-8'
  );
  fs.writeFileSync(path.join(geminiCfg, 'skills.json'), JSON.stringify({ entries: [] }), 'utf-8');
  fs.writeFileSync(
    path.join(geminiCfg, 'mcp_config.json'),
    JSON.stringify({
      mcpServers: {
        demo: { command: 'node', args: ['-v'], env: { SECRET_KEY: 'topsecret9999' } },
      },
    }),
    'utf-8'
  );

  return home;
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      srv.close(() => resolve(addr.port));
    });
    srv.on('error', reject);
  });
}

describe('MCP & Web servers', () => {
  before(() => {
    tmpHome = setupFixtureHome();
  });

  after(() => {
    if (tmpHome) fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it('serves valid MCP App tools, resource, and <=64-char tool names from dist/mcp-server.mjs', async () => {
    const proc = spawn('node', [path.join(rootDir, 'dist', 'mcp-server.mjs')], {
      env: { ...process.env, AGY_CC_HOME: tmpHome },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let buf = '';
    const responses = new Map();
    proc.stdout.on('data', (chunk) => {
      buf += chunk.toString('utf-8');
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const msg = JSON.parse(line);
        if (msg.id !== undefined) responses.set(msg.id, msg);
      }
    });

    const send = (obj) => proc.stdin.write(JSON.stringify(obj) + '\n');
    const waitFor = async (id) => {
      const deadline = Date.now() + 5000;
      while (!responses.has(id)) {
        if (Date.now() > deadline) throw new Error(`Timeout waiting for RPC id ${id}`);
        await new Promise(r => setTimeout(r, 20));
      }
      return responses.get(id);
    };

    try {
      send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'ci', version: '1.0' } },
      });
      const r1 = await waitFor(1);
      assert.equal(r1.result.serverInfo.name, 'agy-control-center');
      send({ jsonrpc: '2.0', method: 'notifications/initialized' });

      send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
      const r2 = await waitFor(2);
      assert.ok(r2.result.tools.length >= 8);

      const prefix = 'mcp_agy-control-center_agy-control-center_';
      for (const tool of r2.result.tools) {
        assert.match(prefix + tool.name, /^[a-zA-Z0-9_-]{1,64}$/);
      }

      send({ jsonrpc: '2.0', id: 3, method: 'resources/read', params: { uri: 'ui://control-center/app.html' } });
      const r3 = await waitFor(3);
      assert.equal(r3.result.contents[0].mimeType, 'text/html;profile=mcp-app');
      assert.ok(r3.result.contents[0].text.includes('Antigravity Control Center'));

      send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'open_control_center', arguments: {} } });
      const r4 = await waitFor(4);
      assert.ok(!r4.result.isError);
      assert.equal(r4.result.structuredContent.summary.totalSkillsCount, 2);

      send({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: { name: 'cc_skill_cat', arguments: { categoryId: 'ecc-database', enabled: true } },
      });
      const r5 = await waitFor(5);
      assert.ok(!r5.result.isError);
      assert.equal(r5.result.structuredContent.summary.activeSkillsCount, 2);
    } finally {
      proc.kill();
    }
  });

  it('serves dashboard HTML and JSON API from bin/web-server.mjs', async () => {
    const port = await getFreePort();
    const proc = spawn('node', [path.join(rootDir, 'bin', 'web-server.mjs'), '--port', String(port)], {
      env: { ...process.env, AGY_CC_HOME: tmpHome },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    try {
      const baseUrl = `http://127.0.0.1:${port}`;
      let ready = false;
      for (let i = 0; i < 40; i++) {
        try {
          const probe = await fetch(`${baseUrl}/api/state`);
          if (probe.ok) {
            ready = true;
            break;
          }
        } catch {
          await new Promise(r => setTimeout(r, 50));
        }
      }
      assert.equal(ready, true, 'Web server did not become ready in time');

      const htmlRes = await fetch(`${baseUrl}/`);
      assert.equal(htmlRes.status, 200);
      const html = await htmlRes.text();
      assert.ok(html.includes('Antigravity Control Center'));

      const stateRes = await fetch(`${baseUrl}/api/state`);
      assert.equal(stateRes.status, 200);
      const stateJson = await stateRes.json();
      assert.equal(JSON.stringify(stateJson).includes('topsecret9999'), false);

      const toggleRes = await fetch(`${baseUrl}/api/skill/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'manual-dir:graphify', enabled: false }),
      });
      assert.equal(toggleRes.status, 200);
      const toggled = await toggleRes.json();
      const toolsCat = toggled.skillCategories.find(c => c.id === 'manual-tools');
      assert.equal(toolsCat.activeCount, 0);
    } finally {
      proc.kill();
    }
  });
});
