import {
  App,
  applyDocumentTheme,
  applyHostStyleVariables,
} from '@modelcontextprotocol/ext-apps';

if (!('switch' in HTMLInputElement.prototype)) {
  document.documentElement.classList.add('no-native-switch');
}

const isMcpApp = window.parent !== window;
let mcpApp = null;
let currentState = null;
let isBusy = false;

const collapsedCategories = new Set();
const filters = {
  skillQuery: '',
  skillStatus: 'all',
  ruleQuery: '',
  ruleStatus: 'all',
};

const els = {
  themeControl: document.getElementById('theme-control'),
  themeSelect: document.getElementById('theme-select'),
  refreshBtn: document.getElementById('refresh-btn'),
  skillBudgetText: document.getElementById('skill-budget-text'),
  skillBudgetFill: document.getElementById('skill-budget-fill'),
  progressTrack: document.querySelector('.progress-track'),
  metricSkills: document.getElementById('metric-skills'),
  metricRules: document.getElementById('metric-rules'),
  metricMcp: document.getElementById('metric-mcp'),
  statusBanner: document.getElementById('status-banner'),
  tablist: document.getElementById('main-tablist'),
  stateLoading: document.getElementById('state-loading'),
  stateError: document.getElementById('state-error'),
  errorMessage: document.getElementById('error-message'),
  errorRetryBtn: document.getElementById('error-retry-btn'),
  panelsContainer: document.getElementById('panels-container'),
  skillSearch: document.getElementById('skill-search'),
  skillStatusFilter: document.getElementById('skill-status-filter'),
  skillsExpandAll: document.getElementById('skills-expand-all'),
  skillsCollapseAll: document.getElementById('skills-collapse-all'),
  skillsList: document.getElementById('skills-list'),
  ruleSearch: document.getElementById('rule-search'),
  ruleStatusFilter: document.getElementById('rule-status-filter'),
  rulesExpandAll: document.getElementById('rules-expand-all'),
  rulesCollapseAll: document.getElementById('rules-collapse-all'),
  rulesBudgetText: document.getElementById('rules-budget-text'),
  rulesBytesText: document.getElementById('rules-bytes-text'),
  rulesList: document.getElementById('rules-list'),
  mcpList: document.getElementById('mcp-list'),
  presetsList: document.getElementById('presets-list'),
};

function initThemeControl() {
  if (isMcpApp) {
    els.themeControl.hidden = true;
    return;
  }

  let saved = 'system';
  try {
    const raw = localStorage.getItem('agy-cc-color-scheme');
    if (raw === 'light' || raw === 'dark') saved = raw;
  } catch {}
  els.themeSelect.value = saved;

  const applySelected = (val) => {
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (val === 'light' || val === 'dark') {
      meta.content = val;
      try { localStorage.setItem('agy-cc-color-scheme', val); } catch {}
    } else {
      meta.content = 'light dark';
      try { localStorage.removeItem('agy-cc-color-scheme'); } catch {}
    }
  };

  els.themeSelect.addEventListener('change', (e) => {
    applySelected(e.target.value);
  });

  window.addEventListener('storage', (e) => {
    if (e.key === 'agy-cc-color-scheme') {
      const next = e.newValue === 'light' || e.newValue === 'dark' ? e.newValue : 'system';
      els.themeSelect.value = next;
      applySelected(next);
    }
  });
}

function showBanner(message, isError = false) {
  if (!message) {
    els.statusBanner.hidden = true;
    els.statusBanner.textContent = '';
    els.statusBanner.classList.remove('is-error');
    return;
  }
  els.statusBanner.textContent = message;
  els.statusBanner.classList.toggle('is-error', isError);
  els.statusBanner.hidden = false;
}

function setLoadingView(loading) {
  els.stateLoading.hidden = !loading;
  if (loading) {
    els.stateError.hidden = true;
    els.panelsContainer.hidden = true;
  }
}

function setErrorView(message) {
  els.stateLoading.hidden = true;
  els.panelsContainer.hidden = true;
  els.errorMessage.textContent = message || 'Terjadi kesalahan saat berkomunikasi dengan server.';
  els.stateError.hidden = false;
}

function showPanelsView() {
  els.stateLoading.hidden = true;
  els.stateError.hidden = true;
  els.panelsContainer.hidden = false;
}

async function callBackend(toolName, apiPath, method, payload) {
  if (isMcpApp && mcpApp) {
    const res = await mcpApp.callServerTool({
      name: toolName,
      arguments: payload || {},
    });
    if (res.isError) {
      const text = res.content?.[0]?.text || 'Operasi gagal pada MCP server.';
      throw new Error(text);
    }
    if (res.structuredContent) {
      return res.structuredContent;
    }
    throw new Error('Server tidak mengembalikan data state.');
  }

  const res = await fetch(apiPath, {
    method,
    headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
    body: method === 'POST' ? JSON.stringify(payload || {}) : undefined,
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

async function runMutation(toolName, apiPath, payload, successMessage) {
  if (isBusy) return;
  isBusy = true;
  els.refreshBtn.disabled = true;
  try {
    const nextState = await callBackend(toolName, apiPath, 'POST', payload);
    currentState = nextState;
    renderAll();
    showBanner(successMessage, false);
  } catch (err) {
    showBanner(err.message || 'Gagal menyimpan perubahan.', true);
    renderAll();
  } finally {
    isBusy = false;
    els.refreshBtn.disabled = false;
  }
}

async function loadState() {
  setLoadingView(true);
  showBanner('');
  try {
    const state = await callBackend('cc_get_state', '/api/state', 'GET');
    currentState = state;
    renderAll();
    showPanelsView();
  } catch (err) {
    setErrorView(err.message);
  }
}

function initTabs() {
  const tabs = Array.from(els.tablist.querySelectorAll('[role="tab"]'));
  const panels = Array.from(els.panelsContainer.querySelectorAll('[role="tabpanel"]'));

  const selectTab = (tab, moveFocus = false) => {
    const targetPanelId = tab.dataset.panel;
    for (const t of tabs) {
      const selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
    }
    for (const p of panels) {
      const active = p.id === targetPanelId;
      if (active) {
        p.removeAttribute('hidden');
        p.tabIndex = 0;
      } else {
        p.setAttribute('hidden', 'until-found');
        p.removeAttribute('tabindex');
      }
    }
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (moveFocus) tab.focus();
  };

  for (const tab of tabs) {
    tab.addEventListener('click', () => selectTab(tab, false));
  }

  els.tablist.addEventListener('keydown', (e) => {
    const idx = tabs.indexOf(document.activeElement);
    if (idx === -1) return;
    let nextIdx = -1;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = tabs.length - 1;
    if (nextIdx !== -1) {
      e.preventDefault();
      selectTab(tabs[nextIdx], true);
    }
  });

  for (const panel of panels) {
    panel.addEventListener('beforematch', () => {
      const tab = tabs.find(t => t.dataset.panel === panel.id);
      if (tab) selectTab(tab, false);
    });
  }
}

function formatNum(n) {
  return Number(n || 0).toLocaleString('id-ID');
}

function renderSummary() {
  if (!currentState) return;
  const s = currentState.summary;
  const pct = Math.min(100, (s.activeSkillTokens / s.skillBudgetLimit) * 100);
  els.skillBudgetText.textContent = `${formatNum(s.activeSkillTokens)} / ${formatNum(s.skillBudgetLimit)} token (${pct.toFixed(1)}%)`;
  els.skillBudgetFill.style.width = `${pct.toFixed(1)}%`;
  els.skillBudgetFill.classList.toggle('is-warn', pct >= 80 && pct <= 100);
  els.skillBudgetFill.classList.toggle('is-over', s.activeSkillTokens > s.skillBudgetLimit);
  els.progressTrack.setAttribute('aria-valuenow', String(s.activeSkillTokens));

  els.metricSkills.textContent = `${s.activeSkillsCount} / ${s.totalSkillsCount}`;
  els.metricRules.textContent = `${s.activeRulesCount} / ${s.totalRulesCount}`;
  els.metricMcp.textContent = `${s.activeMcpCount} / ${s.totalMcpCount}`;

  els.rulesBudgetText.textContent = `${formatNum(s.activeRuleTokens)} / ${formatNum(s.ruleBudgetLimit)} token`;
  els.rulesBytesText.textContent = `${(s.activeRuleBytes / 1024).toFixed(1)} KB`;
}

function createSwitch(checked, disabled, ariaLabel, onChange) {
  const label = document.createElement('label');
  label.className = 'switch-label';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.setAttribute('role', 'switch');
  input.checked = Boolean(checked);
  input.setAttribute('aria-checked', String(Boolean(checked)));
  input.setAttribute('aria-label', ariaLabel);
  input.disabled = Boolean(disabled) || isBusy;
  input.addEventListener('change', () => {
    input.setAttribute('aria-checked', String(input.checked));
    onChange(input.checked);
  });
  label.appendChild(input);
  return label;
}

function renderCategorizedSection(container, categories, query, statusFilter, type) {
  container.replaceChildren();
  const q = query.trim().toLowerCase();

  let renderedCount = 0;
  for (const cat of categories) {
    const filteredItems = cat.items.filter(item => {
      if (statusFilter === 'active' && !item.enabled) return false;
      if (statusFilter === 'disabled' && item.enabled) return false;
      if (q) {
        const hay = `${item.name} ${item.description} ${cat.label} ${item.sourceLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (filteredItems.length === 0) continue;
    renderedCount++;

    const card = document.createElement('article');
    card.className = 'category-card';
    const collapseKey = `${type}:${cat.id}`;
    const isCollapsed = collapsedCategories.has(collapseKey);
    if (isCollapsed) card.classList.add('is-collapsed');

    const header = document.createElement('div');
    header.className = 'category-header';

    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.className = 'category-toggle-btn';
    collapseBtn.setAttribute('aria-expanded', String(!isCollapsed));
    const chevron = document.createElement('span');
    chevron.className = 'chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.textContent = isCollapsed ? '+' : '-';
    const catTitle = document.createElement('span');
    catTitle.textContent = cat.label;
    collapseBtn.append(chevron, catTitle);
    collapseBtn.addEventListener('click', () => {
      if (collapsedCategories.has(collapseKey)) {
        collapsedCategories.delete(collapseKey);
      } else {
        collapsedCategories.add(collapseKey);
      }
      renderCategorizedSection(container, categories, query, statusFilter, type);
    });

    const meta = document.createElement('div');
    meta.className = 'category-meta';
    const stats = document.createElement('span');
    stats.className = 'category-stats';
    stats.textContent = `${cat.activeCount}/${cat.totalCount} aktif (${formatNum(cat.activeTokens)} tok)`;
    meta.appendChild(stats);

    if (cat.toggleable) {
      const allActive = cat.activeCount === cat.totalCount;
      const catSwitch = createSwitch(
        allActive,
        false,
        `Aktifkan atau matikan semua item di kategori ${cat.label}`,
        (checked) => {
          if (type === 'skill') {
            runMutation(
              'cc_skill_cat',
              '/api/skill/category',
              { categoryId: cat.id, enabled: checked },
              `Kategori "${cat.label}" ${checked ? 'diaktifkan' : 'dinonaktifkan'}.`
            );
          } else {
            runMutation(
              'cc_rule_cat',
              '/api/rule/category',
              { categoryId: cat.id, enabled: checked },
              `Kategori "${cat.label}" ${checked ? 'diaktifkan' : 'dinonaktifkan'}.`
            );
          }
        }
      );
      meta.appendChild(catSwitch);
    } else {
      const note = document.createElement('span');
      note.className = 'readonly-note';
      note.textContent = 'Via halaman Plugin';
      meta.appendChild(note);
    }

    header.append(collapseBtn, meta);
    card.appendChild(header);

    const itemsWrap = document.createElement('div');
    itemsWrap.className = 'category-items';

    for (const item of filteredItems) {
      const row = document.createElement('div');
      row.className = 'item-row';

      const info = document.createElement('div');
      info.className = 'item-info';

      const titleRow = document.createElement('div');
      titleRow.className = 'item-title-row';

      const nameEl = document.createElement('span');
      nameEl.className = 'item-name';
      nameEl.textContent = item.name;

      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = item.sourceLabel;

      titleRow.append(nameEl, tag);

      const descEl = document.createElement('p');
      descEl.className = 'item-desc';
      descEl.textContent = item.description;

      info.append(titleRow, descEl);

      const actions = document.createElement('div');
      actions.className = 'item-actions';

      const tok = document.createElement('span');
      tok.className = 'item-tokens';
      tok.textContent = `${formatNum(item.tokens)} tok`;
      actions.appendChild(tok);

      if (item.toggleable) {
        const sw = createSwitch(
          item.enabled,
          false,
          `${item.enabled ? 'Matikan' : 'Aktifkan'} ${item.name}`,
          (checked) => {
            if (type === 'skill') {
              runMutation(
                'cc_toggle_skill',
                '/api/skill/toggle',
                { id: item.id, enabled: checked },
                `Skill "${item.name}" ${checked ? 'diaktifkan' : 'dinonaktifkan'}.`
              );
            } else {
              runMutation(
                'cc_toggle_rule',
                '/api/rule/toggle',
                { id: item.id, enabled: checked },
                `Rule "${item.name}" ${checked ? 'diaktifkan' : 'dinonaktifkan'}.`
              );
            }
          }
        );
        actions.appendChild(sw);
      } else {
        const ro = document.createElement('span');
        ro.className = 'readonly-note';
        ro.textContent = item.enabled ? 'Aktif (Plugin)' : 'Nonaktif (Plugin)';
        actions.appendChild(ro);
      }

      row.append(info, actions);
      itemsWrap.appendChild(row);
    }

    card.appendChild(itemsWrap);
    container.appendChild(card);
  }

  if (renderedCount === 0) {
    const empty = document.createElement('div');
    empty.className = 'state-box';
    const title = document.createElement('p');
    title.className = 'state-title';
    title.textContent = 'Tidak ada item yang cocok dengan filter.';
    const desc = document.createElement('p');
    desc.className = 'state-desc';
    desc.textContent = 'Ubah kata kunci pencarian atau setel ulang filter status.';
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn-secondary';
    resetBtn.textContent = 'Reset Filter';
    resetBtn.addEventListener('click', () => {
      if (type === 'skill') {
        filters.skillQuery = '';
        filters.skillStatus = 'all';
        els.skillSearch.value = '';
        els.skillStatusFilter.value = 'all';
      } else {
        filters.ruleQuery = '';
        filters.ruleStatus = 'all';
        els.ruleSearch.value = '';
        els.ruleStatusFilter.value = 'all';
      }
      renderAll();
    });
    empty.append(title, desc, resetBtn);
    container.appendChild(empty);
  }
}

function renderMcpList() {
  els.mcpList.replaceChildren();
  const items = currentState?.mcpServers || [];
  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'state-box';
    const p = document.createElement('p');
    p.className = 'state-title';
    p.textContent = 'Belum ada MCP server terkonfigurasi.';
    empty.appendChild(p);
    els.mcpList.appendChild(empty);
    return;
  }

  for (const srv of items) {
    const row = document.createElement('div');
    row.className = 'item-row';

    const info = document.createElement('div');
    info.className = 'item-info';

    const titleRow = document.createElement('div');
    titleRow.className = 'item-title-row';
    const nameEl = document.createElement('span');
    nameEl.className = 'item-name';
    nameEl.textContent = srv.name;
    const srcTag = document.createElement('span');
    srcTag.className = 'tag';
    srcTag.textContent = srv.sourceLabel;
    const trTag = document.createElement('span');
    trTag.className = 'tag';
    trTag.textContent = srv.transport;
    titleRow.append(nameEl, srcTag, trTag);

    const cmd = document.createElement('pre');
    cmd.className = 'item-code';
    cmd.textContent = srv.commandPreview;

    info.append(titleRow, cmd);

    const envEntries = Object.entries(srv.env || {});
    if (envEntries.length > 0) {
      const envDesc = document.createElement('p');
      envDesc.className = 'item-desc';
      envDesc.textContent = 'Env: ' + envEntries.map(([k, v]) => `${k}=${v}`).join(', ');
      info.appendChild(envDesc);
    }

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    if (srv.toggleable) {
      const sw = createSwitch(
        srv.enabled,
        false,
        `${srv.enabled ? 'Matikan' : 'Aktifkan'} MCP server ${srv.name}`,
        (checked) => {
          runMutation(
            'cc_toggle_mcp',
            '/api/mcp/toggle',
            { name: srv.name, enabled: checked },
            `MCP "${srv.name}" ${checked ? 'diaktifkan' : 'dinonaktifkan'}. Refresh MCP Servers di Antigravity agar perubahan diterapkan.`
          );
        }
      );
      actions.appendChild(sw);
    } else {
      const ro = document.createElement('span');
      ro.className = 'readonly-note';
      ro.textContent = srv.enabled ? 'Aktif (Plugin)' : 'Nonaktif (Plugin)';
      actions.appendChild(ro);
    }

    row.append(info, actions);
    els.mcpList.appendChild(row);
  }
}

function renderPresets() {
  els.presetsList.replaceChildren();
  const presets = currentState?.presets || [];
  for (const preset of presets) {
    const card = document.createElement('article');
    card.className = 'preset-card';

    const top = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = preset.name;
    const summary = document.createElement('p');
    summary.className = 'preset-summary';
    summary.textContent = preset.summary;
    const desc = document.createElement('p');
    desc.className = 'preset-desc';
    desc.textContent = preset.description;
    top.append(title, summary, desc);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary';
    btn.disabled = isBusy;
    btn.textContent = 'Terapkan Preset';
    btn.addEventListener('click', () => {
      runMutation(
        'cc_apply_preset',
        '/api/preset/apply',
        { presetId: preset.id },
        `Preset "${preset.name}" berhasil diterapkan.`
      );
    });

    card.append(top, btn);
    els.presetsList.appendChild(card);
  }
}

function renderAll() {
  if (!currentState) return;
  renderSummary();
  renderCategorizedSection(
    els.skillsList,
    currentState.skillCategories || [],
    filters.skillQuery,
    filters.skillStatus,
    'skill'
  );
  renderCategorizedSection(
    els.rulesList,
    currentState.ruleCategories || [],
    filters.ruleQuery,
    filters.ruleStatus,
    'rule'
  );
  renderMcpList();
  renderPresets();
}

function bindControls() {
  els.refreshBtn.addEventListener('click', loadState);
  els.errorRetryBtn.addEventListener('click', loadState);

  els.skillSearch.addEventListener('input', (e) => {
    filters.skillQuery = e.target.value;
    renderAll();
  });
  els.skillStatusFilter.addEventListener('change', (e) => {
    filters.skillStatus = e.target.value;
    renderAll();
  });
  els.skillsExpandAll.addEventListener('click', () => {
    for (const cat of currentState?.skillCategories || []) {
      collapsedCategories.delete(`skill:${cat.id}`);
    }
    renderAll();
  });
  els.skillsCollapseAll.addEventListener('click', () => {
    for (const cat of currentState?.skillCategories || []) {
      collapsedCategories.add(`skill:${cat.id}`);
    }
    renderAll();
  });

  els.ruleSearch.addEventListener('input', (e) => {
    filters.ruleQuery = e.target.value;
    renderAll();
  });
  els.ruleStatusFilter.addEventListener('change', (e) => {
    filters.ruleStatus = e.target.value;
    renderAll();
  });
  els.rulesExpandAll.addEventListener('click', () => {
    for (const cat of currentState?.ruleCategories || []) {
      collapsedCategories.delete(`rule:${cat.id}`);
    }
    renderAll();
  });
  els.rulesCollapseAll.addEventListener('click', () => {
    for (const cat of currentState?.ruleCategories || []) {
      collapsedCategories.add(`rule:${cat.id}`);
    }
    renderAll();
  });
}

async function boot() {
  initThemeControl();
  initTabs();
  bindControls();

  if (isMcpApp) {
    try {
      mcpApp = new App({ name: 'Antigravity Control Center', version: '1.0.0' }, {});
      mcpApp.ontoolresult = (result) => {
        if (result?.structuredContent) {
          currentState = result.structuredContent;
          renderAll();
          showPanelsView();
        }
      };
      mcpApp.onhostcontextchanged = (ctx) => {
        if (ctx?.theme) applyDocumentTheme(ctx.theme);
        if (ctx?.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
      };
      await mcpApp.connect();
      const ctx = mcpApp.getHostContext();
      if (ctx?.theme) applyDocumentTheme(ctx.theme);
      if (ctx?.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
    } catch (err) {
      setErrorView(err.message);
      return;
    }
  }

  await loadState();
}

boot();
