const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary");

// Separate storage for KYC artifacts so we don't apply avatar transforms
const kycStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "sewahive/kyc",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"],
    resource_type: "auto",
    public_id: `${req.user?.id || "anonymous"}-${Date.now()}-${file.fieldname}`,
  }),
});

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);

const kycUpload = multer({
  storage: kycStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error("Unsupported file type. Only JPG, PNG, or PDF allowed."));
    }
    return cb(null, true);
  },
});

module.exports = kycUpload;
