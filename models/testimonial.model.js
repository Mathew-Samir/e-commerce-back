const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    comment: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 500,
    },
    stars: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "refused"],
      default: "pending",
    },
    isUserViewed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Index for filtering & admin panel
testimonialSchema.index({ status: 1, createdAt: -1 });
testimonialSchema.index({ stars: 1, isApproved: 1 });

// One pending/approved testimonial per user (prevent spam)
testimonialSchema.index(
  { userId: 1, status: 1 },
  { partialFilterExpression: { status: { $in: ["pending", "approved"] } } },
);

module.exports = mongoose.model("Testimonial", testimonialSchema);
