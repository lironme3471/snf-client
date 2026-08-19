import JSZip from "jszip";
import type { InteractionsIngestionManifest, Participant } from "../types/api";

function normalizeParticipant(participant: Participant): Participant {
  const { participantFrom, participantTo, isLeadingAgentUser, ...rest } = participant;
  const baseParticipant = participant.participantType === "AGENT_USER"
    ? { ...rest, isLeadingAgentUser }
    : rest;

  const preferredValue = participant.participantType === "AGENT_USER"
    ? participantTo || participantFrom
    : participantFrom || participantTo;

  return {
    ...baseParticipant,
    ...(participant.participantType === "AGENT_USER"
      ? { participantTo: preferredValue }
      : { participantFrom: preferredValue }),
  };
}

export async function buildManifestZip(
  manifest: InteractionsIngestionManifest
): Promise<Blob> {
  const normalizedManifest: InteractionsIngestionManifest = {
    ...manifest,
    interactions: manifest.interactions.map((interaction) => ({
      ...interaction,
      participants: interaction.participants.map(normalizeParticipant),
    })),
  };
  const zip = new JSZip();
  const manifestJson = JSON.stringify(normalizedManifest, null, 2);
  console.log("[SNF] manifest.json being submitted:\n", manifestJson);
  zip.file("manifest.json", manifestJson);
  return zip.generateAsync({ type: "blob", mimeType: "application/zip" });
}
