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
  autoSyncLogs?: boolean; // when true and user signed in, logs sync to Firestore
  customAppName?: string; // Name of the custom app/tool
  customAppApiKey?: string; // API key for the custom app
}

// Ecosystem: File Transfer
export interface FileTransfer {
  id: string;
  fileName: string;
  fileSize: number;
  base64Data: string;
  fromDevice: string;
  toDevice: string;
  timestamp: number;
}

// Ecosystem: Notifications from Mobile
export interface NotificationItem {
  id: string;
  type: 'sms' | 'app';
  sender: string;
  title: string;
  body: string;
  timestamp: number;
  fromDevice: string;
  icon?: string;
}

// Ecosystem: Media Control
export interface MediaState {
  isPlaying: boolean;
  track?: string;
  artist?: string;
  device: string;
}

// Reminders: Task scheduling with Gemini execution (extended below)

// Recurrence structure for reminders
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'interval';

export interface RecurrenceSpec {
  type: RecurrenceType;
  // For 'interval' this is number of days between reminders (e.g., 3 => every 3 days)
  intervalDays?: number;
  // For 'weekly' this is array of weekdays [0..6] where 0 = Sunday
  weekdays?: number[];
}

// Extend Reminder with optional recurrence and snooze
export interface Reminder {
  id: string;
  title: string;
  description: string;
  executeTime: number; // Unix timestamp
  status: 'pending' | 'executed' | 'failed' | 'cancelled';
  taskPrompt: string; // Instructions for Gemini to execute
  createdAt: number;
  executedAt?: number;
  result?: string; // Execution result from Gemini
  errorMessage?: string;
  recurrence?: RecurrenceSpec; // optional recurrence rule
  // If snoozed, executeTime will reflect the snoozed time; keep an explicit snoozedUntil for convenience
  snoozedUntil?: number;
  // Optional attachments and recorded audio
  attachments?: Attachment[];
  audio?: ReminderAudio;
}

// Attachment and audio types for reminders
export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  url?: string; // storage URL after upload
}

export interface ReminderAudio {
  id: string;
  url?: string;
  mimeType?: string;
  durationMs?: number;
}

export interface ReminderState {
  reminders: Reminder[];
  isLoading: boolean;
  error?: string;
}