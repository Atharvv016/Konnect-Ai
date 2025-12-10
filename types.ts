export enum SystemType {
  JIRA = 'Jira',
  GITHUB = 'GitHub',
  DOCS = 'Google Docs',
  SLACK = 'Slack',
  GMAIL = 'Gmail',
  ANALYSIS = 'Analysis',
  DEVICE_MESH = 'Device Mesh'
}

export interface OrchestrationStep {
  stepNumber: number;
  system: SystemType;
  action: string;
  dataFlow: string;
  status: 'pending' | 'processing' | 'complete';
}

export interface DeviceAction {
  shouldExecute: boolean;
  targetDevice: 'desktop' | 'mobile' | 'all';
  actionType: 'open_url' | 'copy_to_clipboard';
  payload: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceType: 'desktop' | 'mobile' | 'web';
  joinedAt: number;
  isCurrent?: boolean;
}

export interface GovernanceCheck {
  policyStatus: 'passed' | 'failed' | 'modified';
  critique: string;
  xaiTrace: string;
}

export interface ExecutionResults {
  detectedComponent: string;
  bugPriority: string;
  bugSummary: string;
  commitHash: string;
  developerName: string;
  docEntryId: string;
  docContent: string;
  slackChannel: string;
  slackMessage: string;
  gmailRecipient?: string;
  gmailSubject?: string;
  gmailBody?: string;
  toolLogs?: string[]; // New field for real execution logs
  deviceAction?: DeviceAction; // New field for Cross-Device Handoff
}

export interface AgentResponse {
  governance: GovernanceCheck;
  orchestrationPlan: OrchestrationStep[];
  executionResults: ExecutionResults;
}

export interface SimulationState {
  status: 'idle' | 'uploading' | 'analyzing' | 'executing_tools' | 'complete' | 'error';
  errorMessage?: string;
  imagePreview?: string;
  response?: AgentResponse;
}

export interface ApiConfig {
  githubOwner: string;
  githubRepo: string;
  githubToken: string;
  slackWebhook: string;
  jiraDomain: string;
  jiraEmail: string;
  jiraToken: string;
  jiraProjectKey: string;
  gmailAddress: string;
}