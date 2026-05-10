import assert from 'assert';
import { WORKFLOW_TEMPLATES } from '../templates/catalog';

const STARTER_TEMPLATES = WORKFLOW_TEMPLATES.filter((template) => template.builtIn);

describe('starter templates', () => {
  it('ships 15 reusable workflow/activity templates', () => {
    assert.strictEqual(STARTER_TEMPLATES.length, 15);
  });

  it('uses unique stable ids and workflow names', () => {
    const ids = new Set(STARTER_TEMPLATES.map((template) => template.id));
    const workflowNames = new Set(STARTER_TEMPLATES.map((template) => template.workflowName));

    assert.strictEqual(ids.size, STARTER_TEMPLATES.length);
    assert.strictEqual(workflowNames.size, STARTER_TEMPLATES.length);
  });

  it('documents at least one backing activity for every template', () => {
    for (const template of STARTER_TEMPLATES) {
      assert.ok(template.activities.length > 0, `${template.id} has no activities`);
    }
  });

  it('maps every public template to an executable workflow function', () => {
    for (const template of WORKFLOW_TEMPLATES) {
      assert.strictEqual(typeof template.workflowType, 'function', `${template.id} is not registered`);
    }
  });
});
