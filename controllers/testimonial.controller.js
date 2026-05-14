const Testimonial = require("../models/testimonial.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// @desc    Submit a testimonial
// @route   POST /api/v1/testimonials
// @access  Private
exports.submitTestimonial = catchAsync(async (req, res, next) => {
  const { comment, stars } = req.body;

  // Check if user already has a pending or approved testimonial
  const existing = await Testimonial.findOne({
    userId: req.user._id,
    status: { $in: ["pending", "approved"] },
  });
  // if (existing) {
  //   return next(
  //     new AppError("You already have a pending or approved testimonial.", 400),
  //   );
  // }

  const testimonial = await Testimonial.create({
    userId: req.user._id,
    comment,
    stars,
  });

  res.status(201).json({
    success: true,
    data: testimonial,
  });
});

// @desc    Get all approved testimonials (for homepage)
// @route   GET /api/v1/testimonials
// @access  Public
exports.getApprovedTestimonials = catchAsync(async (req, res, next) => {
  const testimonials = await Testimonial.find({ status: "approved" })
    .populate("userId", "name")
    .sort("-createdAt");

  res.status(200).json({
    success: true,
    count: testimonials.length,
    data: testimonials,
  });
});

// @desc    Get my testimonial
// @route   GET /api/v1/testimonials/my
// @access  Private
exports.getMyTestimonial = catchAsync(async (req, res, next) => {
  const testimonial = await Testimonial.findOne({ userId: req.user._id });

  res.status(200).json({
    success: true,
    data: testimonial,
  });
});

// @desc    Get all testimonials (with filters for Admin)
// @route   GET /api/v1/testimonials/admin
// @access  Private/Admin
exports.getTestimonials = catchAsync(async (req, res, next) => {
  const { status, stars, startDate, endDate } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (stars) filter.stars = Number(stars);

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const testimonials = await Testimonial.find(filter)
    .populate("userId", "name mobile")
    .sort("-createdAt");

  res.status(200).json({
    success: true,
    count: testimonials.length,
    data: testimonials,
  });
});

// @desc    Mark testimonial as viewed by user
// @route   PATCH /api/v1/testimonials/:id/view
// @access  Private
exports.markAsViewed = catchAsync(async (req, res, next) => {
  const testimonial = await Testimonial.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isUserViewed: true },
    { new: true },
  );

  if (!testimonial) {
    return next(new AppError("Testimonial not found", 404));
  }

  res.status(200).json({ success: true, data: testimonial });
});
