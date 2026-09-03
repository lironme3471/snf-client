import { z } from "zod";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const dateTimeString = z
  .string()
  .min(1, "Required")
  .refine((v) => !isNaN(Date.parse(v)), "Must be a valid date-time");

export const checksumSchema = z.object({
  algorithm: z.string().min(1, "Required"),
  value: z.string().min(1, "Required"),
});

export const mediaSchema = z
  .object({
    mediaId: z.string().min(1, "Required"),
    mediaType: z.enum(["TEXT", "AUDIO", "SCREEN", "ATTACHMENT"]),
    fileName: z.string().optional(),
    fileType: z.string().optional(),
    checksum: checksumSchema.optional(),
    content: z.string().max(256, "Maximum 256 characters").optional(),
    startTime: dateTimeString,
    endTime: dateTimeString,
    mediaLocation: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.mediaType === "TEXT" && !val.content) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Content required for TEXT media", path: ["content"] });
    }
    if (
      (val.mediaType === "AUDIO" ||
        val.mediaType === "SCREEN" ||
        val.mediaType === "ATTACHMENT") &&
      !val.checksum
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Checksum required for binary media", path: ["checksum"] });
    }
    if (
      (val.mediaType === "AUDIO" ||
        val.mediaType === "SCREEN" ||
        val.mediaType === "ATTACHMENT") &&
      !val.fileName
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "File name required for binary media", path: ["fileName"] });
    }
  });

export const externalIdentifierSchema = z.object({
  systemName: z.string().min(1, "Required"),
  identifierType: z.string().min(1, "Required"),
  value: z.string().min(1, "Required"),
  systemId: z.string().optional(),
});

export const participantMediaRefSchema = z.object({
  mediaId: z.string().optional(),
  streamId: z.coerce.number().optional(),
});

export const participantSchema = z
  .object({
    participantType: z.enum(["AGENT_USER", "CUSTOMER", "PARTICIPANT"]),
    participantFrom: z.string().max(20, "Maximum 20 characters").optional(),
    participantTo: z.string().max(20, "Maximum 20 characters").optional(),
    participantIdentifier: z.string().min(1, "Required").max(20, "Maximum 20 characters"),
    isLeadingAgentUser: z.boolean().optional(),
    externalIdentifier: externalIdentifierSchema.optional(),
    participantMediaReferences: z.array(participantMediaRefSchema),
  })
  .superRefine((val, ctx) => {
    if (val.participantType === "AGENT_USER" && !val.externalIdentifier) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "External identifier required for AGENT_USER", path: ["externalIdentifier"] });
    }
    if (val.participantFrom && val.participantTo) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide only one: participantFrom or participantTo", path: ["participantFrom"] });
    }
    if (val.participantType !== "AGENT_USER" && val.isLeadingAgentUser) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "isLeadingAgentUser only allowed for AGENT_USER", path: ["isLeadingAgentUser"] });
    }
  });

export const businessDataSchema = z.object({
  key: z.string().min(1, "Required"),
  value: z.string().min(1, "Required"),
});

export const interactionSchema = z
  .object({
    externalInteractionId: z.string().min(1, "Required"),
    channelType: z.enum([
      "PHONE_CALL",
      "PHONE_CALL_IVR",
      "WORKITEM",
      "EMAIL",
      "CHAT",
      "SMS",
      "FACEBOOK",
      "WHATSAPP",
      "TELEGRAM",
      "APPLE_BUSINESS",
      "LINE",
      "VIBER",
      "GOOGLE_BUSINESS",
      "SLACK",
      "MICROSOFT_TEAMS",
    ]),
    direction: z.enum(["INBOUND", "OUTBOUND", "INTERNAL"]),
    startTime: dateTimeString,
    endTime: dateTimeString,
    wrapUpTime: z.string().optional(),
    externalContactId: z.string().min(1, "Required"),
    externalContactStartTime: dateTimeString,
    hasMultipleInteractions: z.boolean().optional(),
    isFirstInteraction: z.boolean().optional(),
    subject: z.string().optional(),
    participants: z.array(participantSchema).min(1, "At least one participant required"),
    media: z.array(mediaSchema),
    businessData: z.array(businessDataSchema).optional(),
  })
  .superRefine((val, ctx) => {
    const now = Date.now();
    const start = Date.parse(val.startTime);
    if (!isNaN(start) && now - start > THIRTY_DAYS_MS) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Interactions older than 30 days are rejected", path: ["startTime"] });
    }
    const leadingCount = val.participants.filter((p) => p.isLeadingAgentUser).length;
    if (leadingCount !== 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Exactly one leading agent required", path: ["participants"] });
    }
  });

export const manifestSchema = z.object({
  uploadUrlValidityMinutes: z.number().int().min(5).max(60),
  interactions: z
    .array(interactionSchema)
    .min(1, "At least one interaction required")
    .max(400, "Maximum 400 interactions"),
});

export type ManifestFormValues = z.infer<typeof manifestSchema>;
