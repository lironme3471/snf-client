export type ChannelType =
  | "PHONE_CALL"
  | "PHONE_CALL_IVR"
  | "WORKITEM"
  | "EMAIL"
  | "CHAT"
  | "SMS"
  | "FACEBOOK"
  | "WHATSAPP"
  | "TELEGRAM"
  | "APPLE_BUSINESS"
  | "LINE"
  | "VIBER"
  | "GOOGLE_BUSINESS"
  | "SLACK"
  | "MICROSOFT_TEAMS";

export type Direction = "INBOUND" | "OUTBOUND" | "INTERNAL";
export type ParticipantType = "AGENT_USER" | "CUSTOMER" | "PARTICIPANT";
export type MediaType = "TEXT" | "AUDIO" | "SCREEN" | "ATTACHMENT";
export type JobStatus = "RUNNING" | "SUCCEEDED" | "PARTIALLY_SUCCEEDED" | "FAILED";
export type CreateJobStatus = "RUNNING" | "FAILED";
export type InteractionStatus =
  | "PROCESSING"
  | "WAITING_FOR_MEDIA_UPLOAD"
  | "SUCCEEDED"
  | "FAILED";

export interface ExternalIdentifier {
  systemName: string;
  identifierType: string;
  value: string;
  systemId?: string;
}

export interface ParticipantMediaReference {
  mediaId?: string;
  streamId?: number;
}

export interface Participant {
  participantType: ParticipantType;
  participantFrom?: string;
  participantTo?: string;
  participantIdentifier: string;
  isLeadingAgentUser?: boolean;
  externalIdentifier?: ExternalIdentifier;
  participantMediaReferences: ParticipantMediaReference[];
}

export interface Checksum {
  algorithm: string;
  value: string;
}

export interface Media {
  mediaId: string;
  mediaType: MediaType;
  fileName?: string;
  fileType?: string;
  checksum?: Checksum;
  content?: string;
  startTime: string;
  endTime: string;
  mediaLocation?: string;
}

export interface BusinessData {
  key: string;
  value: string;
}

export interface InputInteraction {
  externalInteractionId: string;
  channelType: ChannelType;
  direction: Direction;
  startTime: string;
  endTime: string;
  wrapUpTime?: string;
  externalContactId: string;
  externalContactStartTime: string;
  hasMultipleInteractions?: boolean;
  isFirstInteraction?: boolean;
  subject?: string;
  participants: Participant[];
  media: Media[];
  businessData?: BusinessData[];
}

export interface InteractionsIngestionManifest {
  schemaVersion: "1.0";
  uploadUrlValidityMinutes?: number;
  interactions: InputInteraction[];
}

export interface InteractionCounters {
  total: number;
  succeeded: number;
  failed: number;
  inProgress: number;
}

export interface MediaUploadUrl {
  systemName?: string;
  interactionId?: string;
  mediaId?: string;
  mediaType?: MediaType;
  uploadUrl: string;
  httpMethod: "PUT";
  headers?: Record<string, string>;
  uploadUrlExpiresAt?: string;
  maxSizeBytes?: number;
}

export interface CreateJobResponse {
  tenantId: string;
  traceId?: string;
  jobId: string;
  status: CreateJobStatus;
  creationTime: string;
  completionTime: null;
  uploadUrlValidityMinutes?: number;
  mediaUploadUrls?: MediaUploadUrl[];
  interactionCounters: InteractionCounters;
}

export interface Job {
  tenantId: string;
  jobId: string;
  status: JobStatus;
  creationTime: string;
  completionTime: string | null;
  interactionCounters: InteractionCounters;
}

export interface InteractionStatusView {
  systemName: string;
  interactionId: string;
  status: InteractionStatus;
  finalizedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  mediaExpectedCount?: number;
  mediaUploadedCount?: number;
  scanResults?: string;
}

export interface JobInteractionsPage {
  tenantId: string;
  jobId: string;
  interactions: InteractionStatusView[];
}

export interface ApiError {
  error_code?: string;
  errorCode?: string;
  statusCode?: number;
  message: string;
  timestamp?: string;
  jobId?: string;
}
