const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 100,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    image: {
      type: String,
      required: true, // URL from cloud storage
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
    },
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false, // Soft delete
    },
    isActive: {
      type: Boolean,
      default: true, // Seasonal visibility
    },
    salesCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// Index for faster search & filtering
productSchema.index({ name: "text", categoryId: 1, subCategoryId: 1 });
productSchema.index({ isActive: 1, isDeleted: 1, createdAt: -1 });
productSchema.index({ collectionId: 1, isActive: 1, isDeleted: 1 });

module.exports = mongoose.model("Product", productSchema);
