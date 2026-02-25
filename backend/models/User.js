// models/User.js
const { Schema, model } = require("mongoose");

const UserSchema = new Schema(
  {
    // -----------------------------------
    // BASIC ACCOUNT FIELDS
    // -----------------------------------
    role: {
      type: String,
      enum: ["client", "provider", "admin"],
      default: "client",
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      default: null,
      index: true,
    },

    passwordHash: {
      type: String,
    },

    googleId: {
      type: String,
      index: true,
      sparse: true,
    },

    // -----------------------------------
    // PROFILE INFORMATION
    // -----------------------------------
    profile: {
      name: { type: String, default: "" },
      avatarUrl: { type: String, default: "" },
      gender: { type: String, default: "" },
      dob: { type: Date },
      bio: { type: String, default: "" },

      // ✅ STRUCTURED ADDRESS (FIXED)
      address: {
        country: { type: String, default: "" },
        city: { type: String, default: "" },
        postalCode: { type: String, default: "" },
        area: { type: String, default: "" }, // ✅ ADD THIS LINE
      },
    },

    // -----------------------------------
    // LOCATION (GEO JSON)
    // -----------------------------------
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },

    notificationsToken: String,

    // -----------------------------------
    // PROVIDER DETAILS
    // -----------------------------------
    providerStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },

    // Provider KYC status (normalized for fast checks)
    kycStatus: {
      type: String,
      enum: [
        "not_submitted",
        "pending_review",
        "needs_correction",
        "approved",
        "rejected",
      ],
      default: "not_submitted",
    },

    providerDetails: {
      categories: [{ type: String }],
      approvedCategories: [{ type: Schema.Types.ObjectId, ref: "Category" }], // Strict list of categories this provider is allowed to operate in
      skillProofs: [
        {
          categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
          status: {
            type: String,
            enum: ["pending_review", "approved", "needs_correction", "rejected"],
            default: "pending_review",
          },
          portfolio: [
            {
              url: String,
              description: String,
              type: { type: String, enum: ["work", "training", "before", "after"], default: "work" },
              uploadedAt: { type: Date, default: Date.now },
            },
          ],
          experienceDescription: { type: String, default: "" },
          tools: [{ type: String }],
          certificates: [
            {
              name: String,
              url: String,
              issuer: String,
              year: Number,
              uploadedAt: { type: Date, default: Date.now },
            },
          ],
          adminFeedback: { type: String, default: "" },
          submittedAt: { type: Date, default: Date.now },
          reviewedAt: { type: Date },
        },
      ],
      hourlyRate: Number,
      basePrice: Number,
      experienceYears: Number,
      emergencyAvailable: { type: Boolean, default: false },
      notificationsEnabled: { type: Boolean, default: false },
      featured: { type: Boolean, default: false },

      // --- Phase 3: Performance Trust Metrics ---
      metrics: {
        ratingQuality: { type: Number, default: 0 }, // 0-5
        completedJobs: { type: Number, default: 0 },
        responseSpeed: { type: Number, default: 0 }, // minutes
        cancellationRate: { type: Number, default: 0 }, // percentage
        repeatClients: { type: Number, default: 0 },
        profileCompleteness: { type: Number, default: 0 } // percentage
      },

      // --- Phase 3: Badges & Trust Score ---
      badges: [{ type: String }], // e.g., 'Verified Provider', 'Top Rated', 'Fast Responder', 'Experienced', 'Elite'
      trustScore: { type: Number, default: 0 }, // 0-100

      // Coverage area for emergency services
      coverage: {
        lat: Number,
        lng: Number,
        radiusKm: { type: Number, default: 5 },
      },

      // -----------------------------------
      // METRICS FOR BADGES
      // -----------------------------------
      metrics: {
        ratingQuality: { type: Number, default: 0 },
        completedJobs: { type: Number, default: 0 },
        responseSpeed: { type: Number, default: 0 },
        cancellationRate: { type: Number, default: 0 },
        repeatClients: { type: Number, default: 0 }
      },

      badges: {
        type: [String],
        default: [],
      },

      verificationDocs: [
        {
          docType: String,
          downloadUrl: String,
          status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
          },
          adminComment: String,
        },
      ],

      rating: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 },
      },

      completedBookings: { type: Number, default: 0 },

      analytics: {
        totalEarnings: { type: Number, default: 0 },
        responseTimeAvg: { type: Number, default: 0 },
        jobsThisMonth: { type: Number, default: 0 },
      },

      monthlyStats: {
        lastCalculated: Date,
        currentRank: { type: Number, default: null },
        currentCategory: { type: Schema.Types.ObjectId, ref: "Category", default: null },
      },
    },

    // -----------------------------------
    // ADMIN FIELDS
    // -----------------------------------
    admin: {
      managedBy: String,
      notes: String,
    },

    // -----------------------------------
    // EMAIL VERIFICATION
    // -----------------------------------
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,

    // -----------------------------------
    // PASSWORD RESET
    // -----------------------------------
    resetOtp: String,
    resetOtpExpires: Date,

    // -----------------------------------
    // ACCOUNT STATUS
    // -----------------------------------
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "deleted"],
      default: "active",
    },
    isBlocked: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    lastLogin: Date,
  },
  { timestamps: true }
);

// -----------------------------------
// INDEXES
// -----------------------------------
UserSchema.index({ location: "2dsphere" });
UserSchema.index({ role: 1 });

UserSchema.pre("save", function normalizeData(next) {
  // Normalize KYC status
  if (this.kycStatus === "submitted" || this.kycStatus === "under_review") {
    this.kycStatus = "pending_review";
  }
  
  // Ensure providerDetails is initialized
  if (!this.providerDetails) {
    this.providerDetails = {
      categories: [],
      badges: [],
      verificationDocs: [],
      rating: { average: 0, count: 0 },
      completedBookings: 0,
      analytics: {
        totalEarnings: 0,
        responseTimeAvg: 0,
        jobsThisMonth: 0,
      },
    };
  }
  
  // Ensure badges is always a clean array
  if (!Array.isArray(this.providerDetails.badges)) {
    this.providerDetails.badges = [];
  } else {
    // Filter out any invalid badge values
    this.providerDetails.badges = this.providerDetails.badges.filter(
      badge => badge && typeof badge === 'string' && 
      ["verified", "pro", "top-rated"].includes(badge)
    );
  }
  
  next();
});

module.exports = model("User", UserSchema);
