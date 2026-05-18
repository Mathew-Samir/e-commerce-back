const Product = require("../models/product.model");
const Category = require("../models/category.model");
const Subcategory = require("../models/subcategory.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// ============ PUBLIC ROUTES ============

// @desc    Get products with filters, search, sort, pagination
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = catchAsync(async (req, res, next) => {
  const {
    category,
    subcategory,
    minPrice,
    maxPrice,
    search,
    sort = "newest",
    page = 1,
    limit = 20,
  } = req.query;

  // Base filter: only active & not deleted
  const filter = { isActive: true, isDeleted: false };

  if (category) filter.categoryId = category;
  if (subcategory) filter.subCategoryId = subcategory;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  // Sorting
  const sortOptions = {
    newest: { createdAt: -1 },
    "price-asc": { price: 1 },
    "price-desc": { price: -1 },
    "name-asc": { name: 1 },
    "name-desc": { name: -1 },
  };
  const sortQuery = sortOptions[sort] || sortOptions.newest;

  // Pagination
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("categoryId", "title")
      .populate("subCategoryId", "title")
      .populate("collectionId", "name title")
      .sort(sortQuery)
      .skip(skip)
      .limit(Number(limit)),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    count: products.length,
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
    totalProducts: total,
    data: products,
  });
});

// @desc    Get single product by ID
// @route   GET /api/v1/products/:id
// @access  Public
exports.getProductById = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .populate("categoryId", "title")
    .populate("subCategoryId", "title")
    .populate("collectionId", "name title");

  if (!product || product.isDeleted || !product.isActive) {
    return next(new AppError("Product not found", 404));
  }

  res.json({ success: true, data: product });
});

// @desc    Get new arrivals
// @route   GET /api/v1/products/new-arrivals
// @access  Public
exports.getNewArrivals = catchAsync(async (req, res, next) => {
  const { category, subcategory, limit = 10 } = req.query;
  
  const filter = { isActive: true, isDeleted: false };
  if (category) filter.categoryId = category;
  if (subcategory) filter.subCategoryId = subcategory;

  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .populate("categoryId", "title")
    .populate("subCategoryId", "title")
    .populate("collectionId", "name title");

  res.json({ success: true, count: products.length, data: products });
});

// @desc    Get best sellers
// @route   GET /api/v1/products/best-sellers
// @access  Public
exports.getBestSellers = catchAsync(async (req, res, next) => {
  const { category, subcategory, limit = 10 } = req.query;

  const filter = { isActive: true, isDeleted: false };
  if (category) filter.categoryId = category;
  if (subcategory) filter.subCategoryId = subcategory;

  const products = await Product.find(filter)
    .sort({ salesCount: -1 })
    .limit(Number(limit))
    .populate("categoryId", "title")
    .populate("subCategoryId", "title")
    .populate("collectionId", "name title");

  res.json({ success: true, count: products.length, data: products });
});

// ============ ADMIN ROUTES ============

// @desc    Create new product (with image upload)
// @route   POST /api/v1/products
// @access  Private/Admin
exports.createProduct = catchAsync(async (req, res, next) => {
  const { name, description, price, stock, categoryId, subCategoryId, collectionId } =
    req.body;

  if (!req.file) {
    return next(new AppError("Product image is required", 400));
  }

  // Validate category & subcategory exist & active
  const [cat, sub] = await Promise.all([
    Category.findById(categoryId),
    Subcategory.findById(subCategoryId),
  ]);

  if (!cat || cat.isDeleted || !cat.isActive) {
    return next(new AppError("Invalid or inactive category", 400));
  }
  if (
    !sub ||
    sub.isDeleted ||
    !sub.isActive ||
    sub.categoryId.toString() !== categoryId
  ) {
    return next(new AppError("Invalid or mismatched subcategory", 400));
  }

  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

  const productData = {
    name,
    description,
    price: Number(price),
    stock: Number(stock),
    categoryId,
    subCategoryId,
    image: imageUrl,
  };

  if (collectionId) {
    productData.collectionId = collectionId;
  }

  const product = await Product.create(productData);

  res.status(201).json({ success: true, message: "Product created", data: product });
});

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private/Admin
exports.updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError("Product not found", 404));

  const updateData = { ...req.body };
  if (req.file) {
    updateData.image = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  }

  Object.assign(product, updateData);
  await product.save();

  res.json({ success: true, message: "Product updated", data: product });
});

// @desc    Soft delete product
// @route   DELETE /api/v1/products/:id
// @access  Private/Admin
exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true },
    { new: true },
  );
  if (!product) return next(new AppError("Product not found", 404));

  res.json({ success: true, message: "Product soft-deleted", data: product });
});

// @desc    Toggle product active/inactive (seasonal)
// @route   PATCH /api/v1/products/:id/toggle-active
// @access  Private/Admin
exports.toggleProductActive = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError("Product not found", 404));

  product.isActive = !product.isActive;
  await product.save();

  res.json({
    success: true,
    message: `Product ${product.isActive ? "activated" : "deactivated"}`,
    data: { id: product._id, isActive: product.isActive },
  });
});

// @desc    Get related products
// @route   GET /api/v1/products/:id/related
// @access  Public
exports.getRelatedProducts = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError("Product not found", 404));

  // Find products in same subcategory or category
  const related = await Product.find({
    _id: { $ne: product._id },
    isActive: true,
    isDeleted: false,
    $or: [
      { subCategoryId: product.subCategoryId },
      { categoryId: product.categoryId }
    ]
  })
  .limit(10)
  .populate("categoryId", "title")
  .populate("subCategoryId", "title")
  .populate("collectionId", "name title");

  res.json({ success: true, count: related.length, data: related });
});
