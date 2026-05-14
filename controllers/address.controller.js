const Address = require("../models/address.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// @desc    Add new address
// @route   POST /api/v1/addresses
// @access  Private
exports.addAddress = catchAsync(async (req, res, next) => {
  const { label, addressText, isDefault } = req.body;

  // If this is the first address, make it default
  const addressCount = await Address.countDocuments({ userId: req.user._id });
  const setAsDefault = addressCount === 0 ? true : isDefault;

  // If setting as default, unset other default addresses
  if (setAsDefault) {
    await Address.updateMany(
      { userId: req.user._id },
      { $set: { isDefault: false } }
    );
  }

  const address = await Address.create({
    userId: req.user._id,
    label,
    addressText,
    isDefault: setAsDefault,
  });

  res.status(201).json({
    success: true,
    data: address,
  });
});

// @desc    Get all user addresses
// @route   GET /api/v1/addresses
// @access  Private
exports.getAddresses = catchAsync(async (req, res, next) => {
  const addresses = await Address.find({ userId: req.user._id });

  res.status(200).json({
    success: true,
    count: addresses.length,
    data: addresses,
  });
});

// @desc    Update address
// @route   PUT /api/v1/addresses/:id
// @access  Private
exports.updateAddress = catchAsync(async (req, res, next) => {
  let address = await Address.findById(req.params.id);

  if (!address) {
    return next(new AppError("Address not found", 404));
  }

  // Make sure user owns address
  if (address.userId.toString() !== req.user._id.toString()) {
    return next(new AppError("Not authorized to access this address", 403));
  }

  const { isDefault } = req.body;

  // If setting as default, unset other default addresses
  if (isDefault) {
    await Address.updateMany(
      { userId: req.user._id },
      { $set: { isDefault: false } }
    );
  }

  address = await Address.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: address,
  });
});

// @desc    Delete address
// @route   DELETE /api/v1/addresses/:id
// @access  Private
exports.deleteAddress = catchAsync(async (req, res, next) => {
  const address = await Address.findById(req.params.id);

  if (!address) {
    return next(new AppError("Address not found", 404));
  }

  // Make sure user owns address
  if (address.userId.toString() !== req.user._id.toString()) {
    return next(new AppError("Not authorized to delete this address", 403));
  }

  const wasDefault = address.isDefault;

  await address.deleteOne();

  // If deleted address was default, set another one as default if exists
  if (wasDefault) {
    const nextAddress = await Address.findOne({ userId: req.user._id });
    if (nextAddress) {
      nextAddress.isDefault = true;
      await nextAddress.save();
    }
  }

  res.status(200).json({
    success: true,
    data: {},
  });
});
