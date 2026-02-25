// models/AdminServiceConfig.js
const { Schema, model } = require('mongoose');

const AdminServiceConfigSchema = new Schema(
  {
    platformCommission: { type: Number, default: 15 },
    processingFee: { type: Number, default: 2.5 },
    emergencySurcharge: { type: Number, default: 12 },
    minimumServiceFee: { type: Number, default: 2 },
    promoDiscountEnabled: { type: Boolean, default: true },
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
