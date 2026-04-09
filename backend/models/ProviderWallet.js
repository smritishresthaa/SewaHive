// models/ProviderWallet.js
const { Schema, model } = require("mongoose");

const WalletTransactionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["DEPOSIT", "WITHDRAWAL", "REFUND", "PLATFORM_FEE"],
      required: true,
    },
    amount: { type: Number, required: true, default: 0 },
    description: { type: String, default: "" },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED"],
      default: "PENDING",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ProviderWalletSchema = new Schema(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // Money provider has actually earned/released
    totalEarned: { type: Number, default: 0 },

    // Money still held in escrow
    pendingBalance: { type: Number, default: 0 },

    // Money ready to withdraw
    availableBalance: { type: Number, default: 0 },

    // Money already withdrawn
    totalWithdrawn: { type: Number, default: 0 },

    // Money refunded back to clients through disputes / refunds
    totalRefunded: { type: Number, default: 0 },

    transactions: {
      type: [WalletTransactionSchema],
      default: [],
    },

    bankDetails: {
      accountHolderName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      bankName: { type: String, default: "" },
      bankCode: { type: String, default: "" },
      verified: { type: Boolean, default: false },
    },

    completedBookings: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "BLOCKED"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ProviderWalletSchema.virtual("balance").get(function balanceGetter() {
  return Number(this.availableBalance || 0);
});

ProviderWalletSchema.methods.addTransaction = async function addTransaction(
  transactionData
) {
  this.transactions.push(transactionData);
  return this.save();
};

ProviderWalletSchema.methods.releaseEscrow = async function releaseEscrow(amount) {
  const safeAmount = Number(amount || 0);
  if (this.pendingBalance < safeAmount) {
    throw new Error("Insufficient pending balance");
  }

  this.pendingBalance = Number((this.pendingBalance - safeAmount).toFixed(2));
  this.availableBalance = Number((this.availableBalance + safeAmount).toFixed(2));
  this.totalEarned = Number((this.totalEarned + safeAmount).toFixed(2));

  return this.save();
};

ProviderWalletSchema.methods.refundPending = async function refundPending(amount) {
  const safeAmount = Number(amount || 0);
  if (this.pendingBalance < safeAmount) {
    throw new Error("Insufficient pending balance to refund");
  }

  this.pendingBalance = Number((this.pendingBalance - safeAmount).toFixed(2));
  this.totalRefunded = Number((this.totalRefunded + safeAmount).toFixed(2));

  return this.save();
};

module.exports = model("ProviderWallet", ProviderWalletSchema);