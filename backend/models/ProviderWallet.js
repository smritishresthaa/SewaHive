// models/ProviderWallet.js
const { Schema, model } = require('mongoose');

const WalletTransactionSchema = new Schema({
  type: {
    type: String,
    enum: ['DEPOSIT', 'WITHDRAWAL', 'REFUND', 'PLATFORM_FEE'],
  },
  amount: { type: Number, required: true },
  description: String,
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
  paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
    default: 'PENDING',
  },
  createdAt: { type: Date, default: Date.now },
});

const ProviderWalletSchema = new Schema(
  {
    // PROVIDER
    providerId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      unique: true,
      index: true
    },

    // BALANCE TRACKING
    // Total earned (all completed payments)
    totalEarned: { type: Number, default: 0 },

    // Money held in escrow (awaiting client confirmation)
    pendingBalance: { type: Number, default: 0 },

    // Money available to withdraw
    availableBalance: { type: Number, default: 0 },

    // Money already withdrawn
    totalWithdrawn: { type: Number, default: 0 },

    // Total refunded to clients
    totalRefunded: { type: Number, default: 0 },

    // TRANSACTION HISTORY
    transactions: [WalletTransactionSchema],

    // BANK DETAILS (for future withdrawals)
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      bankName: String,
      bankCode: String,
      verified: { type: Boolean, default: false },
    },

    // STATISTICS
    completedBookings: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    // STATUS
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'BLOCKED'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

// Helper method to add transaction
ProviderWalletSchema.methods.addTransaction = async function(transactionData) {
  this.transactions.push(transactionData);
  return this.save();
};

// Helper method to release payment from escrow
ProviderWalletSchema.methods.releaseEscrow = async function(amount) {
  if (this.pendingBalance < amount) {
    throw new Error('Insufficient pending balance');
  }
  this.pendingBalance -= amount;
  this.availableBalance += amount;
  this.totalEarned += amount;
  return this.save();
};

// Helper method to refund from pending
ProviderWalletSchema.methods.refundPending = async function(amount) {
  if (this.pendingBalance < amount) {
    throw new Error('Insufficient pending balance to refund');
  }
  this.pendingBalance -= amount;
  return this.save();
};

module.exports = model('ProviderWallet', ProviderWalletSchema);
