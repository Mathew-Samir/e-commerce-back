const mongoose = require("mongoose");
const User = require("../models/user.model");

async function getUsers() {
  try {
    await mongoose.connect("mongodb://localhost:27017/e-commerce");
    const users = await User.find({}, { name: 1, mobile: 1, role: 1 });
    console.log("Users found in database:");
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

getUsers();
