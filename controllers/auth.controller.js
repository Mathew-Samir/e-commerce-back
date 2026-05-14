const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/user.model");
const CartItem = require("../models/cart.model");
const Product = require("../models/product.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

exports.register = catchAsync(async (req, res, next) => {
  const { name, mobile, email, password, gender, emailConsent, termsAccepted } =
    req.body;

  if (!termsAccepted) {
    return next(
      new AppError(
        "You must accept the Terms and Conditions to register.",
        400,
      ),
    );
  }

  // check if mobile or email exists
  const existingMobile = await User.findOne({ mobile });
  if (existingMobile) {
    return next(new AppError("Mobile number already in use", 400));
  }

  if (email) {
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return next(
        new AppError("Email already associated with an account", 400),
      );
    }
  }

  const user = await User.create({
    name,
    mobile,
    email,
    password,
    gender,
    emailConsent: emailConsent || false,
    termsAccepted: true,
    termsAcceptedAt: Date.now(),
  });

  const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  // Set cookie
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  const newUser = await User.findById(user._id).select("-password");

  res.status(201).json({
    success: true,
    message: "User created",
    user: newUser,
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { mobile, password, guestCart } = req.body;

  // check user exists
  const user = await User.findOne({ mobile });
  if (!user) {
    return next(new AppError("Invalid mobile or password", 400));
  }

  // Check if account is locked
  if (user.lockUntil && user.lockUntil > Date.now()) {
    const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
    return next(
      new AppError(
        `Account is locked. Please try again in ${remainingTime} minutes.`,
        403,
      ),
    );
  }

  if (!user.isActive) {
    return next(new AppError("Your account has been suspended.", 403));
  }

  // check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= 5) {
      user.lockUntil = Date.now() + 15 * 60 * 1000;
      user.loginAttempts = 0;
    }
    await user.save();

    if (user.lockUntil && user.lockUntil > Date.now()) {
      return next(
        new AppError(
          "Too many failed attempts. Account locked for 15 minutes.",
          403,
        ),
      );
    }

    return next(new AppError("Invalid mobile or password", 400));
  }

  // Reset attempts on successful login
  user.loginAttempts = 0;
  user.lockUntil = undefined;

  // CART MERGE LOGIC (SRS Requirement: max(serverQty + guestQty, stock))
  if (guestCart && Array.isArray(guestCart)) {
    for (const item of guestCart) {
      const product = await Product.findById(item.productId);
      if (!product || product.isDeleted || !product.isActive) continue;

      let cartItem = await CartItem.findOne({
        userId: user._id,
        productId: item.productId,
      });

      if (cartItem) {
        cartItem.quantity = Math.min(
          cartItem.quantity + item.quantity,
          product.stock,
        );
        cartItem.totalPrice = cartItem.quantity * cartItem.price;
        await cartItem.save();
      } else {
        const finalQty = Math.min(item.quantity, product.stock);
        if (finalQty > 0) {
          await CartItem.create({
            userId: user._id,
            productId: item.productId,
            title: product.name,
            quantity: finalQty,
            price: product.price,
            totalPrice: product.price * finalQty,
          });
        }
      }
    }
  }

  const accessToken = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  // Set cookie
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  user.password = undefined;

  res.json({
    success: true,
    message: "Login success",
    user,
  });
});

exports.logout = catchAsync(async (req, res, next) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

exports.changePassword = catchAsync(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return next(
      new AppError("Please provide both old and new passwords.", 400),
    );
  }

  if (newPassword.length < 8) {
    return next(
      new AppError("New password must be at least 8 characters long.", 400),
    );
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError("User not found.", 404));
  }

  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) {
    return next(new AppError("Incorrect old password.", 400));
  }

  if (oldPassword === newPassword) {
    return next(
      new AppError("New password cannot be the same as the old password.", 400),
    );
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully.",
  });
});

exports.updateProfile = catchAsync(async (req, res, next) => {
  const { name, email, gender, emailConsent } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError("User not found", 404));

  if (email && email !== user.email) {
    const existing = await User.findOne({ email });
    if (existing) return next(new AppError("Email already in use", 400));
  }

  user.name = name || user.name;
  user.email = email || user.email;
  user.gender = gender || user.gender;
  if (emailConsent !== undefined) user.emailConsent = emailConsent;

  await user.save();

  res.status(200).json({
    success: true,
    data: user,
  });
});

exports.getProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("-password");
  res.status(200).json({
    success: true,
    data: user,
  });
});
