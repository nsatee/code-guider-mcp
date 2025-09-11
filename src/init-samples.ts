import { getSampleTemplates } from './sample-templates';
import { getSampleWorkflows } from './sample-workflows';
import type { StorageInterface } from './storage-interface';

export class SampleInitializer {
  private storage: StorageInterface;

  constructor(storage: StorageInterface) {
    this.storage = storage;
  }

  /**
   * Initialize sample workflows and templates
   */
  async initializeSamples(): Promise<{
    workflows: number;
    templates: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let workflowCount = 0;
    let templateCount = 0;

    // Initialize sample workflows
    try {
      for (const workflow of getSampleWorkflows()) {
        try {
          await this.storage.saveWorkflow(workflow);
          workflowCount++;
        } catch (error) {
          errors.push(`Failed to save workflow ${workflow.id}: ${error}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to initialize workflows: ${error}`);
    }

    // Initialize sample templates
    try {
      for (const template of getSampleTemplates()) {
        try {
          await this.storage.saveTemplate(template);
          templateCount++;
        } catch (error) {
          errors.push(`Failed to save template ${template.id}: ${error}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to initialize templates: ${error}`);
    }

    return {
      workflows: workflowCount,
      templates: templateCount,
      errors,
    };
  }

  /**
   * Check if samples are already initialized
   */
  async areSamplesInitialized(): Promise<boolean> {
    try {
      const workflows = await this.storage.listWorkflows();
      const templates = await this.storage.listTemplates();

      // Check if we have at least some sample workflows and templates
      return workflows.length >= 3 && templates.length >= 3;
    } catch {
      return false;
    }
  }

  /**
   * Get initialization status
   */
  async getStatus(): Promise<{
    initialized: boolean;
    workflowCount: number;
    templateCount: number;
    sampleWorkflows: string[];
    sampleTemplates: string[];
  }> {
    try {
      const workflows = await this.storage.listWorkflows();
      const templates = await this.storage.listTemplates();

      const sampleWorkflows = workflows
        .filter((w) => w.tags.some((tag) => ['ui', 'component', 'api', 'testing'].includes(tag)))
        .map((w) => w.name);

      const sampleTemplates = templates
        .filter((t) =>
          t.tags.some((tag) => ['react', 'express', 'jest', 'component'].includes(tag))
        )
        .map((t) => t.name);

      return {
        initialized: workflows.length >= 3 && templates.length >= 3,
        workflowCount: workflows.length,
        templateCount: templates.length,
        sampleWorkflows,
        sampleTemplates,
      };
    } catch {
      return {
        initialized: false,
        workflowCount: 0,
        templateCount: 0,
        sampleWorkflows: [],
        sampleTemplates: [],
      };
    }
  }
}
