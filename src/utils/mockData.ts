import type { ManifestFormValues } from "./validation";
import {
  generateWavBlob,
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
    start: new Date(now - 125 * 1000).toISOString(),    // ~2m 5s ago
    end: new Date(now - 5 * 1000).toISOString(),          // ~5s ago
    wrapUp: new Date(now - 2 * 1000).toISOString(),       // ~2s ago
  };
}

export async function generateVoiceMock(cfg: AgentConfig): Promise<MockResult> {
  const t = times();
  const wav = generateWavBlob();
  const audioId = `AUDIO-${Date.now()}`;
  const sha = await computeMd5Hex(wav);
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
      participants: baseParticipants(cfg).map((p, i) =>
        i === 0 ? { ...p, participantMediaReferences: [{ mediaId: audioId, streamId: 1 }] } : p
      ),
      media: [
        {
          mediaId: audioId,
          mediaType: "AUDIO",
          startTime: t.start,
          endTime: t.end,
          fileName: "sample-recording.wav",
          fileType: "WAV",
          checksum: { algorithm: "MD5", value: sha },
        },
      ],
    },
    mediaBlobs: new Map([[audioId, wav]]),
  };
}

export async function generateScreenMock(cfg: AgentConfig): Promise<MockResult> {
  const t = times();
  const wav = generateWavBlob();
  const audioId = `AUDIO-${Date.now()}`;
  const sha = await computeMd5Hex(wav);
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
      participants: baseParticipants(cfg).map((p, i) =>
        i === 0 ? { ...p, participantMediaReferences: [{ mediaId: audioId, streamId: 1 }] } : p
      ),
      media: [
        {
          mediaId: audioId,
          mediaType: "AUDIO",
          startTime: t.start,
          endTime: t.end,
          fileName: "sample-recording.wav",
          fileType: "WAV",
          checksum: { algorithm: "MD5", value: sha },
        },
      ],
    },
    mediaBlobs: new Map([[audioId, wav]]),
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
      participants: baseParticipants(cfg).map((p, i) =>
        i === 0 ? { ...p, participantMediaReferences: [{ mediaId: textId }] } : p
      ),
      media: [
        {
          mediaId: textId,
          mediaType: "TEXT",
          startTime: t.start,
          endTime: t.end,
          content: "Agent: Hello, how can I help you?\nCustomer: I need help with my order.",
        },
      ],
    },
    mediaBlobs: new Map(), // TEXT media is inline — no upload needed
  };
}

export async function generateAllThreeMock(cfg: AgentConfig): Promise<MockResult> {
  const t = times();
  const now = Date.now();
  const wav = generateWavBlob();
  const audioId = `AUDIO-${now}`;
  const wavSha = await computeMd5Hex(wav);
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
      subject: "Combined interaction",
      hasMultipleInteractions: false,
      isFirstInteraction: true,
      participants: baseParticipants(cfg).map((p, i) =>
        i === 0 ? { ...p, participantMediaReferences: [{ mediaId: audioId, streamId: 1 }] } : p
      ),
      media: [
        {
          mediaId: audioId,
          mediaType: "AUDIO",
          startTime: t.start,
          endTime: t.end,
          fileName: "sample-recording.wav",
          fileType: "WAV",
          checksum: { algorithm: "MD5", value: wavSha },
        },
      ],
    },
    mediaBlobs: new Map([[audioId, wav]]),
  };
}

export const MOCK_GENERATORS: Record<MockType, (cfg: AgentConfig) => Promise<MockResult>> = {
  voice: generateVoiceMock,
  screen: generateScreenMock,
  chat: generateChatMock,
  all: generateAllThreeMock,
};
