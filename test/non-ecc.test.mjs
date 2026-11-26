import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-cc-nonecc-'));
process.env.AGY_CC_HOME = tmpHome;

const mgr = await import('../lib/manager.mjs?nonEcc=1');

describe('Non-ECC adaptive presets', () => {
  before(() => {
    fs.mkdirSync(path.join(mgr.GEMINI_SKILLS, 'my-custom-skill'), { recursive: true });
    fs.writeFileSync(
      path.join(mgr.GEMINI_SKILLS, 'my-custom-skill', 'SKILL.md'),
      '---\nname: my-custom-skill\ndescription: Standalone custom skill.\n---\n',
      'utf-8'
    );
    fs.mkdirSync(mgr.GEMINI_RULES, { recursive: true });
    fs.writeFileSync(path.join(mgr.GEMINI_RULES, 'coding.md'), '# Global rule\n', 'utf-8');
  });

  after(() => {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it('hides ECC presets and toggles manual skills/rules cleanly without ECC', () => {
    const state = mgr.getState();
    assert.equal(state.summary.hasEcc, false);
    assert.deepEqual(state.presets.map(p => p.id), ['minimal', 'enable-all-manual']);
    assert.equal(state.summary.activeSkillsCount, 1);
    assert.equal(state.summary.activeRulesCount, 1);

    const minState = mgr.applyPreset('minimal');
    assert.equal(minState.summary.activeSkillsCount, 0);
    assert.equal(minState.summary.activeRulesCount, 0);
    assert.equal(fs.existsSync(mgr.ECC_STATE), false);

    const allState = mgr.applyPreset('enable-all-manual');
    assert.equal(allState.summary.activeSkillsCount, 1);
    assert.equal(allState.summary.activeRulesCount, 1);
  });
});
