const mongoose = require("mongoose");
const Order = require("./models/order.model");

async function checkOrders() {
  try {
    await mongoose.connect("mongodb://localhost:27017/e-commerce"); // Adjust if DB name is different
    const count = await Order.countDocuments();
    const statuses = await Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    console.log("Total Orders:", count);
    console.log("Statuses:", JSON.stringify(statuses, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkOrders();
