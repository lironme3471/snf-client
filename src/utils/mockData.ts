import type { ManifestFormValues } from "./validation";
import {
  generateWavBlob,
  samplePngBlob,
  computeSha256Hex,
} from "./sampleMedia";

// TODO: replace with values pre-configured in your CXone environment
export const SAMPLE_AGENT_CONFIG = {
  systemName: "AcmeRecordingSystem",
  identifierType: "EMAIL",
  identifierValue: "agent@example.com",
};

type AgentConfig = typeof SAMPLE_AGENT_CONFIG;
type MockInteraction = ManifestFormValues["interactions"][number];

export type MockType = "voice" | "screen" | "chat" | "all";

/** Interaction + a map of mediaId → Blob for auto-upload after job creation. */
export interface MockResult {
  interaction: MockInteraction;
  mediaBlobs: Map<string, Blob>;
}

export const MOCK_LABELS: Record<MockType, string> = {
  voice: "Voice (PHONE_CALL + AUDIO)",
  screen: "Screen (PHONE_CALL + SCREEN)",
  chat: "Chat (CHAT + TEXT)",
  all: "Voice + Screen + Chat",
};

function baseParticipants(cfg: AgentConfig): MockInteraction["participants"] {
  return [
    {
      participantType: "AGENT_USER",
      participantIdentifier: cfg.identifierValue,
      isLeadingAgentUser: true,
      participantFrom: "",
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
      isLeadingAgentUser: false,
      participantFrom: "+1-555-000-5678",
      participantTo: "+1-555-000-1234",
      participantMediaReferences: [],
    },
  ];
}

function times() {
  const now = Date.now();
  return {
    start: new Date(now - 60 * 60 * 1000).toISOString(),
    end: new Date(now - 30 * 60 * 1000).toISOString(),
    wrapUp: new Date(now - 25 * 60 * 1000).toISOString(),
  };
}

export async function generateVoiceMock(cfg: AgentConfig): Promise<MockResult> {
  const t = times();
  const wav = generateWavBlob();
  const audioId = `AUDIO-${Date.now()}`;
  const sha = await computeSha256Hex(wav);
  return {
    interaction: {
      externalInteractionId: `INT-VOICE-${Date.now()}`,
      channelType: "PHONE_CALL",
      direction: "INBOUND",
      startTime: t.start,
      endTime: t.end,
      externalContactId: `CONTACT-${Date.now()}`,
      externalContactStartTime: t.start,
      subject: "Voice support call",
      hasMultipleInteractions: false,
      isFirstInteraction: true,
      participants: baseParticipants(cfg),
      media: [
        {
          mediaId: audioId,
          mediaType: "AUDIO",
          startTime: t.start,
          endTime: t.end,
          fileName: "sample-recording.wav",
          fileType: "audio/wav",
          checksum: { algorithm: "SHA-256", value: sha },
        },
      ],
      businessData: [{ key: "customField1", value: "voice-value" }],
    },
    mediaBlobs: new Map([[audioId, wav]]),
  };
}

export async function generateScreenMock(cfg: AgentConfig): Promise<MockResult> {
  const t = times();
  const png = samplePngBlob();
  const screenId = `SCREEN-${Date.now()}`;
  const sha = await computeSha256Hex(png);
  return {
    interaction: {
      externalInteractionId: `INT-SCREEN-${Date.now()}`,
      channelType: "PHONE_CALL",
      direction: "INBOUND",
      startTime: t.start,
      endTime: t.end,
      wrapUpTime: t.wrapUp,
      externalContactId: `CONTACT-${Date.now()}`,
      externalContactStartTime: t.start,
      subject: "Screen-recorded support call",
      hasMultipleInteractions: false,
      isFirstInteraction: true,
      participants: baseParticipants(cfg),
      media: [
        {
          mediaId: screenId,
          mediaType: "SCREEN",
          startTime: t.start,
          endTime: t.end,
          fileName: "sample-screen.png",
          fileType: "image/png",
          checksum: { algorithm: "SHA-256", value: sha },
        },
      ],
      businessData: [{ key: "customField1", value: "screen-value" }],
    },
    mediaBlobs: new Map([[screenId, png]]),
  };
}

export async function generateChatMock(cfg: AgentConfig): Promise<MockResult> {
  const t = times();
  const textId = `TEXT-${Date.now()}`;
  return {
    interaction: {
      externalInteractionId: `INT-CHAT-${Date.now()}`,
      channelType: "CHAT",
      direction: "INBOUND",
      startTime: t.start,
      endTime: t.end,
      externalContactId: `CONTACT-${Date.now()}`,
      externalContactStartTime: t.start,
      subject: "Live chat session",
      hasMultipleInteractions: false,
      isFirstInteraction: true,
      participants: baseParticipants(cfg),
      media: [
        {
          mediaId: textId,
          mediaType: "TEXT",
          startTime: t.start,
          endTime: t.end,
          content: "Agent: Hello, how can I help you?\nCustomer: I need help with my order.",
        },
      ],
      businessData: [{ key: "customField1", value: "chat-value" }],
    },
    mediaBlobs: new Map(), // TEXT media is inline — no upload needed
  };
}

export async function generateAllThreeMock(cfg: AgentConfig): Promise<MockResult> {
  const t = times();
  const now = Date.now();
  const wav = generateWavBlob();
  const png = samplePngBlob();
  const audioId = `AUDIO-${now}`;
  const screenId = `SCREEN-${now}`;
  const textId = `TEXT-${now}`;
  const [wavSha, pngSha] = await Promise.all([
    computeSha256Hex(wav),
    computeSha256Hex(png),
  ]);
  return {
    interaction: {
      externalInteractionId: `INT-ALL-${now}`,
      channelType: "PHONE_CALL",
      direction: "INBOUND",
      startTime: t.start,
      endTime: t.end,
      wrapUpTime: t.wrapUp,
      externalContactId: `CONTACT-${now}`,
      externalContactStartTime: t.start,
      subject: "Voice + screen + chat interaction",
      hasMultipleInteractions: false,
      isFirstInteraction: true,
      participants: baseParticipants(cfg),
      media: [
        {
          mediaId: audioId,
          mediaType: "AUDIO",
          startTime: t.start,
          endTime: t.end,
          fileName: "sample-recording.wav",
          fileType: "audio/wav",
          checksum: { algorithm: "SHA-256", value: wavSha },
        },
        {
          mediaId: screenId,
          mediaType: "SCREEN",
          startTime: t.start,
          endTime: t.end,
          fileName: "sample-screen.png",
          fileType: "image/png",
          checksum: { algorithm: "SHA-256", value: pngSha },
        },
        {
          mediaId: textId,
          mediaType: "TEXT",
          startTime: t.start,
          endTime: t.end,
          content: "Agent: Hello, how can I help you?\nCustomer: I need help with my order.",
        },
      ],
      businessData: [{ key: "customField1", value: "all-value" }],
    },
    mediaBlobs: new Map([[audioId, wav], [screenId, png]]),
  };
}

export const MOCK_GENERATORS: Record<MockType, (cfg: AgentConfig) => Promise<MockResult>> = {
  voice: generateVoiceMock,
  screen: generateScreenMock,
  chat: generateChatMock,
  all: generateAllThreeMock,
};
