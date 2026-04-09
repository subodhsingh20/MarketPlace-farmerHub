const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { users } = require("../data");
const { geocodeAddress } = require("../utils/geocodeAddress");

const createToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET || "development_jwt_secret",
    { expiresIn: "7d" }
  );

const buildAuthUserPayload = (user) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  location: user.location,
});

const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password, role, location, address } = req.body;
    let resolvedLocation = location;

    if (
      (!resolvedLocation ||
        typeof resolvedLocation.latitude !== "number" ||
        typeof resolvedLocation.longitude !== "number") &&
      address
    ) {
      resolvedLocation = await geocodeAddress(address);
    }

    if (
      !name ||
      !email ||
      !phone ||
      !password ||
      !role ||
      !resolvedLocation ||
      typeof resolvedLocation.latitude !== "number" ||
      typeof resolvedLocation.longitude !== "number"
    ) {
      return res.status(400).json({
        message:
          "Name, email, phone, password, role, and valid location coordinates are required.",
      });
    }

    const existingUser = await users.findOne({
      $or: [{ email: String(email).toLowerCase() }, { phone: String(phone).trim() }],
    });

    if (existingUser) {
      return res.status(409).json({ message: "User with this email or phone already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await users.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      phone: String(phone).trim(),
      password: hashedPassword,
      role,
      location: {
        latitude: Number(resolvedLocation.latitude),
        longitude: Number(resolvedLocation.longitude),
      },
      ratings: [],
      averageRating: 0,
      addresses: [],
    });

    return res.status(201).json({
      message: "User registered successfully.",
      token: createToken(user),
      user: buildAuthUserPayload(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Registration failed.",
      error: error.message,
    });
  }
};

const geocodeAddressLookup = async (req, res) => {
  try {
    const query = req.query.q || req.query.address;

    if (!query) {
      return res.status(400).json({
        message: "An address query is required.",
      });
    }

    const result = await geocodeAddress(query);

    return res.status(200).json({
      location: result,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to geocode address.",
      error: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await users.findOne({ email: String(email).toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    return res.status(200).json({
      message: "Login successful.",
      token: createToken(user),
      user: buildAuthUserPayload(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Login failed.",
      error: error.message,
    });
  }
};

module.exports = {
  geocodeAddressLookup,
  registerUser,
  loginUser,
};
