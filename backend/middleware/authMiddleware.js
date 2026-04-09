const jwt = require("jsonwebtoken");
const { users } = require("../data");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized. Token missing." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "development_jwt_secret");
    const user = await users.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "Not authorized. User not found." });
    }

    const { password, ...safeUser } = user;
    req.user = {
      ...safeUser,
      id: safeUser._id,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Not authorized. Invalid token.",
      error: error.message,
    });
  }
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized. User missing." });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: "Forbidden. You do not have permission to perform this action.",
    });
  }

  return next();
};

module.exports = { protect, authorizeRoles };
