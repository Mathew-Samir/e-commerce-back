const express = require("express");
const { requestRefund, getMyRefunds } = require("../controllers/refund.controller");
const user = require("../middlewares/user.middleware");

const router = express.Router();

router.post("/", user, requestRefund);
router.get("/my", user, getMyRefunds);

module.exports = router;
