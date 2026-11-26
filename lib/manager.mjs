import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const HOME = os.homedir();
export const GEMINI_CONFIG = path.join(HOME, '.gemini', 'config');
export const GEMINI_SKILLS = path.join(GEMINI_CONFIG, 'skills');
export const GEMINI_SKILLS_DISABLED = path.join(GEMINI_CONFIG, 'skills.disabled');
export const GEMINI_SKILLS_JSON = path.join(GEMINI_CONFIG, 'skills.json');
export const GEMINI_RULES = path.join(GEMINI_CONFIG, 'rules');
export const GEMINI_RULES_DISABLED = path.join(GEMINI_CONFIG, 'rules.disabled');
export const GEMINI_PLUGINS = path.join(GEMINI_CONFIG, 'plugins');
export const MCP_CONFIG = path.join(GEMINI_CONFIG, 'mcp_config.json');
export const MCP_DISABLED = path.join(GEMINI_CONFIG, 'mcp_config.disabled.json');

export const AGENTS_DIR = path.join(HOME, '.agents');
export const AGENTS_SKILLS = path.join(AGENTS_DIR, 'skills');
export const AGENTS_SKILLS_DISABLED = path.join(AGENTS_DIR, 'skills.disabled');
export const AGENTS_RULES = path.join(AGENTS_DIR, 'rules');
export const AGENTS_RULES_DISABLED = path.join(AGENTS_DIR, 'rules.disabled');
export const ECC_STATE = path.join(AGENTS_DIR, '.ecc-state.json');
export const SKILL_LOCK = path.join(AGENTS_DIR, '.skill-lock.json');

export const SKILL_BUDGET_LIMIT = 20000;
export const RULE_BUDGET_LIMIT = 20000;

export const ECC_SKILL_CATEGORIES = [
  {
    id: 'ecc-methodology',
    label: 'ECC: Metodologi & TDD',
    skills: [
      'tdd-workflow', 'verification-loop', 'eval-harness', 'continuous-agent-loop',
      'agentic-engineering', 'search-first', 'benchmark', 'error-handling',
      'coding-standards', 'codebase-onboarding', 'codehealth-mcp'
    ]
  },
  {
    id: 'ecc-frontend',
    label: 'ECC: Frontend & UI',
    skills: [
      'frontend-patterns', 'react-patterns', 'react-testing', 'react-performance',
      'react-native-patterns', 'frontend-a11y', 'accessibility', 'make-interfaces-feel-better',
      'frontend-design-direction', 'motion-patterns', 'motion-foundations',
      'vite-patterns', 'nextjs-turbopack', 'bun-runtime', 'daisyui'
    ]
  },
  {
    id: 'ecc-backend',
    label: 'ECC: Backend & API',
    skills: [
      'backend-patterns', 'api-design', 'nestjs-patterns', 'golang-patterns',
      'golang-testing', 'rust-patterns', 'rust-testing', 'hexagonal-architecture'
    ]
  },
  {
    id: 'ecc-database',
    label: 'ECC: Database & Cache',
    skills: [
      'postgres-patterns', 'mysql-patterns', 'redis-patterns', 'prisma-patterns',
      'database-migrations', 'content-hash-cache-pattern'
    ]
  },
  {
    id: 'ecc-security',
    label: 'ECC: Security & DevOps',
    skills: [
      'security-review', 'security-scan', 'safety-guard', 'deployment-patterns',
      'docker-patterns', 'git-workflow', 'conventional-commit-review', 'github-ops',
      'e2e-testing', 'browser-qa'
    ]
  },
  {
    id: 'ecc-ai',
    label: 'ECC: AI & Orchestration',
    skills: [
      'unified-memory', 'prompt-optimizer', 'agent-self-evaluation', 'dev-team',
      'orch-add-feature', 'orch-build-mvp', 'orch-change-feature', 'orch-fix-defect',
      'orch-pipeline', 'orch-refine-code', 'plan-canvas', 'plan-orchestrate'
    ]
  }
];

const DESIGN_SKILL_NAMES = new Set([
  'awwwards', 'jury', 'ui-ux-pro-max', 'banner-design',
  'brand', 'design', 'design-system', 'slides', 'ui-styling'
]);

export const PRESETS = [
  {
    id: 'hemat-token',
    name: 'Hemat Token',
    description: 'Matikan semua skill dan rule ECC; pertahankan skill manual (FigCraft, Design pilihan, dan Tools) tetap aktif.',
    summary: 'ECC OFF, Manual Skills ON'
  },
  {
    id: 'frontend-ui',
    name: 'Frontend & UI',
    description: 'Aktifkan ECC Frontend & UI, FigCraft, Design & UI/UX, serta ECC Rules Common dan TypeScript.',
    summary: 'ECC Frontend + Design + FigCraft + Rules Common/TS'
  },
  {
    id: 'fullstack-ecc',
    name: 'Full-Stack ECC',
    description: 'Aktifkan seluruh kategori skill ECC (Metodologi, Frontend, Backend, Database, Security, AI) dan ECC Rules Common.',
    summary: 'Semua ECC Skills + ECC Rules Common'
  }
];

function normalizePath(p) {
  return path.resolve(p).replace(/\\/g, '/').replace(/\/+$/, '');
}

function readJsonSafe(filePath, fallback = {}) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonSafe(filePath, data, mode) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const options = mode ? { encoding: 'utf-8', mode } : { encoding: 'utf-8' };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), options);
  if (mode) {
    try {
      fs.chmodSync(filePath, mode);
    } catch {
      // Ignore chmod errors on non-supporting filesystems
    }
  }
}

function removeDirIfEmpty(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  try {
    if (fs.readdirSync(dirPath).length === 0) {
      fs.rmdirSync(dirPath);
    }
  } catch {
    // Ignore
  }
}

function listDirEntries(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath);
}

function isDirOrSymlinkToDir(fullPath) {
  try {
    return fs.statSync(fullPath).isDirectory();
  } catch {
    return false;
  }
}

function isSkillsJsonRegistered() {
  const raw = readJsonSafe(GEMINI_SKILLS_JSON, { entries: [] });
  const targetNorm = normalizePath(AGENTS_SKILLS);
  return Array.isArray(raw.entries) && raw.entries.some(e => e && e.path && normalizePath(e.path) === targetNorm);
}

function updateSkillsJson(register) {
  const raw = readJsonSafe(GEMINI_SKILLS_JSON, { entries: [] });
  const targetNorm = normalizePath(AGENTS_SKILLS);
  const existingEntries = Array.isArray(raw.entries) ? raw.entries : [];
  const filteredEntries = existingEntries.filter(e => !(e && e.path && normalizePath(e.path) === targetNorm));
  if (register) {
    filteredEntries.push({ path: AGENTS_SKILLS.replace(/\\/g, '/') });
  }
  writeJsonSafe(GEMINI_SKILLS_JSON, { ...raw, entries: filteredEntries });
}

function getProtectedNonEccSkillNames() {
  const protectedSet = new Set();
  const lock = readJsonSafe(SKILL_LOCK, {});
  if (lock.skills && typeof lock.skills === 'object') {
    for (const name of Object.keys(lock.skills)) {
      protectedSet.add(name);
    }
  }

  const agentsRoot = path.resolve(AGENTS_SKILLS);
  for (const entry of listDirEntries(GEMINI_SKILLS)) {
    const full = path.join(GEMINI_SKILLS, entry);
    try {
      if (fs.lstatSync(full).isSymbolicLink()) {
        const target = path.resolve(GEMINI_SKILLS, fs.readlinkSync(full));
        if (path.dirname(target) === agentsRoot) {
          protectedSet.add(path.basename(target));
        }
      }
    } catch {
      // Ignore broken symlink
    }
  }

  return protectedSet;
}

function parseSkillMetadata(skillDir) {
  const skillMd = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMd)) {
    return { description: 'Tidak ada deskripsi di SKILL.md.', tokens: 50 };
  }
  const content = fs.readFileSync(skillMd, 'utf-8');
  const fmMatch = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  let tokens = 80;
  let description = '';

  if (fmMatch) {
    const fm = fmMatch[1];
    tokens = Math.ceil((fm.length + skillDir.length + 30) / 3.6);
    const lines = fm.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^description:\s*(.*)$/);
      if (!m) continue;
      let val = m[1].trim();
      if (val === '>-' || val === '|-' || val === '|' || val === '>') {
        const buf = [];
        for (let j = i + 1; j < lines.length; j++) {
          if (/^[a-zA-Z0-9_-]+:/.test(lines[j])) break;
          if (lines[j].trim()) buf.push(lines[j].trim());
        }
        description = buf.join(' ');
      } else {
        const buf = [val.replace(/^["']|["']$/g, '')];
        for (let j = i + 1; j < lines.length; j++) {
          if (/^[a-zA-Z0-9_-]+:/.test(lines[j]) || !/^\s+/.test(lines[j])) break;
          buf.push(lines[j].trim());
        }
        description = buf.join(' ').replace(/^["']|["']$/g, '');
      }
      break;
    }
  }

  if (!description) {
    const bodyLines = content
      .replace(/^---\s*\r?\n[\s\S]*?\r?\n---/, '')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#') && !l.startsWith('>'));
    description = bodyLines[0] || 'Skill kustom Antigravity.';
  }

  description = description.replace(/\s+/g, ' ').trim();
  if (description.length > 140) {
    description = description.slice(0, 137) + '...';
  }
  return { description, tokens };
}

function getEccCategoryForSkill(skillName) {
  for (const cat of ECC_SKILL_CATEGORIES) {
    if (cat.skills.includes(skillName)) return cat;
  }
  return { id: 'ecc-other', label: 'ECC: Lainnya' };
}

function getManualCategoryForSkill(skillName) {
  if (skillName.startsWith('figcraft-')) {
    return { id: 'manual-figcraft', label: 'FigCraft' };
  }
  if (DESIGN_SKILL_NAMES.has(skillName)) {
    return { id: 'manual-design', label: 'Design & UI/UX' };
  }
  return { id: 'manual-tools', label: 'Manual & Tools' };
}

function getPluginDisabledMap() {
  const config = readJsonSafe(path.join(GEMINI_CONFIG, 'config.json'), {});
  const disabledSet = new Set();
  if (Array.isArray(config.disabledPlugins)) {
    for (const d of config.disabledPlugins) disabledSet.add(d);
  }
  return disabledSet;
}

function collectSkills() {
  const skills = [];
  const seenIds = new Set();
  const eccState = readJsonSafe(ECC_STATE, {});
  const trackedEcc = new Set(Array.isArray(eccState.managedSkills) ? eccState.managedSkills : []);
  const protectedNames = getProtectedNonEccSkillNames();
  const eccRegistered = isSkillsJsonRegistered();
  const pluginsRoot = path.resolve(GEMINI_PLUGINS);
  const agentsRoot = path.resolve(AGENTS_SKILLS);
  const disabledPlugins = getPluginDisabledMap();

  // 1. Scan active ~/.gemini/config/skills
  const activeAgentLinkNames = new Set();
  for (const entry of listDirEntries(GEMINI_SKILLS)) {
    const full = path.join(GEMINI_SKILLS, entry);
    if (!isDirOrSymlinkToDir(full)) continue;
    let isSymlink = false;
    let target = '';
    try {
      const lstat = fs.lstatSync(full);
      isSymlink = lstat.isSymbolicLink();
      if (isSymlink) {
        target = path.resolve(GEMINI_SKILLS, fs.readlinkSync(full));
      }
    } catch {
      continue;
    }

    if (isSymlink && target.startsWith(pluginsRoot + path.sep)) {
      // Symlink into plugin bundle: handled under plugin-skills so we don't show duplicate broken toggle
      continue;
    }

    if (isSymlink && path.dirname(target) === agentsRoot) {
      const targetName = path.basename(target);
      activeAgentLinkNames.add(targetName);
      const cat = getManualCategoryForSkill(targetName);
      const meta = parseSkillMetadata(target);
      const id = `manual-link:${targetName}`;
      seenIds.add(id);
      skills.push({
        id,
        name: targetName,
        kind: 'manual-link',
        sourceLabel: 'Symlink',
        categoryId: cat.id,
        categoryLabel: cat.label,
        enabled: true,
        toggleable: true,
        tokens: meta.tokens,
        description: meta.description,
        path: full
      });
      continue;
    }

    const cat = getManualCategoryForSkill(entry);
    const meta = parseSkillMetadata(full);
    const id = `manual-dir:${entry}`;
    seenIds.add(id);
    skills.push({
      id,
      name: entry,
      kind: 'manual-dir',
      sourceLabel: 'Manual',
      categoryId: cat.id,
      categoryLabel: cat.label,
      enabled: true,
      toggleable: true,
      tokens: meta.tokens,
      description: meta.description,
      path: full
    });
  }

  // 2. Scan disabled manual skills in ~/.gemini/config/skills.disabled
  for (const entry of listDirEntries(GEMINI_SKILLS_DISABLED)) {
    const full = path.join(GEMINI_SKILLS_DISABLED, entry);
    if (!isDirOrSymlinkToDir(full)) continue;
    const id = `manual-dir:${entry}`;
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    const cat = getManualCategoryForSkill(entry);
    const meta = parseSkillMetadata(full);
    skills.push({
      id,
      name: entry,
      kind: 'manual-dir',
      sourceLabel: 'Manual',
      categoryId: cat.id,
      categoryLabel: cat.label,
      enabled: false,
      toggleable: true,
      tokens: meta.tokens,
      description: meta.description,
      path: full
    });
  }

  // 3. Scan ~/.agents/skills (ECC active OR non-ECC manual folders)
  const eccCatalogSet = new Set(ECC_SKILL_CATEGORIES.flatMap(c => c.skills));
  for (const entry of listDirEntries(AGENTS_SKILLS)) {
    const full = path.join(AGENTS_SKILLS, entry);
    if (!isDirOrSymlinkToDir(full)) continue;

    const isEcc = trackedEcc.size > 0
      ? (trackedEcc.has(entry) && !protectedNames.has(entry))
      : (!protectedNames.has(entry) && !DESIGN_SKILL_NAMES.has(entry) && eccCatalogSet.has(entry));

    if (isEcc) {
      const cat = getEccCategoryForSkill(entry);
      const meta = parseSkillMetadata(full);
      const id = `ecc:${entry}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      skills.push({
        id,
        name: entry,
        kind: 'ecc',
        sourceLabel: 'ECC',
        categoryId: cat.id,
        categoryLabel: cat.label,
        enabled: eccRegistered,
        toggleable: true,
        tokens: meta.tokens,
        description: meta.description,
        path: full
      });
    } else {
      // Non-ECC skill stored in ~/.agents/skills (e.g. awwwards, design-system, banner-design)
      if (activeAgentLinkNames.has(entry)) continue;
      const id = `manual-link:${entry}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      const cat = getManualCategoryForSkill(entry);
      const meta = parseSkillMetadata(full);
      skills.push({
        id,
        name: entry,
        kind: 'manual-link',
        sourceLabel: 'Manual',
        categoryId: cat.id,
        categoryLabel: cat.label,
        enabled: false,
        toggleable: true,
        tokens: meta.tokens,
        description: meta.description,
        path: full
      });
    }
  }

  // 4. Scan ~/.agents/skills.disabled (ECC disabled skills)
  for (const entry of listDirEntries(AGENTS_SKILLS_DISABLED)) {
    const full = path.join(AGENTS_SKILLS_DISABLED, entry);
    if (!isDirOrSymlinkToDir(full)) continue;
    const id = `ecc:${entry}`;
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    const cat = getEccCategoryForSkill(entry);
    const meta = parseSkillMetadata(full);
    skills.push({
      id,
      name: entry,
      kind: 'ecc',
      sourceLabel: 'ECC',
      categoryId: cat.id,
      categoryLabel: cat.label,
      enabled: false,
      toggleable: true,
      tokens: meta.tokens,
      description: meta.description,
      path: full
    });
  }

  // 5. Scan plugin-bundled skills in ~/.gemini/config/plugins/*/skills/*
  for (const pluginDir of listDirEntries(GEMINI_PLUGINS)) {
    const pluginPath = path.join(GEMINI_PLUGINS, pluginDir);
    if (!isDirOrSymlinkToDir(pluginPath)) continue;
    const pluginSkillsDir = path.join(pluginPath, 'skills');
    const pluginJson = readJsonSafe(path.join(pluginPath, 'plugin.json'), {});
    const isDisabled = Boolean(pluginJson.disabled) || disabledPlugins.has(pluginDir);
    for (const s of listDirEntries(pluginSkillsDir)) {
      const full = path.join(pluginSkillsDir, s);
      if (!isDirOrSymlinkToDir(full)) continue;
      const meta = parseSkillMetadata(full);
      skills.push({
        id: `plugin:${pluginDir}:${s}`,
        name: s,
        kind: 'plugin',
        sourceLabel: `Plugin: ${pluginDir}`,
        pluginDir,
        categoryId: 'plugin-skills',
        categoryLabel: 'Plugin Bundled',
        enabled: !isDisabled,
        toggleable: false,
        tokens: meta.tokens,
        description: meta.description,
        path: full
      });
    }
  }

  const categoryOrder = [
    'manual-figcraft', 'manual-design', 'manual-tools',
    'ecc-methodology', 'ecc-frontend', 'ecc-backend',
    'ecc-database', 'ecc-security', 'ecc-ai', 'ecc-other',
    'plugin-skills'
  ];

  const catMap = new Map();
  for (const sk of skills) {
    if (!catMap.has(sk.categoryId)) {
      catMap.set(sk.categoryId, {
        id: sk.categoryId,
        label: sk.categoryLabel,
        toggleable: sk.categoryId !== 'plugin-skills',
        items: []
      });
    }
    catMap.get(sk.categoryId).items.push(sk);
  }

  const categories = Array.from(catMap.values())
    .sort((a, b) => {
      const ia = categoryOrder.indexOf(a.id);
      const ib = categoryOrder.indexOf(b.id);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    })
    .map(cat => {
      cat.items.sort((a, b) => a.name.localeCompare(b.name));
      const activeItems = cat.items.filter(i => i.enabled);
      return {
        ...cat,
        activeCount: activeItems.length,
        totalCount: cat.items.length,
        activeTokens: activeItems.reduce((sum, i) => sum + i.tokens, 0)
      };
    });

  return { skills, categories };
}

function formatRuleGroupTitle(prefix) {
  const map = {
    common: 'Common',
    typescript: 'TypeScript',
    golang: 'Go',
    rust: 'Rust',
    python: 'Python',
    java: 'Java',
    kotlin: 'Kotlin',
    swift: 'Swift',
    csharp: 'C#',
    cpp: 'C++',
    php: 'PHP',
    perl: 'Perl',
    dart: 'Dart',
    angular: 'Angular',
    arkts: 'ArkTS'
  };
  return map[prefix] || prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

function readRulePreview(filePath) {
  const stat = fs.statSync(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('---'));
  const preview = (lines[0] || '').replace(/^#+\s*/, '').slice(0, 130);
  return {
    bytes: stat.size,
    tokens: Math.ceil(stat.size / 4),
    description: preview || 'Aturan Markdown untuk Antigravity.'
  };
}

function collectRules() {
  const rules = [];
  const seenIds = new Set();
  const disabledPlugins = getPluginDisabledMap();

  const scanRuleFolder = (dirPath, enabled, kind, categoryId, categoryLabel, sourceLabel) => {
    for (const file of listDirEntries(dirPath)) {
      if (!file.endsWith('.md')) continue;
      const full = path.join(dirPath, file);
      try {
        if (!fs.statSync(full).isFile()) continue;
      } catch {
        continue;
      }
      const id = `${kind}:${file}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      const info = readRulePreview(full);
      const prefix = file.includes('-') ? file.split('-')[0] : 'general';
      const resolvedCatId = kind === 'ecc-rule' ? `ecc-rules-${prefix}` : categoryId;
      const resolvedCatLabel = kind === 'ecc-rule' ? `ECC Rules: ${formatRuleGroupTitle(prefix)}` : categoryLabel;
      rules.push({
        id,
        name: file,
        kind,
        sourceLabel,
        categoryId: resolvedCatId,
        categoryLabel: resolvedCatLabel,
        enabled,
        toggleable: true,
        bytes: info.bytes,
        tokens: info.tokens,
        description: info.description,
        path: full
      });
    }
  };

  scanRuleFolder(GEMINI_RULES, true, 'global-rule', 'rules-global', 'Global Rules', 'Global');
  scanRuleFolder(GEMINI_RULES_DISABLED, false, 'global-rule', 'rules-global', 'Global Rules', 'Global');
  scanRuleFolder(AGENTS_RULES, true, 'ecc-rule', 'ecc-rules-common', 'ECC Rules: Common', 'ECC');
  scanRuleFolder(AGENTS_RULES_DISABLED, false, 'ecc-rule', 'ecc-rules-common', 'ECC Rules: Common', 'ECC');

  for (const pluginDir of listDirEntries(GEMINI_PLUGINS)) {
    const pluginPath = path.join(GEMINI_PLUGINS, pluginDir);
    if (!isDirOrSymlinkToDir(pluginPath)) continue;
    const pluginRulesDir = path.join(pluginPath, 'rules');
    const pluginJson = readJsonSafe(path.join(pluginPath, 'plugin.json'), {});
    const isDisabled = Boolean(pluginJson.disabled) || disabledPlugins.has(pluginDir);
    for (const file of listDirEntries(pluginRulesDir)) {
      if (!file.endsWith('.md')) continue;
      const full = path.join(pluginRulesDir, file);
      try {
        if (!fs.statSync(full).isFile()) continue;
      } catch {
        continue;
      }
      const info = readRulePreview(full);
      rules.push({
        id: `plugin-rule:${pluginDir}:${file}`,
        name: `${pluginDir}/${file}`,
        kind: 'plugin-rule',
        sourceLabel: `Plugin: ${pluginDir}`,
        pluginDir,
        categoryId: 'rules-plugin',
        categoryLabel: 'Plugin Rules',
        enabled: !isDisabled,
        toggleable: false,
        bytes: info.bytes,
        tokens: info.tokens,
        description: info.description,
        path: full
      });
    }
  }

  const catMap = new Map();
  for (const r of rules) {
    if (!catMap.has(r.categoryId)) {
      catMap.set(r.categoryId, {
        id: r.categoryId,
        label: r.categoryLabel,
        toggleable: r.categoryId !== 'rules-plugin',
        items: []
      });
    }
    catMap.get(r.categoryId).items.push(r);
  }

  const categories = Array.from(catMap.values())
    .sort((a, b) => {
      if (a.id === 'rules-global') return -1;
      if (b.id === 'rules-global') return 1;
      if (a.id === 'rules-plugin') return 1;
      if (b.id === 'rules-plugin') return -1;
      if (a.id === 'ecc-rules-common') return -1;
      if (b.id === 'ecc-rules-common') return 1;
      return a.label.localeCompare(b.label);
    })
    .map(cat => {
      cat.items.sort((a, b) => a.name.localeCompare(b.name));
      const activeItems = cat.items.filter(i => i.enabled);
      return {
        ...cat,
        activeCount: activeItems.length,
        totalCount: cat.items.length,
        activeTokens: activeItems.reduce((sum, i) => sum + i.tokens, 0),
        activeBytes: activeItems.reduce((sum, i) => sum + i.bytes, 0)
      };
    });

  return { rules, categories };
}

function redactSecret(val) {
  const s = String(val || '');
  if (s.length <= 4) return '••••';
  return '••••' + s.slice(-4);
}

function redactArgString(arg) {
  const s = String(arg);
  const headerKeyMatch = s.match(/^([A-Za-z0-9_-]*(?:key|token|secret|authorization|auth)[A-Za-z0-9_-]*\s*:\s*)(.+)$/i);
  if (headerKeyMatch) {
    return headerKeyMatch[1] + redactSecret(headerKeyMatch[2].trim());
  }
  if (/^(Bearer\s+|AQ\.|sk-|ghp_|xox[baprs]-)/i.test(s)) {
    return redactSecret(s);
  }
  return s;
}

function summarizeMcpServer(name, cfg, enabled, toggleable, sourceLabel, pluginDir) {
  const transport = cfg.url || cfg.serverUrl ? 'Streamable HTTP' : 'Stdio';
  const rawArgs = Array.isArray(cfg.args) ? cfg.args : [];
  const redactedArgs = [];
  for (let i = 0; i < rawArgs.length; i++) {
    const curr = String(rawArgs[i]);
    if (i > 0 && /^(--header|-H|--api-key|--token|--secret)$/i.test(String(rawArgs[i - 1]))) {
      redactedArgs.push(redactArgString(curr));
    } else {
      redactedArgs.push(redactArgString(curr));
    }
  }

  const redactedEnv = {};
  if (cfg.env && typeof cfg.env === 'object') {
    for (const [k, v] of Object.entries(cfg.env)) {
      if (/key|token|secret|password|auth|credential/i.test(k)) {
        redactedEnv[k] = redactSecret(v);
      } else {
        redactedEnv[k] = String(v);
      }
    }
  }

  const commandPreview = transport === 'Streamable HTTP'
    ? String(cfg.url || cfg.serverUrl)
    : [cfg.command || '', ...redactedArgs].filter(Boolean).join(' ');

  return {
    name,
    enabled,
    toggleable,
    sourceLabel,
    pluginDir: pluginDir || null,
    transport,
    commandPreview,
    env: redactedEnv
  };
}

function collectMcpServers() {
  const activeCfg = readJsonSafe(MCP_CONFIG, { mcpServers: {} });
  const disabledCfg = readJsonSafe(MCP_DISABLED, { mcpServers: {} });
  const activeMap = activeCfg.mcpServers && typeof activeCfg.mcpServers === 'object' ? activeCfg.mcpServers : {};
  const disabledMap = disabledCfg.mcpServers && typeof disabledCfg.mcpServers === 'object' ? disabledCfg.mcpServers : {};
  const disabledPlugins = getPluginDisabledMap();

  const items = [];
  for (const [name, cfg] of Object.entries(activeMap)) {
    items.push(summarizeMcpServer(name, cfg, true, true, 'Global', null));
  }
  for (const [name, cfg] of Object.entries(disabledMap)) {
    if (Object.hasOwn(activeMap, name)) continue;
    items.push(summarizeMcpServer(name, cfg, false, true, 'Global', null));
  }

  for (const pluginDir of listDirEntries(GEMINI_PLUGINS)) {
    const pluginPath = path.join(GEMINI_PLUGINS, pluginDir);
    if (!isDirOrSymlinkToDir(pluginPath)) continue;
    const pluginMcpPath = path.join(pluginPath, 'mcp_config.json');
    if (!fs.existsSync(pluginMcpPath)) continue;
    const pluginMcp = readJsonSafe(pluginMcpPath, { mcpServers: {} });
    const pluginJson = readJsonSafe(path.join(pluginPath, 'plugin.json'), {});
    const isDisabled = Boolean(pluginJson.disabled) || disabledPlugins.has(pluginDir);
    const servers = pluginMcp.mcpServers && typeof pluginMcp.mcpServers === 'object' ? pluginMcp.mcpServers : {};
    for (const [name, cfg] of Object.entries(servers)) {
      items.push(summarizeMcpServer(name, cfg, !isDisabled, false, `Plugin: ${pluginDir}`, pluginDir));
    }
  }

  items.sort((a, b) => {
    if (a.toggleable !== b.toggleable) return a.toggleable ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return items;
}

export function getState() {
  const { skills, categories: skillCategories } = collectSkills();
  const { rules, categories: ruleCategories } = collectRules();
  const mcpServers = collectMcpServers();

  const activeSkills = skills.filter(s => s.enabled);
  const activeSkillTokens = activeSkills.reduce((sum, s) => sum + s.tokens, 0);
  const activeRules = rules.filter(r => r.enabled);
  const activeRuleBytes = activeRules.reduce((sum, r) => sum + r.bytes, 0);
  const activeRuleTokens = activeRules.reduce((sum, r) => sum + r.tokens, 0);
  const activeMcpCount = mcpServers.filter(m => m.enabled).length;

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      activeSkillsCount: activeSkills.length,
      totalSkillsCount: skills.length,
      activeSkillTokens,
      skillBudgetLimit: SKILL_BUDGET_LIMIT,
      activeRulesCount: activeRules.length,
      totalRulesCount: rules.length,
      activeRuleBytes,
      activeRuleTokens,
      ruleBudgetLimit: RULE_BUDGET_LIMIT,
      activeMcpCount,
      totalMcpCount: mcpServers.length,
      eccSkillsRegistered: isSkillsJsonRegistered()
    },
    skillCategories,
    ruleCategories,
    mcpServers,
    presets: PRESETS
  };
}

function syncEccDiscovery() {
  const eccState = readJsonSafe(ECC_STATE, {});
  const managedSet = new Set(Array.isArray(eccState.managedSkills) ? eccState.managedSkills : []);
  const protectedNames = getProtectedNonEccSkillNames();
  const activeAgentsDirs = listDirEntries(AGENTS_SKILLS).filter(d => isDirOrSymlinkToDir(path.join(AGENTS_SKILLS, d)));

  let activeEccCount = 0;
  for (const d of activeAgentsDirs) {
    if (managedSet.has(d) && !protectedNames.has(d)) {
      activeEccCount++;
    }
  }

  const shouldEnable = activeEccCount > 0;
  updateSkillsJson(shouldEnable);
  writeJsonSafe(ECC_STATE, {
    ...eccState,
    status: shouldEnable ? 'enabled' : 'disabled',
    managedSkills: Array.from(managedSet).sort(),
    updatedAt: new Date().toISOString()
  });
}

function applySingleSkillToggle(skill, enabled) {
  if (!skill.toggleable) {
    throw new Error(`Skill "${skill.name}" dikelola oleh plugin ${skill.pluginDir}.`);
  }

  if (skill.kind === 'manual-dir') {
    const activePath = path.join(GEMINI_SKILLS, skill.name);
    const disabledPath = path.join(GEMINI_SKILLS_DISABLED, skill.name);
    if (enabled) {
      if (fs.existsSync(activePath)) return false;
      if (!fs.existsSync(disabledPath)) throw new Error(`Arsip skill "${skill.name}" tidak ditemukan.`);
      fs.mkdirSync(GEMINI_SKILLS, { recursive: true });
      fs.renameSync(disabledPath, activePath);
      removeDirIfEmpty(GEMINI_SKILLS_DISABLED);
      return true;
    } else {
      if (!fs.existsSync(activePath)) return false;
      if (fs.existsSync(disabledPath)) throw new Error(`Folder disabled "${skill.name}" sudah ada.`);
      fs.mkdirSync(GEMINI_SKILLS_DISABLED, { recursive: true });
      fs.renameSync(activePath, disabledPath);
      return true;
    }
  }

  if (skill.kind === 'manual-link') {
    const linkPath = path.join(GEMINI_SKILLS, skill.name);
    const targetPath = path.join(AGENTS_SKILLS, skill.name);
    if (enabled) {
      if (!fs.existsSync(targetPath)) throw new Error(`Sumber skill "${skill.name}" tidak ditemukan di ${AGENTS_SKILLS}.`);
      if (fs.existsSync(linkPath)) return false;
      fs.mkdirSync(GEMINI_SKILLS, { recursive: true });
      fs.symlinkSync(targetPath, linkPath, 'dir');
      return true;
    } else {
      try {
        const lstat = fs.lstatSync(linkPath);
        if (!lstat.isSymbolicLink()) {
          throw new Error(`"${linkPath}" bukan symlink; dibatalkan demi keamanan.`);
        }
        fs.unlinkSync(linkPath);
        return true;
      } catch (err) {
        if (err && err.code === 'ENOENT') return false;
        throw err;
      }
    }
  }

  if (skill.kind === 'ecc') {
    const activePath = path.join(AGENTS_SKILLS, skill.name);
    const disabledPath = path.join(AGENTS_SKILLS_DISABLED, skill.name);
    const eccState = readJsonSafe(ECC_STATE, {});
    const managedSet = new Set(Array.isArray(eccState.managedSkills) ? eccState.managedSkills : []);
    const protectedNames = getProtectedNonEccSkillNames();

    if (enabled) {
      if (fs.existsSync(activePath)) {
        if (!managedSet.has(skill.name) || protectedNames.has(skill.name)) {
          throw new Error(`Nama "${skill.name}" sudah dipakai skill non-ECC di ${AGENTS_SKILLS}.`);
        }
        return false;
      }
      if (!fs.existsSync(disabledPath)) throw new Error(`Arsip ECC skill "${skill.name}" tidak ditemukan.`);
      fs.mkdirSync(AGENTS_SKILLS, { recursive: true });
      fs.renameSync(disabledPath, activePath);
      managedSet.add(skill.name);
      writeJsonSafe(ECC_STATE, {
        ...eccState,
        managedSkills: Array.from(managedSet).sort(),
        updatedAt: new Date().toISOString()
      });
      removeDirIfEmpty(AGENTS_SKILLS_DISABLED);
      return true;
    } else {
      if (!fs.existsSync(activePath)) return false;
      if (protectedNames.has(skill.name)) {
        throw new Error(`Skill "${skill.name}" dilindungi sebagai skill non-ECC.`);
      }
      fs.mkdirSync(AGENTS_SKILLS_DISABLED, { recursive: true });
      if (fs.existsSync(disabledPath)) {
        fs.rmSync(disabledPath, { recursive: true, force: true });
      }
      fs.renameSync(activePath, disabledPath);
      managedSet.add(skill.name);
      writeJsonSafe(ECC_STATE, {
        ...eccState,
        managedSkills: Array.from(managedSet).sort(),
        updatedAt: new Date().toISOString()
      });
      return true;
    }
  }

  throw new Error(`Jenis skill tidak dikenal: ${skill.kind}`);
}

export function toggleSkill(id, enabled) {
  const { skills } = collectSkills();
  const target = skills.find(s => s.id === id);
  if (!target) {
    throw new Error(`Skill "${id}" tidak ditemukan.`);
  }
  applySingleSkillToggle(target, Boolean(enabled));
  if (target.kind === 'ecc') {
    syncEccDiscovery();
  }
  return getState();
}

export function toggleSkillCategory(categoryId, enabled) {
  const { categories } = collectSkills();
  const cat = categories.find(c => c.id === categoryId);
  if (!cat) {
    throw new Error(`Kategori skill "${categoryId}" tidak ditemukan.`);
  }
  if (!cat.toggleable) {
    throw new Error(`Kategori "${cat.label}" dikelola oleh masing-masing plugin.`);
  }

  let touchedEcc = false;
  for (const item of cat.items) {
    if (!item.toggleable || item.enabled === Boolean(enabled)) continue;
    applySingleSkillToggle(item, Boolean(enabled));
    if (item.kind === 'ecc') touchedEcc = true;
  }

  if (touchedEcc) {
    syncEccDiscovery();
  }
  return getState();
}

function applySingleRuleToggle(rule, enabled) {
  if (!rule.toggleable) {
    throw new Error(`Rule "${rule.name}" dikelola oleh plugin ${rule.pluginDir}.`);
  }
  const activeDir = rule.kind === 'global-rule' ? GEMINI_RULES : AGENTS_RULES;
  const disabledDir = rule.kind === 'global-rule' ? GEMINI_RULES_DISABLED : AGENTS_RULES_DISABLED;
  const activePath = path.join(activeDir, rule.name);
  const disabledPath = path.join(disabledDir, rule.name);

  if (enabled) {
    if (fs.existsSync(activePath)) return false;
    if (!fs.existsSync(disabledPath)) throw new Error(`Arsip rule "${rule.name}" tidak ditemukan.`);
    fs.mkdirSync(activeDir, { recursive: true });
    fs.renameSync(disabledPath, activePath);
    removeDirIfEmpty(disabledDir);
    return true;
  } else {
    if (!fs.existsSync(activePath)) return false;
    fs.mkdirSync(disabledDir, { recursive: true });
    fs.renameSync(activePath, disabledPath);
    removeDirIfEmpty(activeDir);
    return true;
  }
}

export function toggleRule(id, enabled) {
  const { rules } = collectRules();
  const target = rules.find(r => r.id === id);
  if (!target) {
    throw new Error(`Rule "${id}" tidak ditemukan.`);
  }
  applySingleRuleToggle(target, Boolean(enabled));
  return getState();
}

export function toggleRuleCategory(categoryId, enabled) {
  const { categories } = collectRules();
  const cat = categories.find(c => c.id === categoryId);
  if (!cat) {
    throw new Error(`Kategori rule "${categoryId}" tidak ditemukan.`);
  }
  if (!cat.toggleable) {
    throw new Error(`Kategori "${cat.label}" dikelola oleh masing-masing plugin.`);
  }

  for (const item of cat.items) {
    if (!item.toggleable || item.enabled === Boolean(enabled)) continue;
    applySingleRuleToggle(item, Boolean(enabled));
  }
  return getState();
}

export function toggleMcp(name, enabled) {
  const activeCfg = readJsonSafe(MCP_CONFIG, { mcpServers: {} });
  const disabledCfg = readJsonSafe(MCP_DISABLED, { mcpServers: {} });
  if (!activeCfg.mcpServers || typeof activeCfg.mcpServers !== 'object') activeCfg.mcpServers = {};
  if (!disabledCfg.mcpServers || typeof disabledCfg.mcpServers !== 'object') disabledCfg.mcpServers = {};

  if (enabled) {
    if (Object.hasOwn(activeCfg.mcpServers, name)) {
      return getState();
    }
    if (!Object.hasOwn(disabledCfg.mcpServers, name)) {
      throw new Error(`MCP server "${name}" tidak ditemukan di arsip nonaktif.`);
    }
    activeCfg.mcpServers[name] = disabledCfg.mcpServers[name];
    delete disabledCfg.mcpServers[name];
  } else {
    if (!Object.hasOwn(activeCfg.mcpServers, name)) {
      if (Object.hasOwn(disabledCfg.mcpServers, name)) return getState();
      throw new Error(`MCP server "${name}" tidak ditemukan di mcp_config.json.`);
    }
    disabledCfg.mcpServers[name] = activeCfg.mcpServers[name];
    delete activeCfg.mcpServers[name];
  }

  writeJsonSafe(MCP_CONFIG, activeCfg, 0o600);
  writeJsonSafe(MCP_DISABLED, disabledCfg, 0o600);
  return getState();
}

export function applyPreset(presetId) {
  const { categories: skillCats } = collectSkills();
  const { categories: ruleCats } = collectRules();

  const eccSkillCatIds = skillCats.filter(c => c.id.startsWith('ecc-')).map(c => c.id);
  const eccRuleCatIds = ruleCats.filter(c => c.id.startsWith('ecc-rules-')).map(c => c.id);

  const enableSkillCats = new Set();
  const disableSkillCats = new Set();
  const enableRuleCats = new Set();
  const disableRuleCats = new Set();

  if (presetId === 'hemat-token') {
    for (const id of eccSkillCatIds) disableSkillCats.add(id);
    for (const id of eccRuleCatIds) disableRuleCats.add(id);
    enableSkillCats.add('manual-figcraft');
    enableSkillCats.add('manual-tools');
  } else if (presetId === 'frontend-ui') {
    for (const id of eccSkillCatIds) {
      if (id === 'ecc-frontend') enableSkillCats.add(id);
      else disableSkillCats.add(id);
    }
    enableSkillCats.add('manual-figcraft');
    enableSkillCats.add('manual-design');
    for (const id of eccRuleCatIds) {
      if (id === 'ecc-rules-common' || id === 'ecc-rules-typescript') enableRuleCats.add(id);
      else disableRuleCats.add(id);
    }
  } else if (presetId === 'fullstack-ecc') {
    for (const id of eccSkillCatIds) {
      if (id !== 'ecc-other') enableSkillCats.add(id);
    }
    for (const id of eccRuleCatIds) {
      if (id === 'ecc-rules-common') enableRuleCats.add(id);
      else disableRuleCats.add(id);
    }
  } else {
    throw new Error(`Preset "${presetId}" tidak dikenal.`);
  }

  for (const cat of skillCats) {
    if (!cat.toggleable) continue;
    const targetState = enableSkillCats.has(cat.id) ? true : (disableSkillCats.has(cat.id) ? false : null);
    if (targetState === null) continue;
    for (const item of cat.items) {
      if (!item.toggleable || item.enabled === targetState) continue;
      applySingleSkillToggle(item, targetState);
    }
  }
  syncEccDiscovery();

  for (const cat of ruleCats) {
    if (!cat.toggleable) continue;
    const targetState = enableRuleCats.has(cat.id) ? true : (disableRuleCats.has(cat.id) ? false : null);
    if (targetState === null) continue;
    for (const item of cat.items) {
      if (!item.toggleable || item.enabled === targetState) continue;
      applySingleRuleToggle(item, targetState);
    }
  }

  return getState();
}
