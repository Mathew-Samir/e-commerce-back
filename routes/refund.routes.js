const express = require("express");
const { 
  requestRefund, 
  getMyRefunds, 
  getAllRefunds, 
  approveRefund, 
  refuseRefund 
} = require("../controllers/refund.controller");
const user = require("../middlewares/user.middleware");
const admin = require("../middlewares/admin.middleware");

const router = express.Router();

router.post("/", user, requestRefund);
router.get("/my", user, getMyRefunds);

// Admin routes
router.get("/", admin, getAllRefunds);
router.patch("/:id/approve", admin, approveRefund);
router.patch("/:id/refuse", admin, refuseRefund);

module.exports = router;
