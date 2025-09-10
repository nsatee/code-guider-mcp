import { HybridStorage } from '../hybrid-storage.js';
import type { CodeTemplate, QualityRule, Workflow } from '../types.js';

describe('HybridStorage', () => {
  let storage: HybridStorage;

  beforeEach(() => {
    storage = new HybridStorage('.test-guidance.db');
  });

  afterEach(async () => {
    // Clean up test database
    await storage.close();
  });

  describe('Workflow operations', () => {
    it('should save and retrieve a workflow', async () => {
      const workflow: Workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'A test workflow',
        steps: [],
        qualityChecks: [],
        tags: ['test'],
        templates: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      await storage.saveWorkflow(workflow);
      const retrieved = await storage.getWorkflow('test-workflow');

      expect(retrieved).toEqual(
        expect.objectContaining({
          id: 'test-workflow',
          name: 'Test Workflow',
          description: 'A test workflow',
          steps: [],
          qualityChecks: [],
          tags: ['test'],
          templates: {},
        }),
      );
      expect(retrieved?.createdAt).toBeDefined();
      expect(retrieved?.updatedAt).toBeDefined();
    });

    it('should return null for non-existent workflow', async () => {
      const retrieved = await storage.getWorkflow('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('Template operations', () => {
    it('should save and retrieve a template', async () => {
      const template: CodeTemplate = {
        id: 'test-template',
        name: 'Test Template',
        type: 'component',
        content: 'test content',
        variables: ['var1'],
        description: 'A test template',
        tags: ['test'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      await storage.saveTemplate(template);
      const retrieved = await storage.getTemplate('test-template');

      expect(retrieved).toEqual(
        expect.objectContaining({
          id: 'test-template',
          name: 'Test Template',
          type: 'component',
          content: 'test content',
          variables: ['var1'],
          description: 'A test template',
          tags: ['test'],
        }),
      );
      expect(retrieved?.createdAt).toBeDefined();
      expect(retrieved?.updatedAt).toBeDefined();
    });
  });

  describe('Quality rule operations', () => {
    it('should save and retrieve a quality rule', async () => {
      const rule: QualityRule = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'A test rule',
        type: 'lint',
        severity: 'error',
        pattern: 'test-pattern',
        check: 'test check',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      await storage.saveQualityRule(rule);
      const retrieved = await storage.getQualityRule('test-rule');

      expect(retrieved).toEqual(
        expect.objectContaining({
          id: 'test-rule',
          name: 'Test Rule',
          description: 'A test rule',
          type: 'lint',
          severity: 'error',
          pattern: 'test-pattern',
          check: 'test check',
        }),
      );
      expect(retrieved?.createdAt).toBeDefined();
      expect(retrieved?.updatedAt).toBeDefined();
    });
  });
});
