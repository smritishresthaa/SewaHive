// middleware/chatUpload.js
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary");

// ─── Image upload (chat) ───────────────────────────────
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "sewahive/chat-images",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    resource_type: "image",
    transformation: [{ quality: "auto:good", fetch_format: "auto" }],
  },
});

const chatImageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(_req, file, cb) {
    const ALLOWED_IMAGE_MIMES = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];
    if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      return cb(
        new Error("Only JPG, PNG, and WebP images are allowed"),
        false
      );
    }
    cb(null, true);
  },
});

// ─── Voice upload (chat) ───────────────────────────────
const voiceStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "sewahive/chat-voice",
    resource_type: "video", // Cloudinary uses "video" for audio
    allowed_formats: ["webm", "ogg", "mp4", "mpeg", "mp3"],
  },
});

const chatVoiceUpload = multer({
  storage: voiceStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter(_req, file, cb) {
    const ALLOWED_VOICE_MIMES = [
      "audio/webm",
      "audio/ogg",
      "audio/mp4",
      "audio/mpeg",
      "audio/mp3",
      "video/webm", // MediaRecorder sometimes reports video/webm for audio-only
    ];
    if (!ALLOWED_VOICE_MIMES.includes(file.mimetype)) {
      return cb(
        new Error(
          "Only WebM, OGG, MP4, and MPEG audio formats are allowed"
        ),
        false
      );
    }
    cb(null, true);
  },
});

// ─── Video upload (chat) ───────────────────────────────
const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "sewahive/chat-videos",
    resource_type: "video",
    allowed_formats: ["mp4", "webm", "ogg"],
  },
});

const chatVideoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter(_req, file, cb) {
    const ALLOWED_VIDEO_MIMES = [
      "video/mp4",
      "video/webm",
      "video/ogg"
    ];
    if (!ALLOWED_VIDEO_MIMES.includes(file.mimetype)) {
      return cb(
        new Error("Only MP4, WebM, and OGG video formats are allowed"),
        false
      );
    }
    cb(null, true);
  },
});

module.exports = { chatImageUpload, chatVoiceUpload, chatVideoUpload };
