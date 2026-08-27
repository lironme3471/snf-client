import type { ManifestFormValues } from "./validation";
import {
  computeMd5Hex,
} from "./sampleMedia";

// TODO: replace with values pre-configured in your CXone environment
export const SAMPLE_AGENT_CONFIG = {
  systemName: "Generic API System",
  identifierType: "EXTERNAL_IDENTIFIER",
  identifierValue: "5525",
};

type AgentConfig = typeof SAMPLE_AGENT_CONFIG;
type MockInteraction = ManifestFormValues["interactions"][number];
type MockMedia = MockInteraction["media"][number];

const MOCK_AUDIO_DURATION_SECONDS = 120;

export type MockType = "voice" | "voiceScreen" | "chat" | "sms" | "email";

/** Interaction + a map of mediaId → Blob for auto-upload after job creation. */
export interface MockResult {
  interaction: MockInteraction;
  mediaBlobs: Map<string, Blob>;
}

export const MOCK_LABELS: Record<MockType, string> = {
  voice: "Voice only",
  voiceScreen: "Voice + Screen",
  chat: "Chat only",
  sms: "SMS",
  email: "Email",
};

function baseParticipants(cfg: AgentConfig): MockInteraction["participants"] {
  return [
    {
      participantType: "AGENT_USER",
      participantIdentifier: cfg.identifierValue,
      isLeadingAgentUser: true,
      participantTo: "+1-555-000-1234",
      externalIdentifier: {
        systemName: cfg.systemName,
        identifierType: cfg.identifierType,
        value: cfg.identifierValue,
      },
      participantMediaReferences: [],
    },
    {
      participantType: "CUSTOMER",
      participantIdentifier: "+1-555-000-5678",
      participantFrom: "+1-555-000-5678",
      participantMediaReferences: [],
    },
  ];
}

function times() {
  const now = Date.now();
  return {
    start: new Date(now - (MOCK_AUDIO_DURATION_SECONDS + 5) * 1000).toISOString(),
    end: new Date(now - 5 * 1000).toISOString(),          // ~5s ago
    wrapUp: new Date(now - 2 * 1000).toISOString(),       // ~2s ago
  };
}

async function loadScreenSample(): Promise<Blob> {
  const response = await fetch(`${import.meta.env.BASE_URL}sample-screen.mp4`);
  if (!response.ok) throw new Error("Unable to load the sample screen recording.");
  return response.blob();
}

async function loadVoiceSample(): Promise<Blob> {
  const response = await fetch(`${import.meta.env.BASE_URL}sample-conversation.wav`);
  if (!response.ok) throw new Error("Unable to load the sample voice recording.");
  return response.blob();
}

async function generatePhoneMock(
  cfg: AgentConfig,
  includeScreen: boolean
): Promise<MockResult> {
  const t = times();
  const now = Date.now();
  const wav = await loadVoiceSample();
  const audioId = `AUDIO-${now}`;
  const screenId = includeScreen ? `SCREEN-${now}` : undefined;
  const screenBlob = includeScreen ? await loadScreenSample() : undefined;
  const [audioChecksum, screenChecksum] = await Promise.all([
    computeMd5Hex(wav),
    screenBlob ? computeMd5Hex(screenBlob) : Promise.resolve(undefined),
  ]);
  const media: MockMedia[] = [
    {
      mediaId: audioId,
      mediaType: "AUDIO",
      startTime: t.start,
      endTime: t.end,
      fileName: "sample-conversation.wav",
      fileType: "WAV",
      checksum: { algorithm: "MD5", value: audioChecksum },
    },
  ];

  if (screenId && screenBlob && screenChecksum) {
    media.push({
      mediaId: screenId,
      mediaType: "SCREEN",
      startTime: t.start,
      endTime: t.end,
      fileName: "sample-screen.mp4",
      fileType: "MP4",
      checksum: { algorithm: "MD5", value: screenChecksum },
    });
  }

  return {
    interaction: {
      externalInteractionId: `INT-${includeScreen ? "VOICE-SCREEN" : "VOICE"}-${now}`,
      channelType: "PHONE_CALL",
      direction: "INBOUND",
      startTime: t.start,
      endTime: t.end,
      externalContactId: `CONTACT-${Date.now()}`,
      externalContactStartTime: t.start,
      subject: includeScreen ? "Voice and screen support call" : "Voice support call",
      hasMultipleInteractions: false,
      isFirstInteraction: true,
      participants: baseParticipants(cfg).map((p, i) =>
        i === 0
          ? {
              ...p,
              participantMediaReferences: [
                { mediaId: audioId, streamId: 1 },
                ...(screenId ? [{ mediaId: screenId, streamId: 0 }] : []),
              ],
            }
          : p
      ),
      media,
    },
    mediaBlobs: new Map([
      [audioId, wav],
      ...(screenId && screenBlob ? [[screenId, screenBlob] as const] : []),
    ]),
  };
}

export function generateVoiceMock(cfg: AgentConfig): Promise<MockResult> {
  return generatePhoneMock(cfg, false);
}

export function generateVoiceScreenMock(cfg: AgentConfig): Promise<MockResult> {
  return generatePhoneMock(cfg, true);
}

export function generateChatMock(cfg: AgentConfig): Promise<MockResult> {
  const t = times();
  const now = Date.now();
  const mediaId = `TEXT-${now}`;
  const participants = baseParticipants(cfg);
  const chatContent = "Customer: Hi! I need help resetting my password.\nAgent: Hello! I can help. Click 'Forgot Password' below the login field and follow the steps.\nCustomer: I do not see that option.\nAgent: It is directly below the password field. Shall I send a direct reset link instead?\nCustomer: Yes please.\nAgent: Done! Check your email. The reset link expires in 30 minutes.";

  return Promise.resolve({
    interaction: {
      externalInteractionId: `INT-CHAT-${now}`,
      channelType: "CHAT",
      direction: "INBOUND",
      startTime: t.start,
      endTime: t.end,
      externalContactId: `CONTACT-${now}`,
      externalContactStartTime: t.start,
      subject: "Chat support conversation",
      hasMultipleInteractions: false,
      isFirstInteraction: true,
      participants: [
        {
          ...participants[0],
          participantTo: "chat-widget-production",
          participantMediaReferences: [{ mediaId }],
        },
        {
          ...participants[1],
          participantFrom: "visitor-8a3f2c-d91e",
          participantIdentifier: "visitor-8a3f2c-d91e",
          isLeadingAgentUser: false,
          participantMediaReferences: [],
        },
      ],
      media: [
        {
          mediaId,
          mediaType: "TEXT",
          startTime: t.start,
          endTime: t.end,
          content: chatContent,
        },
      ],
    },
    mediaBlobs: new Map(),
  });
}

export function generateSmsMock(cfg: AgentConfig): Promise<MockResult> {
  const t = times();
  const now = Date.now();
  const mediaId = `SMS-${now}`;
  const participants = baseParticipants(cfg);
  const smsContent = "Hi, I need help with my recent order.\nSure! Can you please provide your order number?\nOrder #78423. I have not received it yet.\nLet me check that for you right away.";

  return Promise.resolve({
    interaction: {
      externalInteractionId: `INT-SMS-${now}`,
      channelType: "SMS",
      direction: "INBOUND",
      startTime: t.start,
      endTime: t.end,
      externalContactId: `CONTACT-${now}`,
      externalContactStartTime: t.start,
      subject: "SMS support conversation",
      hasMultipleInteractions: false,
      isFirstInteraction: true,
      participants: [
        {
          ...participants[0],
          participantTo: "+18005551234",
          participantMediaReferences: [{ mediaId }],
        },
        {
          ...participants[1],
          participantFrom: "+15559876543",
          participantIdentifier: "+15559876543",
          isLeadingAgentUser: false,
          participantMediaReferences: [],
        },
      ],
      media: [
        {
          mediaId,
          mediaType: "TEXT",
          startTime: t.start,
          endTime: t.end,
          content: smsContent,
        },
      ],
    },
    mediaBlobs: new Map(),
  });
}

export function generateEmailMock(cfg: AgentConfig): Promise<MockResult> {
  const t = times();
  const now = Date.now();
  const mediaId = `EMAIL-${now}`;

  return Promise.resolve({
    interaction: {
      externalInteractionId: `INT-EMAIL-${now}`,
      channelType: "EMAIL",
      direction: "INBOUND",
      startTime: t.start,
      endTime: t.end,
      externalContactId: `CONTACT-${now}`,
      externalContactStartTime: t.start,
      subject: "Request to update billing address",
      hasMultipleInteractions: false,
      isFirstInteraction: true,
      participants: baseParticipants(cfg).map((participant, index) =>
        index === 0
          ? {
              ...participant,
              participantTo: "support@company.com",
              participantMediaReferences: [{ mediaId }],
            }
          : {
              ...participant,
              participantFrom: "customer@example.com",
              participantIdentifier: "customer@example.com",
            }
      ),
      media: [
        {
          mediaId,
          mediaType: "TEXT",
          startTime: t.start,
          endTime: t.end,
          content: "Hello, I recently moved and need to update the billing address on my account. Please let me know what information you need from me.\n\nThank you,\nCustomer",
        },
      ],
    },
    mediaBlobs: new Map(),
  });
}

export const MOCK_GENERATORS: Record<MockType, (cfg: AgentConfig) => Promise<MockResult>> = {
  voice: generateVoiceMock,
  voiceScreen: generateVoiceScreenMock,
  chat: generateChatMock,
  sms: generateSmsMock,
  email: generateEmailMock,
};
