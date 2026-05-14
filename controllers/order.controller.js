const Order = require("../models/order.model");
const CartItem = require("../models/cart.model");
const Product = require("../models/product.model");
const mongoose = require("mongoose");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// @desc    Place a new order
// @route   POST /api/v1/orders
// @access  Private
exports.placeOrder = catchAsync(async (req, res, next) => {

  try {
    const { address, phoneNumber } = req.body;

    // 1. Fetch active cart items (not price changed)
    const cartItems = await CartItem.find({
      userId: req.user._id,
      isPriceChanged: false,
    }).populate("productId");

    if (cartItems.length === 0) {
      return next(new AppError("Cart is empty or contains only items with price changes. Please review your cart.", 400));
    }

    let totalOrderPrice = 0;
    const orderProducts = [];

    // 2. Validate stock and prepare order products
    for (const item of cartItems) {
      const product = item.productId;

      if (!product || product.isDeleted || !product.isActive) {
        throw new AppError(`Product ${item.productId} is no longer available.`, 400);
      }

      if (product.stock < item.quantity) {
        throw new AppError(`Insufficient stock for product: ${product.name}`, 400);
      }

      // Snapshot product info
      orderProducts.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      });

      totalOrderPrice += product.price * item.quantity;

      // 3. Decrement stock & Increment salesCount
      product.stock -= item.quantity;
      product.salesCount = (product.salesCount || 0) + item.quantity;
      await product.save();
    }

    // 4. Create Order
    const order = await Order.create(
      [
        {
          userId: req.user._id,
          address,
          phoneNumber,
          totalPrice: totalOrderPrice,
          products: orderProducts,
        },
      ]
    );

    // 5. Clear active cart items
    await CartItem.deleteMany(
      { userId: req.user._id, isPriceChanged: false }
    );



    res.status(201).json({
      success: true,
      data: order[0],
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get logged in user orders
// @route   GET /api/v1/orders/my-orders
// @access  Private
exports.getMyOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ userId: req.user._id }).sort("-createdAt");

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders,
  });
});

// @desc    Get order by ID
// @route   GET /api/v1/orders/:id
// @access  Private
exports.getOrderById = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  // Check ownership
  if (order.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    return next(new AppError("Not authorized to access this order", 403));
  }

  res.status(200).json({
    success: true,
    data: order,
  });
});

// @desc    Cancel order by user
// @route   PUT /api/v1/orders/:id/cancel
// @access  Private
exports.cancelOrderByUser = catchAsync(async (req, res, next) => {

  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    // Check ownership
    if (order.userId.toString() !== req.user._id.toString()) {
      return next(new AppError("Not authorized to cancel this order", 403));
    }

    // Check if status is pending or preparing
    if (!order.canBeCancelledByUser()) {
      return next(new AppError("Order cannot be cancelled in its current status.", 400));
    }

    // 1. Update status
    order.status = "cancelledByUser";
    await order.save();

    // 2. Restore stock
    for (const item of order.products) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock += item.quantity;
        product.salesCount = Math.max(0, (product.salesCount || 0) - item.quantity);
        await product.save();
      }
    }



    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
});
