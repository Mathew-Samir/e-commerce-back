const Collection = require("../models/collection.model");
const Product = require("../models/product.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// ============ PUBLIC ROUTES ============

// @desc    Get currently active collections (within date range + isActive)
// @route   GET /api/v1/collections/active
// @access  Public
exports.getActiveCollections = catchAsync(async (req, res, next) => {
  const now = new Date();

  const collections = await Collection.find({
    isActive: true,
    isDeleted: false,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).sort({ startDate: -1 });

  res.json({ success: true, count: collections.length, data: collections });
});

// @desc    Get products belonging to currently active collections
// @route   GET /api/v1/collections/seasonal-products
// @access  Public
exports.getSeasonalProducts = catchAsync(async (req, res, next) => {
  const { limit = 20 } = req.query;
  const now = new Date();

  // Find all currently active collections
  const activeCollections = await Collection.find({
    isActive: true,
    isDeleted: false,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).select("_id");

  const collectionIds = activeCollections.map((c) => c._id);

  if (collectionIds.length === 0) {
    return res.json({ success: true, count: 0, data: [], collections: [] });
  }

  const products = await Product.find({
    collectionId: { $in: collectionIds },
    isActive: true,
    isDeleted: false,
  })
    .populate("categoryId", "title")
    .populate("subCategoryId", "title")
    .populate("collectionId", "name title bannerImage")
    .sort({ createdAt: -1 })
    .limit(Number(limit));

  // Return active collections metadata alongside products
  const collectionsWithBanners = await Collection.find({
    _id: { $in: collectionIds },
  }).select("name title bannerImage startDate endDate");

  res.json({
    success: true,
    count: products.length,
    data: products,
    collections: collectionsWithBanners,
  });
});

// @desc    Get products by specific collection slug
// @route   GET /api/v1/collections/:name/products
// @access  Public
exports.getCollectionProducts = catchAsync(async (req, res, next) => {
  const { limit = 20, page = 1 } = req.query;

  const collection = await Collection.findOne({
    name: req.params.name.toLowerCase(),
    isDeleted: false,
  });

  if (!collection) {
    return next(new AppError("Collection not found", 404));
  }

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find({
      collectionId: collection._id,
      isActive: true,
      isDeleted: false,
    })
      .populate("categoryId", "title")
      .populate("subCategoryId", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Product.countDocuments({
      collectionId: collection._id,
      isActive: true,
      isDeleted: false,
    }),
  ]);

  res.json({
    success: true,
    count: products.length,
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
    totalProducts: total,
    collection,
    data: products,
  });
});

// ============ ADMIN ROUTES ============

// @desc    Get all collections (admin)
// @route   GET /api/v1/admin/collections
// @access  Private/Admin
exports.getCollections = catchAsync(async (req, res, next) => {
  const collections = await Collection.find({ isDeleted: false }).sort({
    createdAt: -1,
  });

  res.json({ success: true, data: collections });
});

// @desc    Create collection
// @route   POST /api/v1/admin/collections
// @access  Private/Admin
exports.createCollection = catchAsync(async (req, res, next) => {
  console.log("=== CREATE COLLECTION DEBUG ===");
  console.log("req.body:", JSON.stringify(req.body, null, 2));
  const { name, title, startDate, endDate, isActive, bannerImage } = req.body;

  if (!name || !title || !startDate || !endDate) {
    console.log("VALIDATION FAILED - missing fields:", { name: !!name, title: !!title, startDate: !!startDate, endDate: !!endDate });
    return next(
      new AppError("Name, title, start date and end date are required", 400),
    );
  }

  if (new Date(endDate) <= new Date(startDate)) {
    return next(new AppError("End date must be after start date", 400));
  }

  const existing = await Collection.findOne({
    name: name.toLowerCase(),
    isDeleted: false,
  });
  if (existing) {
    return next(new AppError("A collection with this name already exists", 400));
  }

  const collectionData = {
    name: name.toLowerCase(),
    title,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    isActive: isActive !== undefined ? isActive : true,
  };

  if (bannerImage) {
    collectionData.bannerImage = bannerImage;
  }

  const collection = await Collection.create(collectionData);

  res.status(201).json({
    success: true,
    message: "Collection created",
    data: collection,
  });
});

// @desc    Update collection
// @route   PUT /api/v1/admin/collections/:id
// @access  Private/Admin
exports.updateCollection = catchAsync(async (req, res, next) => {
  const { name, title, startDate, endDate, isActive, bannerImage } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name.toLowerCase();
  if (title !== undefined) updateData.title = title;
  if (startDate !== undefined) updateData.startDate = new Date(startDate);
  if (endDate !== undefined) updateData.endDate = new Date(endDate);
  if (isActive !== undefined) updateData.isActive = isActive;
  if (bannerImage !== undefined) updateData.bannerImage = bannerImage;

  // Validate dates: need to check against existing doc if only one date is provided
  const existing = await Collection.findById(req.params.id);
  if (!existing) {
    return next(new AppError("Collection not found", 404));
  }

  const finalStart = updateData.startDate || existing.startDate;
  const finalEnd = updateData.endDate || existing.endDate;

  if (finalEnd <= finalStart) {
    return next(new AppError("End date must be after start date", 400));
  }

  const collection = await Collection.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true },
  );

  res.json({
    success: true,
    message: "Collection updated",
    data: collection,
  });
});

// @desc    Delete collection (soft delete)
// @route   DELETE /api/v1/admin/collections/:id
// @access  Private/Admin
exports.deleteCollection = catchAsync(async (req, res, next) => {
  const collection = await Collection.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true },
    { new: true },
  );

  if (!collection) {
    return next(new AppError("Collection not found", 404));
  }

  // Remove collection reference from products and deactivate them
  await Product.updateMany(
    { collectionId: req.params.id },
    {
      $unset: { collectionId: "" },
      $set: { isActive: false },
    },
  );

  res.json({
    success: true,
    message: "Collection deleted",
    data: {},
  });
});

// @desc    Toggle collection active/inactive
// @route   PATCH /api/v1/admin/collections/:id/toggle-active
// @access  Private/Admin
exports.toggleCollectionActive = catchAsync(async (req, res, next) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) {
    return next(new AppError("Collection not found", 404));
  }

  collection.isActive = !collection.isActive;
  await collection.save();

  res.json({
    success: true,
    message: `Collection ${collection.isActive ? "activated" : "deactivated"}`,
    data: collection,
  });
});
