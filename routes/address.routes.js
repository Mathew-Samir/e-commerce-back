const express = require("express");
const {
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
} = require("../controllers/address.controller");
const user = require("../middlewares/user.middleware");

const router = express.Router();

router.use(user);

router.route("/").post(addAddress).get(getAddresses);
router.route("/:id").put(updateAddress).delete(deleteAddress);

module.exports = router;
