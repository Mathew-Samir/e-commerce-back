const NodeCache = require("node-cache");
const rateLimitCache = new NodeCache({ stdTTL: 900 }); // 15 mins default

const rateLimiter = (options) => {
  const { windowMs, max, message } = options;
  
  return (req, res, next) => {
    const key = req.ip + req.originalUrl;
    const requestCount = rateLimitCache.get(key) || 0;

    if (requestCount >= max) {
      return res.status(429).json({
        success: false,
        message: message || "Too many requests, please try again later.",
      });
    }

    rateLimitCache.set(key, requestCount + 1, windowMs / 1000);
    next();
  };
};

module.exports = rateLimiter;
