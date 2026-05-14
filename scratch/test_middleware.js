const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ message: "No token" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, "test_secret");
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// Mock req, res, next
const req = { headers: {} };
const res = { 
  status: function(code) { this.statusCode = code; return this; }, 
  json: function(data) { this.data = data; return this; } 
};
const next = () => { console.log("Next called"); };

console.log("Testing with no header:");
authMiddleware(req, res, next);
console.log("Status:", res.statusCode, "Data:", res.data);

console.log("\nTesting with invalid token:");
req.headers.authorization = "Bearer invalid";
authMiddleware(req, res, next);
console.log("Status:", res.statusCode, "Data:", res.data);
