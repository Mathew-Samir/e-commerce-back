const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 60,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false, // Soft delete
    },
    isActive: {
      type: Boolean,
      default: true, // Seasonal toggle (summer/winter)
    },
  },
  { timestamps: true },
);

// Virtual for products count (optional)
categorySchema.virtual("products", {
  ref: "Product",
  localField: "_id",
  foreignField: "categoryId",
});

module.exports = mongoose.model("Category", categorySchema);
