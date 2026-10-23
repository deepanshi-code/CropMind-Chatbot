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
const RATINGS = ["Low", "Medium", "High"];

// Empty strings from optional form fields mean "not given".
const blankToUndefined = (value) => (value === "" || value === null ? undefined : value);
const soilValue = z.preprocess(blankToUndefined, z.coerce.number().min(0, { message: "Soil values cannot be negative." }).max(5000).optional());
const optionalDate = (label) => z.preprocess(
  blankToUndefined,
  z.coerce.date({ message: `${label} is not a valid date.` })
    .refine((d) => d.getFullYear() >= 1990 && d.getTime() <= Date.now() + 366 * 24 * 3600 * 1000, { message: `${label} is out of range.` })
    .optional()
);
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
    acceptPrivacy: z.literal(true, { message: "Please read and accept the privacy notice to create an account." }),
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
    sowingDate: optionalDate("Sowing date"),
    areaAcres: z.preprocess(blankToUndefined, z.coerce.number().min(0, { message: "Area cannot be negative." }).max(100000).optional()),
    notes: z.string().trim().max(300, { message: "Notes must be at most 300 characters." }).optional(),
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
    language: z.enum(LANGUAGES).default("en"),
  }),
  diagnose: z.object({
    // Optional id of a crop from the user's catalog, so advice can use its season and sowing date.
    cropId: z.string().trim().max(64).optional(),
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
  profile: z.object({
    name: z.string().trim().max(60, { message: "Name must be at most 60 characters." }).nullable().optional(),
    language: z.enum(LANGUAGES).optional(),
    location: z.object({
      name: z.string().trim().min(1).max(120),
      lat: z.coerce.number().min(-90).max(90),
      lon: z.coerce.number().min(-180).max(180),
    }).nullable().optional(),
  }),
  soilTest: z.object({
    nitrogen: soilValue,
    phosphorus: soilValue,
    potassium: soilValue,
    nitrogenRating: z.preprocess(blankToUndefined, z.enum(RATINGS).optional()),
    phosphorusRating: z.preprocess(blankToUndefined, z.enum(RATINGS).optional()),
    potassiumRating: z.preprocess(blankToUndefined, z.enum(RATINGS).optional()),
    ph: z.preprocess(blankToUndefined, z.coerce.number().min(0, { message: "pH must be between 0 and 14." }).max(14, { message: "pH must be between 0 and 14." }).optional()),
    organicCarbon: z.preprocess(blankToUndefined, z.coerce.number().min(0).max(100).optional()),
    testedOn: optionalDate("Test date"),
  }).refine((d) => Object.values(d).some((v) => v !== undefined), { message: "Enter at least one soil test value." }),
  changePassword: z.object({
    currentPassword: z.string().max(128).optional(),
    newPassword: z.string()
      .min(8, { message: "New password must be at least 8 characters long." })
      .max(128, { message: "New password must be at most 128 characters long." }),
  }),
  deleteAccount: z.object({
    // The password for password accounts, or the account email for Google accounts.
    confirmation: z.string({ message: "Confirmation is required." }).min(1, { message: "Confirmation is required." }).max(254),
  }),
  device: z.object({
    name: z.string({ message: "Device name is required." }).trim().min(1, { message: "Device name is required." }).max(40, { message: "Device name is too long." }),
  }),
};
schemas.cropUpdate = schemas.crop.partial();

module.exports = { validate, schemas };
