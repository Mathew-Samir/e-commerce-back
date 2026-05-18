const express = require("express");
const router = express.Router();
const {
  getActiveCollections,
  getSeasonalProducts,
  getCollectionProducts,
} = require("../controllers/collection.controller");

// Public routes
router.get("/active", getActiveCollections);
router.get("/seasonal-products", getSeasonalProducts);
router.get("/:name/products", getCollectionProducts);

module.exports = router;
