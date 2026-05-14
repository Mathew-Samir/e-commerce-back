const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number, // Snapshot of price when added
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    isPriceChanged: {
      type: Boolean,
      default: false, // True if product price changed after adding
    },
  },
  { timestamps: true },
);

// Prevent duplicate product in cart
cartItemSchema.index({ userId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model("CartItem", cartItemSchema);
