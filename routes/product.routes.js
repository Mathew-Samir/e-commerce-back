const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload.middleware");
const protect = require("../middlewares/auth.middleware");
const admin = require("../middlewares/admin.middleware");
const {
  getProducts,
  getProductById,
  getNewArrivals,
  getBestSellers,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductActive,
} = require("../controllers/product.controller");

// Public
router.get("/", getProducts);
router.get("/new-arrivals", getNewArrivals);
router.get("/best-sellers", getBestSellers);
router.get("/:id", getProductById);
router.get("/:id/related", getRelatedProducts);

// Admin
router.post("/", protect, admin, upload.single("image"), createProduct);
router.put("/:id", protect, admin, upload.single("image"), updateProduct);
router.delete("/:id", protect, admin, deleteProduct);
router.patch("/:id/toggle-active", protect, admin, toggleProductActive);

module.exports = router;
