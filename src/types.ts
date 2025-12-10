export enum SystemType {
  JIRA = 'Jira',
  GITHUB = 'GitHub',
  DOCS = 'Google Docs',
  SLACK = 'Slack',
  GMAIL = 'Gmail',
  ANALYSIS = 'Analysis',
  DEVICE_MESH = 'Device Mesh',
  CALENDAR = 'Google Calendar',
  FIGMA = 'Figma',
  SENTRY = 'Sentry',
  CONFLUENCE = 'Confluence',
  DATABASE = 'Database',
  YOUTUBE = 'YouTube'
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
  targetDevice: 'desktop' | 'mobile' | 'all' | string;
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
  toolLogs?: string[];
  deviceAction?: DeviceAction;
  
  // New Feature Fields
  calendarEvent?: {
    title: string;
    startTime: string;
    attendees: string[];
    meetLink: string;
  };
  sentryAnalysis?: {
    errorType: string;
    fileLocation: string;
    stackTraceSnippet: string;
    rootCause: string;
  };
  figmaComparison?: {
    driftScore: number; // 0-100
    designUrl: string;
    critique: string;
  };
  ragContext?: {
    sourceTitle: string;
    snippet: string;
    url: string;
  }[];
  sqlQuery?: {
    query: string;
    explanation: string;
    isSafe: boolean;
  };
  confluencePage?: {
    spaceKey: string;
    title: string;
    content: string;
    url?: string;
  };
  youtubeResults?: {
    query: string;
    videos: Array<{
      id: string;
      title: string;
      thumbnail: string;
      channel: string;
    }>;
  };
}

export interface AgentResponse {
  transcription?: string; 
  governance: GovernanceCheck;
  orchestrationPlan: OrchestrationStep[];
  executionResults: ExecutionResults;
}

export interface SimulationState {
  status: 'idle' | 'uploading' | 'analyzing' | 'executing_tools' | 'complete' | 'error';
  errorMessage?: string;
  imagePreview?: string;
  videoPreview?: string;
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
  
  // New Integration Configs
  sentryDsn?: string;
  figmaToken?: string;
  confluenceDomain?: string;
  confluenceEmail?: string;
  confluenceToken?: string;
  calendarId?: string;
  dbConnectionString?: string;
  youtubeApiKey?: string;
}