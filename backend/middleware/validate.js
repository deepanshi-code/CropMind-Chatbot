const { z } = require("zod");

// Validates req.body against a Zod schema and replaces it with the parsed (trimmed, stripped) value.
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join(" ");
    return res.status(400).json({ message: message || "Invalid input parameters." });
  }
  req.body = result.data;
  next();
};

const SEASONS = ["Kharif", "Rabi", "Zaid", "Annual"];
const LANGUAGES = ["en", "hi"];
const MAX_CHAT_HISTORY = 10;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BASE64 = Math.ceil((4 * 1024 * 1024) / 3) * 4; // 4 MB of binary

// Checks the file signature ("magic bytes") so a renamed non-image is rejected.
const imageMatchesType = ({ mimeType, data }) => {
  const head = Buffer.from(data.slice(0, 24), "base64");
  if (mimeType === "image/jpeg") return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  if (mimeType === "image/png") return head.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  return head.subarray(0, 4).toString("ascii") === "RIFF" && head.subarray(8, 12).toString("ascii") === "WEBP";
};
const WATER_LEVELS = ["Low", "Medium", "High"];

const schemas = {
  register: z.object({
    email: z.string().trim().toLowerCase().email({ message: "Invalid email format." }).max(254),
    password: z.string()
      .min(8, { message: "Password must be at least 8 characters long." })
      .max(128, { message: "Password must be at most 128 characters long." }),
  }),
  // Login only checks shape, so accounts created under the older 6-character rule can still sign in.
  login: z.object({
    email: z.string().trim().toLowerCase().email({ message: "Invalid email format." }).max(254),
    password: z.string().min(1, { message: "Password is required." }).max(128),
  }),
  crop: z.object({
    name: z.string({ message: "Crop name is required." }).trim().min(1, { message: "Crop name is required." }).max(60, { message: "Crop name is too long." }),
    season: z.enum(SEASONS, { message: `Season must be one of ${SEASONS.join(", ")}.` }),
    water: z.enum(WATER_LEVELS, { message: `Water must be one of ${WATER_LEVELS.join(", ")}.` }),
  }),
  telemetry: z.object({
    time: z.string({ message: "Time is required." }).trim().min(1).max(20),
    type: z.enum(["system", "info", "success", "warning"], { message: "Invalid log type." }),
    text: z.string({ message: "Text is required." }).trim().min(1).max(300),
  }),
  chat: z.object({
    message: z.string({ message: "Message is required." }).trim()
      .min(1, { message: "Message is required." })
      .max(1000, { message: "Message must be at most 1000 characters." }),
    // Earlier turns of this conversation (oldest first) so follow-up questions keep context.
    history: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      text: z.string().max(4000),
    })).max(MAX_CHAT_HISTORY, { message: `At most ${MAX_CHAT_HISTORY} previous messages can be sent.` }).default([]),
    language: z.enum(LANGUAGES).default("en"),
  }),
  diagnose: z.object({
    cropName: z.string({ message: "Crop name is required" }).trim().min(1, { message: "Crop name is required" }).max(60),
    symptoms: z.string().trim().max(1500).optional().default(""),
    soilType: z.string().trim().max(60).optional(),
    wateringFrequency: z.string().trim().max(60).optional(),
    language: z.enum(LANGUAGES).default("en"),
    image: z.object({
      mimeType: z.enum(IMAGE_TYPES, { message: "Photo must be JPEG, PNG or WebP." }),
      data: z.string()
        .max(MAX_IMAGE_BASE64, { message: "Photo must be smaller than 4 MB." })
        .regex(/^[A-Za-z0-9+/]+={0,2}$/, { message: "Photo data is not valid base64." }),
    }).optional(),
  })
    .refine((d) => d.symptoms || d.image, { message: "Describe the symptoms or attach a photo.", path: ["symptoms"] })
    .refine((d) => !d.image || imageMatchesType(d.image), { message: "Photo content does not match its file type.", path: ["image"] }),
};
schemas.cropUpdate = schemas.crop.partial();

module.exports = { validate, schemas };
