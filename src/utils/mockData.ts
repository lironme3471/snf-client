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

export type MockType = "voice" | "voiceScreen";

/** Interaction + a map of mediaId → Blob for auto-upload after job creation. */
export interface MockResult {
  interaction: MockInteraction;
  mediaBlobs: Map<string, Blob>;
}

export const MOCK_LABELS: Record<MockType, string> = {
  voice: "Voice only",
  voiceScreen: "Voice + Screen",
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

export const MOCK_GENERATORS: Record<MockType, (cfg: AgentConfig) => Promise<MockResult>> = {
  voice: generateVoiceMock,
  voiceScreen: generateVoiceScreenMock,
};
