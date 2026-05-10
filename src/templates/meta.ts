// Shared template metadata types. Each src/templates/<name>/index.ts exports
// a `template` object that conforms to WorkflowTemplate; src/templates/catalog.ts
// imports them all into a single registry.

export type TemplateCategory = 'cluster' | 'wallet' | 'transaction' | 'account' | 'program' | 'token' | 'custom';

export interface TemplateMetadata {
  id: string;
  title: string;
  category: TemplateCategory;
  workflowName: string;
  activities: string[];
  description: string;
  defaultCron: string;
  sampleInput: Record<string, unknown>;
}

export type WorkflowType = (input: any) => Promise<unknown>;

export interface WorkflowTemplate extends TemplateMetadata {
  workflowType: WorkflowType;
  builtIn: boolean;
}
