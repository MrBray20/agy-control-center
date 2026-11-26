import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-cc-mgr-'));
process.env.AGY_CC_HOME = tmpHome;

const mgr = await import('../lib/manager.mjs');

function writeSkill(dir, name, desc = 'Skill fixture description.') {
  const skillDir = path.join(dir, name);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${desc}\n---\n\n# ${name}\n`,
    'utf-8'
  );
}

function writeRule(dir, filename, body = '# Rule\n\nFollow standard practices.\n') {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), body, 'utf-8');
}

describe('Control Center manager', () => {
  before(() => {
    fs.mkdirSync(mgr.GEMINI_SKILLS, { recursive: true });
    fs.mkdirSync(mgr.GEMINI_RULES, { recursive: true });
    fs.mkdirSync(mgr.AGENTS_SKILLS, { recursive: true });
    fs.mkdirSync(mgr.AGENTS_SKILLS_DISABLED, { recursive: true });
    fs.mkdirSync(mgr.AGENTS_RULES_DISABLED, { recursive: true });

    // Standalone manual skills
    writeSkill(mgr.GEMINI_SKILLS, 'graphify', 'Knowledge graph tooling.');
    writeSkill(mgr.GEMINI_SKILLS, 'figcraft-design', 'Design UI on FigCraft.');

    // Symlinked and unlinked manual skills inside ~/.agents/skills
    writeSkill(mgr.AGENTS_SKILLS, 'awwwards', 'Award-grade website builder.');
    fs.symlinkSync(
      path.join(mgr.AGENTS_SKILLS, 'awwwards'),
      path.join(mgr.GEMINI_SKILLS, 'awwwards'),
      'dir'
    );
    writeSkill(mgr.AGENTS_SKILLS, 'design-system', 'Design system tokens.');
    fs.writeFileSync(
      mgr.SKILL_LOCK,
      JSON.stringify({ version: 3, skills: { awwwards: { source: 'test' } } }, null, 2),
      'utf-8'
    );

    // Disabled ECC skills
    writeSkill(mgr.AGENTS_SKILLS_DISABLED, 'postgres-patterns', 'PostgreSQL optimization.');
    writeSkill(mgr.AGENTS_SKILLS_DISABLED, 'redis-patterns', 'Redis caching patterns.');
    writeSkill(mgr.AGENTS_SKILLS_DISABLED, 'react-patterns', 'React architecture patterns.');
    writeSkill(mgr.AGENTS_SKILLS_DISABLED, 'tdd-workflow', 'Test-driven development.');
    fs.writeFileSync(
      mgr.ECC_STATE,
      JSON.stringify({
        status: 'disabled',
        managedSkills: ['postgres-patterns', 'redis-patterns', 'react-patterns', 'tdd-workflow'],
      }, null, 2),
      'utf-8'
    );
    fs.writeFileSync(mgr.GEMINI_SKILLS_JSON, JSON.stringify({ entries: [] }, null, 2), 'utf-8');

    // Plugin-bundled skill and rule
    const pluginRoot = path.join(mgr.GEMINI_PLUGINS, 'demo-plugin');
    fs.mkdirSync(pluginRoot, { recursive: true });
    fs.writeFileSync(path.join(pluginRoot, 'plugin.json'), JSON.stringify({ name: 'demo-plugin' }), 'utf-8');
    writeSkill(path.join(pluginRoot, 'skills'), 'demo-skill', 'Plugin skill.');
    writeRule(path.join(pluginRoot, 'rules'), 'AGENTS.md', '# Plugin rule\n');

    // Disabled ECC rules
    writeRule(mgr.AGENTS_RULES_DISABLED, 'common-coding-style.md', '# Common Style\n');
    writeRule(mgr.AGENTS_RULES_DISABLED, 'typescript-patterns.md', '# TS Patterns\n');
    writeRule(mgr.AGENTS_RULES_DISABLED, 'rust-patterns.md', '# Rust Patterns\n');

    // Global MCP config with credentials
    fs.writeFileSync(
      mgr.MCP_CONFIG,
      JSON.stringify({
        mcpServers: {
          remoteApi: {
            command: 'npx',
            args: ['-y', 'mcp-remote', 'https://example.test/mcp', '--header', 'X-Goog-Api-Key: AQ.TestSecretKey987654'],
            env: { API_TOKEN: 'secret-token-value-1234' },
          },
          figcraft: {
            command: 'figcraft-mcp',
            args: ['--attach', '7979'],
          },
        },
      }, null, 2),
      { encoding: 'utf-8', mode: 0o600 }
    );
  });

  after(() => {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it('collects inventory and redacts MCP secrets in getState()', () => {
    const state = mgr.getState();
    const raw = JSON.stringify(state);
    assert.equal(raw.includes('AQ.TestSecretKey987654'), false);
    assert.equal(raw.includes('secret-token-value-1234'), false);
    assert.equal(raw.includes('654'), true);
    assert.equal(raw.includes('1234'), true);

    assert.equal(state.summary.totalSkillsCount, 9);
    assert.equal(state.summary.activeSkillsCount, 4); // graphify, figcraft-design, awwwards, demo-skill
    assert.equal(state.summary.totalRulesCount, 4);
    assert.equal(state.summary.activeRulesCount, 1); // demo-plugin/AGENTS.md
    assert.equal(state.summary.totalMcpCount, 2);
  });

  it('toggles standalone manual skills safely', () => {
    mgr.toggleSkill('manual-dir:graphify', false);
    assert.equal(fs.existsSync(path.join(mgr.GEMINI_SKILLS, 'graphify')), false);
    assert.equal(fs.existsSync(path.join(mgr.GEMINI_SKILLS_DISABLED, 'graphify')), true);

    mgr.toggleSkill('manual-dir:graphify', true);
    assert.equal(fs.existsSync(path.join(mgr.GEMINI_SKILLS, 'graphify')), true);
    assert.equal(fs.existsSync(path.join(mgr.GEMINI_SKILLS_DISABLED, 'graphify')), false);
  });

  it('toggles symlinked manual skills without deleting target directory', () => {
    mgr.toggleSkill('manual-link:awwwards', false);
    assert.equal(fs.existsSync(path.join(mgr.GEMINI_SKILLS, 'awwwards')), false);
    assert.equal(fs.existsSync(path.join(mgr.AGENTS_SKILLS, 'awwwards')), true);

    mgr.toggleSkill('manual-link:awwwards', true);
    assert.equal(fs.lstatSync(path.join(mgr.GEMINI_SKILLS, 'awwwards')).isSymbolicLink(), true);
  });

  it('toggles ECC skill categories while protecting non-ECC skills', () => {
    const onState = mgr.toggleSkillCategory('ecc-database', true);
    const dbOn = onState.skillCategories.find(c => c.id === 'ecc-database');
    assert.equal(dbOn.activeCount, 2);
    assert.equal(onState.summary.eccSkillsRegistered, true);

    const offState = mgr.toggleSkillCategory('ecc-database', false);
    const dbOff = offState.skillCategories.find(c => c.id === 'ecc-database');
    assert.equal(dbOff.activeCount, 0);
    assert.equal(offState.summary.eccSkillsRegistered, false);
    assert.equal(fs.existsSync(path.join(mgr.AGENTS_SKILLS, 'awwwards')), true);
    assert.equal(fs.existsSync(path.join(mgr.AGENTS_SKILLS, 'design-system')), true);
  });

  it('toggles individual rules and rule categories', () => {
    const s1 = mgr.toggleRule('ecc-rule:rust-patterns.md', true);
    assert.equal(fs.existsSync(path.join(mgr.AGENTS_RULES, 'rust-patterns.md')), true);
    assert.equal(s1.summary.activeRulesCount, 2);

    const s2 = mgr.toggleRuleCategory('ecc-rules-common', true);
    assert.equal(fs.existsSync(path.join(mgr.AGENTS_RULES, 'common-coding-style.md')), true);
    assert.equal(s2.summary.activeRulesCount, 3);

    mgr.toggleRule('ecc-rule:rust-patterns.md', false);
    mgr.toggleRuleCategory('ecc-rules-common', false);
    assert.equal(fs.existsSync(path.join(mgr.AGENTS_RULES_DISABLED, 'rust-patterns.md')), true);
    assert.equal(fs.existsSync(path.join(mgr.AGENTS_RULES_DISABLED, 'common-coding-style.md')), true);
  });

  it('toggles MCP servers with 0600 permissions and preserves real credentials', () => {
    const beforeRaw = fs.readFileSync(mgr.MCP_CONFIG, 'utf-8');
    mgr.toggleMcp('remoteApi', false);

    const activeOff = JSON.parse(fs.readFileSync(mgr.MCP_CONFIG, 'utf-8'));
    const disabledOff = JSON.parse(fs.readFileSync(mgr.MCP_DISABLED, 'utf-8'));
    assert.equal('remoteApi' in activeOff.mcpServers, false);
    assert.equal('remoteApi' in disabledOff.mcpServers, true);
    assert.equal(disabledOff.mcpServers.remoteApi.env.API_TOKEN, 'secret-token-value-1234');
    if (process.platform !== 'win32') {
      assert.equal(fs.statSync(mgr.MCP_CONFIG).mode & 0o777, 0o600);
      assert.equal(fs.statSync(mgr.MCP_DISABLED).mode & 0o777, 0o600);
    }

    mgr.toggleMcp('remoteApi', true);
    const afterParsed = JSON.parse(fs.readFileSync(mgr.MCP_CONFIG, 'utf-8'));
    assert.deepEqual(afterParsed, JSON.parse(beforeRaw));
  });

  it('applies adaptive built-in presets cleanly across skills and rules', () => {
    const initial = mgr.getState();
    assert.equal(initial.summary.hasEcc, true);
    assert.deepEqual(
      initial.presets.map(p => p.id),
      ['minimal', 'enable-all-manual', 'frontend-ui', 'fullstack-ecc']
    );

    const fe = mgr.applyPreset('frontend-ui');
    assert.equal(fe.skillCategories.find(c => c.id === 'ecc-frontend').activeCount, 1);
    assert.equal(fe.skillCategories.find(c => c.id === 'ecc-database').activeCount, 0);
    assert.equal(fe.ruleCategories.find(c => c.id === 'ecc-rules-typescript').activeCount, 1);

    const fsEcc = mgr.applyPreset('fullstack-ecc');
    assert.equal(fsEcc.skillCategories.find(c => c.id === 'ecc-database').activeCount, 2);
    assert.equal(fsEcc.skillCategories.find(c => c.id === 'ecc-methodology').activeCount, 1);

    const ht = mgr.applyPreset('hemat-token');
    assert.equal(ht.summary.eccSkillsRegistered, false);
    assert.equal(ht.skillCategories.find(c => c.id === 'manual-figcraft').activeCount, 1);
    assert.equal(ht.ruleCategories.find(c => c.id === 'ecc-rules-common').activeCount, 0);
  });

  it('saves, reapplies, and deletes custom presets including MCP state', () => {
    // Prepare a specific custom state: graphify OFF, rust rule ON, remoteApi MCP OFF
    mgr.toggleSkill('manual-dir:graphify', false);
    mgr.toggleRule('ecc-rule:rust-patterns.md', true);
    mgr.toggleMcp('remoteApi', false);

    const savedState = mgr.saveCustomPreset('Mode Riset', 'Fokus riset tanpa remoteApi', true);
    assert.equal(savedState.customPresets.length, 1);
    const custom = savedState.customPresets[0];
    assert.equal(custom.name, 'Mode Riset');
    assert.equal(custom.includesMcp, true);

    // Mutate everything differently
    mgr.toggleSkill('manual-dir:graphify', true);
    mgr.toggleRule('ecc-rule:rust-patterns.md', false);
    mgr.toggleMcp('remoteApi', true);

    // Reapply custom preset and verify exact restoration
    const reapplied = mgr.applyPreset(custom.id);
    const toolsCat = reapplied.skillCategories.find(c => c.id === 'manual-tools');
    assert.equal(toolsCat.activeCount, 0);
    assert.equal(fs.existsSync(path.join(mgr.AGENTS_RULES, 'rust-patterns.md')), true);
    assert.equal(reapplied.mcpServers.find(m => m.name === 'remoteApi').enabled, false);

    // Restore MCP and delete custom preset
    mgr.toggleMcp('remoteApi', true);
    mgr.toggleSkill('manual-dir:graphify', true);
    mgr.toggleRule('ecc-rule:rust-patterns.md', false);
    const afterDelete = mgr.deleteCustomPreset(custom.id);
    assert.equal(afterDelete.customPresets.length, 0);
  });
});
