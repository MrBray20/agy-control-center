#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';
import {
  getState,
  toggleSkill,
  toggleSkillCategory,
  toggleRule,
  toggleRuleCategory,
  toggleMcp,
  applyPreset,
} from '../lib/manager.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_HTML = path.resolve(__dirname, '..', 'dist', 'app.html');
const APP_URI = 'ui://control-center/app.html';
const APP_ONLY = { ui: { visibility: ['app'] } };

const server = new McpServer({
  name: 'agy-control-center',
  version: '1.0.0',
});

registerAppResource(
  server,
  'Control Center UI',
  APP_URI,
  {
    description: 'Antigravity Control Center interactive dashboard',
    _meta: {
      ui: {
        prefersBorder: false,
      },
    },
  },
  async () => {
    const html = fs.readFileSync(DIST_HTML, 'utf-8');
    return {
      contents: [
        {
          uri: APP_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: html,
          _meta: {
            ui: {
              prefersBorder: false,
            },
          },
        },
      ],
    };
  }
);

function stateResult(state, prefix = 'Antigravity Control Center') {
  const s = state.summary;
  return {
    content: [
      {
        type: 'text',
        text: `${prefix}: ${s.activeSkillsCount}/${s.totalSkillsCount} skills aktif (${s.activeSkillTokens}/${s.skillBudgetLimit} token), ${s.activeRulesCount}/${s.totalRulesCount} rules aktif, ${s.activeMcpCount}/${s.totalMcpCount} MCP servers aktif.`,
      },
    ],
    structuredContent: state,
  };
}

function wrapAction(fn) {
  return async (args) => {
    try {
      const state = fn(args);
      return stateResult(state);
    } catch (err) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: err instanceof Error ? err.message : String(err),
          },
        ],
      };
    }
  };
}

registerAppTool(
  server,
  'open_control_center',
  {
    title: 'Control Center',
    description: 'Open Antigravity Control Center to manage skills, rules, and MCP servers.',
    inputSchema: z.object({}),
    _meta: {
      ui: { resourceUri: APP_URI },
      'com.google.antigravity/ui': {
        entrypoints: [
          { type: 'aux_pane', title: 'Control Center' },
          { type: 'global', title: 'Control Center' },
        ],
      },
    },
  },
  wrapAction(() => getState())
);

registerAppTool(
  server,
  'cc_get_state',
  {
    title: 'Get Control Center State',
    description: 'Fetch current Antigravity skills, rules, and MCP servers state.',
    inputSchema: z.object({}),
    _meta: APP_ONLY,
  },
  wrapAction(() => getState())
);

registerAppTool(
  server,
  'cc_toggle_skill',
  {
    title: 'Toggle Skill',
    description: 'Enable or disable an Antigravity skill by ID.',
    inputSchema: z.object({
      id: z.string(),
      enabled: z.boolean(),
    }),
    _meta: APP_ONLY,
  },
  wrapAction(({ id, enabled }) => toggleSkill(id, enabled))
);

registerAppTool(
  server,
  'cc_skill_cat',
  {
    title: 'Toggle Skill Category',
    description: 'Enable or disable all toggleable skills in a category.',
    inputSchema: z.object({
      categoryId: z.string(),
      enabled: z.boolean(),
    }),
    _meta: APP_ONLY,
  },
  wrapAction(({ categoryId, enabled }) => toggleSkillCategory(categoryId, enabled))
);

registerAppTool(
  server,
  'cc_toggle_rule',
  {
    title: 'Toggle Rule',
    description: 'Enable or disable a rule file by ID.',
    inputSchema: z.object({
      id: z.string(),
      enabled: z.boolean(),
    }),
    _meta: APP_ONLY,
  },
  wrapAction(({ id, enabled }) => toggleRule(id, enabled))
);

registerAppTool(
  server,
  'cc_rule_cat',
  {
    title: 'Toggle Rule Category',
    description: 'Enable or disable all toggleable rules in a category.',
    inputSchema: z.object({
      categoryId: z.string(),
      enabled: z.boolean(),
    }),
    _meta: APP_ONLY,
  },
  wrapAction(({ categoryId, enabled }) => toggleRuleCategory(categoryId, enabled))
);

registerAppTool(
  server,
  'cc_toggle_mcp',
  {
    title: 'Toggle MCP Server',
    description: 'Enable or disable a global MCP server.',
    inputSchema: z.object({
      name: z.string(),
      enabled: z.boolean(),
    }),
    _meta: APP_ONLY,
  },
  wrapAction(({ name, enabled }) => toggleMcp(name, enabled))
);

registerAppTool(
  server,
  'cc_apply_preset',
  {
    title: 'Apply Preset',
    description: 'Apply a Control Center configuration preset.',
    inputSchema: z.object({
      presetId: z.string(),
    }),
    _meta: APP_ONLY,
  },
  wrapAction(({ presetId }) => applyPreset(presetId))
);

const transport = new StdioServerTransport();
await server.connect(transport);
