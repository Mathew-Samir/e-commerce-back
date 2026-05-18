const Refund = require("../models/refund.model");
const Order = require("../models/order.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// @desc    Request a refund
// @route   POST /api/v1/refunds
// @access  Private
exports.requestRefund = catchAsync(async (req, res, next) => {
  const { orderId, reason, products } = req.body;

  // 1. Check if order exists and belongs to user
  const order = await Order.findOne({ _id: orderId, userId: req.user.id });
  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  // 2. Check if eligible (shipped or received)
  if (!order.isEligibleForRefund()) {
    return next(new AppError("Order is not eligible for refund. Only shipped or received orders can be refunded.", 400));
  }

  // 3. Prevent duplicate requests
  const existing = await Refund.findOne({ orderId });
  if (existing) {
    return next(new AppError("A refund request already exists for this order.", 400));
  }

  // 4. Create refund request
  const refund = await Refund.create({
    orderId,
    userId: req.user.id,
    products: products || order.products, // Default to all products if not specified
    reason,
    refundedAmount: order.totalPrice, // Default to full price
  });

  res.status(201).json({ success: true, data: refund });
});

// @desc    Get my refund requests
// @route   GET /api/v1/refunds/my
// @access  Private
exports.getMyRefunds = catchAsync(async (req, res, next) => {
  const refunds = await Refund.find({ userId: req.user.id }).sort("-createdAt");
  res.status(200).json({ success: true, count: refunds.length, data: refunds });
});

// @desc    Get all refund requests (Admin)
// @route   GET /api/v1/refunds
// @access  Private/Admin
exports.getAllRefunds = catchAsync(async (req, res, next) => {
  const refunds = await Refund.find()
    .populate("userId", "name email")
    .populate("orderId", "_id status totalPrice")
    .sort("-createdAt");
  res.status(200).json({ success: true, count: refunds.length, data: refunds });
});

// @desc    Approve refund request
// @route   PATCH /api/v1/refunds/:id/approve
// @access  Private/Admin
exports.approveRefund = catchAsync(async (req, res, next) => {
  const refund = await Refund.findById(req.params.id);
  if (!refund) return next(new AppError("Refund request not found", 404));

  refund.status = "approved";
  await refund.save();

  // Also update order status to 'refunded'
  await Order.findByIdAndUpdate(refund.orderId, { status: "refunded" });

  res.status(200).json({ success: true, data: refund });
});

// @desc    Refuse refund request
// @route   PATCH /api/v1/refunds/:id/refuse
// @access  Private/Admin
exports.refuseRefund = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  const refund = await Refund.findById(req.params.id);
  if (!refund) return next(new AppError("Refund request not found", 404));

  refund.status = "rejected";
  if (reason) refund.adminResponse = reason;
  await refund.save();

  res.status(200).json({ success: true, data: refund });
});
