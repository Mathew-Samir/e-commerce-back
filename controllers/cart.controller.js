const CartItem = require("../models/cart.model");
const Product = require("../models/product.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// @desc    Get current user's cart
// @route   GET /api/v1/cart
// @access  Private
exports.getCart = catchAsync(async (req, res, next) => {
  const items = await CartItem.find({ userId: req.user.id }).populate("productId");

  // Check for price changes
  const updatedItems = await Promise.all(items.map(async (item) => {
    if (item.productId && item.productId.price !== item.price) {
      item.isPriceChanged = true;
      await item.save();
    }
    return item;
  }));

  res.json({ success: true, data: updatedItems });
});

// @desc    Add product to cart
// @route   POST /api/v1/cart
// @access  Private
exports.addToCart = catchAsync(async (req, res, next) => {
  const { productId, quantity } = req.body;

  const product = await Product.findById(productId);
  if (!product || product.isDeleted || !product.isActive) {
    return next(new AppError("Product not found or unavailable", 404));
  }

  if (product.stock < quantity) {
    return next(new AppError("Insufficient stock", 400));
  }

  let cartItem = await CartItem.findOne({ userId: req.user.id, productId });

  if (cartItem) {
    cartItem.quantity += Number(quantity);
    cartItem.totalPrice = cartItem.quantity * cartItem.price;
  } else {
    cartItem = new CartItem({
      userId: req.user.id,
      productId,
      title: product.name,
      quantity: Number(quantity),
      price: product.price,
      totalPrice: Number(quantity) * product.price,
    });
  }

  await cartItem.save();
  res.status(200).json({ success: true, message: "Product added to cart", data: cartItem });
});

// @desc    Update cart item quantity
// @route   PUT /api/v1/cart/:itemId
// @access  Private
exports.updateCartItem = catchAsync(async (req, res, next) => {
  const { quantity } = req.body;
  const cartItem = await CartItem.findOne({ _id: req.params.itemId, userId: req.user.id });

  if (!cartItem) {
    return next(new AppError("Cart item not found", 404));
  }

  cartItem.quantity = Number(quantity);
  cartItem.totalPrice = cartItem.quantity * cartItem.price;

  await cartItem.save();
  res.json({ success: true, message: "Cart updated", data: cartItem });
});

// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/:itemId
// @access  Private
exports.removeFromCart = catchAsync(async (req, res, next) => {
  const cartItem = await CartItem.findOneAndDelete({ _id: req.params.itemId, userId: req.user.id });

  if (!cartItem) {
    return next(new AppError("Cart item not found", 404));
  }

  res.json({ success: true, message: "Item removed from cart" });
});

// @desc    Sync guest cart with user cart on login
// @route   POST /api/v1/cart/sync
// @access  Private
exports.syncGuestCart = catchAsync(async (req, res, next) => {
  const { guestItems } = req.body;

  if (!Array.isArray(guestItems)) {
    return next(new AppError("Invalid guest items. Expected an array.", 400));
  }

  for (const item of guestItems) {
    const product = await Product.findById(item.productId);
    if (!product || product.isDeleted || !product.isActive) continue;

    let cartItem = await CartItem.findOne({ userId: req.user.id, productId: item.productId });

    if (cartItem) {
      cartItem.quantity = Math.min(cartItem.quantity + Number(item.quantity), product.stock);
      cartItem.totalPrice = cartItem.quantity * cartItem.price;
    } else {
      const finalQty = Math.min(Number(item.quantity), product.stock);
      if (finalQty > 0) {
        cartItem = new CartItem({
          userId: req.user.id,
          productId: item.productId,
          title: product.name,
          quantity: finalQty,
          price: product.price,
          totalPrice: finalQty * product.price,
        });
      } else {
        continue;
      }
    }
    await cartItem.save();
  }

  const updatedCart = await CartItem.find({ userId: req.user.id }).populate("productId");
  res.json({ success: true, message: "Cart synced", data: updatedCart });
});
