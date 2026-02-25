// models/Subcategory.js
const { Schema, model } = require('mongoose');

const SubcategorySchema = new Schema(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    suggestedPriceMode: {
      type: String,
      enum: ['fixed', 'range', 'quote_required'],
    },
  },
  { timestamps: true }
);

SubcategorySchema.index({ categoryId: 1, name: 1 }, { unique: true });
SubcategorySchema.index({ categoryId: 1, status: 1, sortOrder: 1 });

module.exports = model('Subcategory', SubcategorySchema);
