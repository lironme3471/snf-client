import JSZip from "jszip";
import type { InteractionsIngestionManifest, Participant } from "../types/api";

const MAX_PARTICIPANT_FIELD_LENGTH = 20;

function sanitizeParticipantField(value?: string): string | undefined {
  if (!value) return value;
  const trimmed = value.trim();
  return trimmed.length > MAX_PARTICIPANT_FIELD_LENGTH
    ? trimmed.slice(0, MAX_PARTICIPANT_FIELD_LENGTH)
    : trimmed;
}

export function normalizeParticipant(participant: Participant): Participant {
  const { participantFrom, participantTo, isLeadingAgentUser, ...rest } = participant;
  const normalizedFrom = sanitizeParticipantField(participantFrom);
  const normalizedTo = sanitizeParticipantField(participantTo);
  const normalizedIdentifier = sanitizeParticipantField(participant.participantIdentifier);

  const baseParticipant = participant.participantType === "AGENT_USER"
    ? { ...rest, participantIdentifier: normalizedIdentifier ?? participant.participantIdentifier, isLeadingAgentUser }
    : {
        ...rest,
        participantIdentifier: normalizedIdentifier ?? participant.participantIdentifier,
      };

  const preferredValue = participant.participantType === "AGENT_USER"
    ? normalizedTo ?? normalizedFrom
    : normalizedFrom ?? normalizedTo;

  return {
    ...baseParticipant,
    ...(participant.participantType === "AGENT_USER"
      ? { participantTo: preferredValue }
      : { participantFrom: preferredValue }),
  };
}

export function normalizeManifest(
  manifest: InteractionsIngestionManifest
): InteractionsIngestionManifest {
  return {
    ...manifest,
    interactions: manifest.interactions.map((interaction) => ({
      ...interaction,
      participants: interaction.participants.map(normalizeParticipant),
    })),
  };
}

export async function buildManifestZip(
  manifest: InteractionsIngestionManifest
): Promise<Blob> {
  const normalizedManifest = normalizeManifest(manifest);
  const zip = new JSZip();
  const manifestJson = JSON.stringify(normalizedManifest, null, 2);
  console.log("[SNF] manifest.json being submitted:\n", manifestJson);
  zip.file("manifest.json", manifestJson);
  return zip.generateAsync({ type: "blob", mimeType: "application/zip" });
}
