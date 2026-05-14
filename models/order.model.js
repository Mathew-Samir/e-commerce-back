const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    address: {
      type: String, // Snapshot as plain text
      required: true,
    },
    phoneNumber: {
      type: String, // Can differ from user's mobile
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "preparing",
        "shipped",
        "cancelledByUser",
        "cancelledByAdmin",
        "refused",
        "received",
        "refunded",
      ],
      default: "pending",
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        name: String, // Snapshot
        price: Number, // Snapshot
        quantity: Number,
      },
    ],
  },
  { timestamps: true },
);

// ============ Indexes for faster queries ============
orderSchema.index({ userId: 1, createdAt: -1 }); // User order history
orderSchema.index({ status: 1, createdAt: -1 }); // Admin filtering & reports

// ============ Instance Methods ============

/**
 * Check if order is eligible for refund request
 * @returns {Boolean} true if status is 'shipped' or 'received'
 */
orderSchema.methods.isEligibleForRefund = function () {
  return ["shipped", "received"].includes(this.status);
};

/**
 * Check if order can be cancelled by user
 * @returns {Boolean} true if status is 'pending' or 'preparing'
 */
orderSchema.methods.canBeCancelledByUser = function () {
  return ["pending", "preparing"].includes(this.status);
};

// ============ Static Methods (optional utility) ============

/**
 * Get orders eligible for refund by user ID
 * @param {String} userId - The user's ID
 * @returns {Promise<Array>} Array of eligible orders
 */
orderSchema.statics.getEligibleForRefund = async function (userId) {
  return await this.find({
    userId,
    status: { $in: ["shipped", "received"] },
  });
};

module.exports = mongoose.model("Order", orderSchema);
