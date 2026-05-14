const express = require("express");
const {
  submitTestimonial,
  getApprovedTestimonials,
  getMyTestimonial,
  getTestimonials,
  markAsViewed,
} = require("../controllers/testimonial.controller");
const user = require("../middlewares/user.middleware");
const admin = require("../middlewares/admin.middleware");

const router = express.Router();

router.get("/", getApprovedTestimonials);
router.post("/", user, submitTestimonial);
router.get("/my", user, getMyTestimonial);
router.patch("/:id/view", user, markAsViewed);
router.get("/admin", admin, getTestimonials);

module.exports = router;
