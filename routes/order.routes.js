const express = require("express");
const protect = require("../middlewares/auth.middleware.js");
const {
  placeOrder,
  getMyOrders,
  getOrderById,
  cancelOrderByUser,
} = require("../controllers/order.controller");
const user = require("../middlewares/user.middleware");

const router = express.Router();

router.use(user);

router.post("/", placeOrder);
router.get("/my-orders", protect, getMyOrders);
router.get("/:id", getOrderById);
router.put("/:id/cancel", cancelOrderByUser);

module.exports = router;
