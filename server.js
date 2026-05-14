require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const app = express();
const path = require("path");
const cookieParser = require("cookie-parser");

// connect database
connectDB();

// middlewares
app.use(
  cors({
    origin: ["http://localhost:4200", "http://localhost:3000"],
    credentials: true,
  })
);
app.use(express.json());

// test route
app.get("/", (req, res) => {
  res.send("Casual Fashion API is running...");
});

app.use(cookieParser());
// routes
app.use("/api/v1/auth", require("./routes/auth.routes"));
app.use("/api/v1/products", require("./routes/product.routes"));
app.use("/api/v1/cart", require("./routes/cart.routes"));
app.use("/api/v1/orders", require("./routes/order.routes"));
app.use("/api/v1/testimonials", require("./routes/testimonial.routes"));
app.use("/api/v1/admin", require("./routes/admin.routes"));
app.use("/api/v1/refunds", require("./routes/refund.routes"));
app.use("/api/v1/addresses", require("./routes/address.routes"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global Error Handler
const globalErrorHandler = require("./middlewares/globalErrorHandler");
app.use(globalErrorHandler);

// start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
