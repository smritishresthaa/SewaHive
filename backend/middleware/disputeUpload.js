const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "sewahive/disputes",
    resource_type: "auto",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf", "doc", "docx"],
  },
});

const disputeUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = disputeUpload;
