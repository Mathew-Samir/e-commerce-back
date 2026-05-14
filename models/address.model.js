const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    label: {
      type: String,
      enum: ["home", "work", "other"],
      default: "home",
    },
    addressText: {
      type: String,
      required: true,
      minlength: 10,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Only one default address per user
addressSchema.index({ userId: 1, isDefault: 1 });

module.exports = mongoose.model("Address", addressSchema);
