// models/AdminServiceConfig.js
const { Schema, model } = require('mongoose');

const AdminServiceConfigSchema = new Schema(
  {
    platformCommission: { type: Number, default: 15 },
    processingFee: { type: Number, default: 2.5 },
    emergencySurcharge: { type: Number, default: 12 },
    minimumServiceFee: { type: Number, default: 200 },
    promoDiscountEnabled: { type: Boolean, default: true },
    emailNotificationsEnabled: { type: Boolean, default: true },
    smsAlertsEnabled: { type: Boolean, default: true },
    registrationOpen: { type: Boolean, default: true },
    termsAndConditions: { type: String, default: '' },
    termsVersion: { type: String, default: '1.0' }, // Version string
    termsUpdatedAt: { type: Date, default: Date.now },
    categoryOverrides: [
      {
        categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
        commission: { type: Number, default: 0 },
        emergencySurcharge: { type: Number, default: 0 },
      },
    ],
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = model('AdminServiceConfig', AdminServiceConfigSchema);
