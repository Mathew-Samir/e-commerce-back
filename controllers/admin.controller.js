const Order = require("../models/order.model");
const Product = require("../models/product.model");
const User = require("../models/user.model");
const Testimonial = require("../models/testimonial.model");
const Refund = require("../models/refund.model");
const Category = require("../models/category.model");
const Subcategory = require("../models/subcategory.model");
const mongoose = require("mongoose");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// @desc    Get Admin Dashboard Stats (KPIs)
// @route   GET /api/v1/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = catchAsync(async (req, res, next) => {
  const totalOrders = await Order.countDocuments();
  const pendingOrders = await Order.countDocuments({ status: "pending" });
  const totalUsers = await User.countDocuments({ role: "user" });
  const lowStockProducts = await Product.countDocuments({
    stock: { $lte: 3 },
    isDeleted: false,
  });

  // Calculate total revenue from 'received' or 'shipped' orders
  const revenueData = await Order.aggregate([
    { $match: { status: { $in: ["received", "shipped"] } } },
    { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } },
  ]);

  const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

  res.status(200).json({
    success: true,
    data: {
      totalRevenue,
      totalOrders,
      pendingOrders,
      totalUsers,
      lowStockProducts,
    },
  });
});

// @desc    Get all orders (with filters)
// @route   GET /api/v1/admin/orders
// @access  Private/Admin
exports.getAllOrders = catchAsync(async (req, res, next) => {
  const { status, startDate, endDate, mobile } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const orders = await Order.find(filter)
    .populate("userId", "name mobile")
    .sort("-createdAt");

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders,
  });
});

// @desc    Update order status
// @route   PUT /api/v1/admin/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = catchAsync(async (req, res, next) => {

  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    const oldStatus = order.status;

    // 1. Update order status
    order.status = status;
    await order.save();

    // 2. Restore stock if status changed to 'cancelledByAdmin' from a non-cancelled status
    if (status === "cancelledByAdmin" && !["cancelledByUser", "cancelledByAdmin", "refunded"].includes(oldStatus)) {
      for (const item of order.products) {
        const product = await Product.findById(item.productId);
        if (product) {
          product.stock += item.quantity;
          product.salesCount = Math.max(0, (product.salesCount || 0) - item.quantity);
          await product.save();
        }
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

// @desc    Process Refund (Approve/Reject)
// @route   PUT /api/v1/admin/refunds/:id/process
// @access  Private/Admin
exports.processRefund = catchAsync(async (req, res, next) => {

  try {
    const { status, adminNote } = req.body;
    const refund = await Refund.findById(req.params.id);

    if (!refund) {
      return next(new AppError("Refund request not found", 404));
    }

    if (refund.status !== "pending") {
      return next(new AppError("Refund already processed", 400));
    }

    // Update refund status
    refund.status = status;
    refund.adminResponse = adminNote;
    await refund.save();

    if (status === "approved") {
      // 1. Update Order status
      await Order.findByIdAndUpdate(
        refund.orderId,
        { status: "refunded" }
      );

      // 2. Restore Stock
      for (const item of refund.products) {
        const product = await Product.findById(item.productId);
        if (product) {
          product.stock += item.quantity;
          product.salesCount = Math.max(0, (product.salesCount || 0) - item.quantity);
          await product.save();
        }
      }
    }



    res.status(200).json({
      success: true,
      data: refund,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Approve/Refuse Testimonial
// @route   PUT /api/v1/admin/testimonials/:id/status
// @access  Private/Admin
exports.updateTestimonialStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const testimonial = await Testimonial.findByIdAndUpdate(
    req.params.id,
    {
      status,
      isApproved: status === "approved",
    },
    { new: true, runValidators: true }
  );

  if (!testimonial) {
    return next(new AppError("Testimonial not found", 404));
  }

  res.status(200).json({
    success: true,
    data: testimonial,
  });
});

// @desc    Get Sales Report
// @route   GET /api/v1/admin/reports/sales
// @access  Private/Admin
exports.getSalesReport = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const filter = {};

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  // 1. Summary stats
  const stats = await Order.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalPrice" },
        totalOrders: { $sum: 1 },
        avgOrderValue: { $avg: "$totalPrice" },
      },
    },
  ]);

  // 2. Units sold per product (Top products)
  const topProducts = await Order.aggregate([
    { $match: filter },
    { $unwind: "$products" },
    {
      $group: {
        _id: "$products.productId",
        name: { $first: "$products.name" },
        unitsSold: { $sum: "$products.quantity" },
        revenue: { $sum: { $multiply: ["$products.price", "$products.quantity"] } },
      },
    },
    { $sort: { unitsSold: -1 } },
    { $limit: 10 },
  ]);

  // 3. Status breakdown (All orders in date range)
  const breakdownFilter = {};
  if (startDate || endDate) {
    breakdownFilter.createdAt = filter.createdAt;
  }

  const statusBreakdown = await Order.aggregate([
    { $match: breakdownFilter },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      summary: stats[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 },
      topProducts,
      statusBreakdown,
    },
  });
});

// @desc    Manage Categories
exports.createCategory = catchAsync(async (req, res, next) => {
  const category = await Category.create(req.body);
  res.status(201).json({ success: true, data: category });
});

exports.getCategories = catchAsync(async (req, res, next) => {
  const categories = await Category.find({ isDeleted: false });
  res.status(200).json({ success: true, data: categories });
});

exports.updateCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!category) return next(new AppError("Category not found", 404));
  res.status(200).json({ success: true, data: category });
});

exports.deleteCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findByIdAndUpdate(req.params.id, { isDeleted: true });
  if (!category) return next(new AppError("Category not found", 404));

  await Subcategory.updateMany({ categoryId: req.params.id }, { isDeleted: true });
  await Product.updateMany({ categoryId: req.params.id }, { isActive: false });

  res.status(200).json({ success: true, data: {} });
});

exports.toggleCategoryActive = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  if (!category) return next(new AppError("Category not found", 404));

  category.isActive = !category.isActive;
  await category.save();

  if (!category.isActive) {
    await Subcategory.updateMany({ categoryId: req.params.id }, { isActive: false });
    await Product.updateMany({ categoryId: req.params.id }, { isActive: false });
  }

  res.status(200).json({ success: true, data: category });
});

// @desc    Manage Subcategories
exports.createSubcategory = catchAsync(async (req, res, next) => {
  const subcategory = await Subcategory.create(req.body);
  res.status(201).json({ success: true, data: subcategory });
});

exports.getSubcategories = catchAsync(async (req, res, next) => {
  const filter = { isDeleted: false };
  if (req.query.categoryId) filter.categoryId = req.query.categoryId;
  const subcategories = await Subcategory.find(filter).populate("categoryId", "title");
  res.status(200).json({ success: true, data: subcategories });
});

exports.updateSubcategory = catchAsync(async (req, res, next) => {
  const subcategory = await Subcategory.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!subcategory) return next(new AppError("Subcategory not found", 404));
  res.status(200).json({ success: true, data: subcategory });
});

exports.deleteSubcategory = catchAsync(async (req, res, next) => {
  const subcategory = await Subcategory.findByIdAndUpdate(req.params.id, { isDeleted: true });
  if (!subcategory) return next(new AppError("Subcategory not found", 404));

  await Product.updateMany({ subCategoryId: req.params.id }, { isActive: false });

  res.status(200).json({ success: true, data: {} });
});

exports.toggleSubcategoryActive = catchAsync(async (req, res, next) => {
  const subcategory = await Subcategory.findById(req.params.id);
  if (!subcategory) return next(new AppError("Subcategory not found", 404));

  subcategory.isActive = !subcategory.isActive;
  await subcategory.save();

  if (!subcategory.isActive) {
    await Product.updateMany({ subCategoryId: req.params.id }, { isActive: false });
  }

  res.status(200).json({ success: true, data: subcategory });
});

// @desc    Export Sales Report
exports.exportSalesReport = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const filter = {};

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const orders = await Order.find(filter)
    .populate("userId", "name mobile")
    .select("totalPrice status createdAt products userId address phoneNumber")
    .sort("-createdAt");

  const flatData = orders.map(order => ({
    orderId: order._id,
    customer: order.userId ? order.userId.name : "Guest",
    mobile: order.phoneNumber || (order.userId ? order.userId.mobile : "N/A"),
    address: order.address,
    date: order.createdAt.toISOString().split("T")[0],
    total: order.totalPrice,
    status: order.status,
    productCount: order.products.length,
    productNames: order.products.map(p => `${p.name} (x${p.quantity})`).join(", ")
  }));

  res.status(200).json({
    success: true,
    data: flatData,
  });
});
