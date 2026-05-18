const express = require("express");
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart, // Hard delete only
  syncGuestCart,
  clearCart,
} = require("../controllers/cart.controller");
const user = require("../middlewares/user.middleware");

router.use(user); // All cart routes require login and 'user' role

router.get("/", getCart);
router.post("/", addToCart);
router.put("/:itemId", updateCartItem);
router.delete("/:itemId", removeFromCart);
router.delete("/", clearCart);
router.post("/sync", syncGuestCart); // Merge guest cart on login

module.exports = router;
