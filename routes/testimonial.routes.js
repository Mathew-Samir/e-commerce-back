const express = require("express");
const {
  submitTestimonial,
  getApprovedTestimonials,
  getMyTestimonial,
  getTestimonials,
  markAsViewed,
  approveTestimonial,
  rejectTestimonial,
  deleteTestimonial,
} = require("../controllers/testimonial.controller");
const user = require("../middlewares/user.middleware");
const admin = require("../middlewares/admin.middleware");

const router = express.Router();

router.get("/", getApprovedTestimonials);
router.post("/", user, submitTestimonial);
router.get("/my", user, getMyTestimonial);
router.patch("/:id/view", user, markAsViewed);

// Admin routes
router.get("/admin", admin, getTestimonials);
router.patch("/admin/:id/approve", admin, approveTestimonial);
router.patch("/admin/:id/reject", admin, rejectTestimonial);
router.delete("/admin/:id", admin, deleteTestimonial);

module.exports = router;
