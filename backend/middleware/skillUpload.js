const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "sewahive/skill_proofs",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    // No specific transformation to preserve original document quality
  },
});

const skillUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for proofs
});

module.exports = skillUpload;
