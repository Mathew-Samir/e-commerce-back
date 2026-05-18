const express = require("express");
const {
  getDashboardStats,
  getAllOrders,
  updateOrderStatus,
  processRefund,
  updateTestimonialStatus,
  getSalesReport,
  exportSalesReport,
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  toggleCategoryActive,
  createSubcategory,
  getSubcategories,
  updateSubcategory,
  deleteSubcategory,
  toggleSubcategoryActive,
} = require("../controllers/admin.controller");
const {
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  toggleCollectionActive,
} = require("../controllers/collection.controller");
const { getTestimonials } = require("../controllers/testimonial.controller");
const admin = require("../middlewares/admin.middleware");

const router = express.Router();

router.use(admin);

router.get("/dashboard", getDashboardStats);
router.get("/orders", getAllOrders);
router.put("/orders/:id/status", updateOrderStatus);
router.put("/refunds/:id/process", processRefund);
router.get("/testimonials", getTestimonials);
router.put("/testimonials/:id/status", updateTestimonialStatus);
router.get("/reports/sales", getSalesReport);
router.get("/reports/sales/export", exportSalesReport);

router.route("/categories").post(createCategory).get(getCategories);
router.route("/categories/:id").put(updateCategory).delete(deleteCategory);
router.patch("/categories/:id/toggle-active", toggleCategoryActive);

router.route("/subcategories").post(createSubcategory).get(getSubcategories);
router.route("/subcategories/:id").put(updateSubcategory).delete(deleteSubcategory);
router.patch("/subcategories/:id/toggle-active", toggleSubcategoryActive);

router.route("/collections").post(createCollection).get(getCollections);
router.route("/collections/:id").put(updateCollection).delete(deleteCollection);
router.patch("/collections/:id/toggle-active", toggleCollectionActive);

module.exports = router;

