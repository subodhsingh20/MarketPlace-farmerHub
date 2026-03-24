const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
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

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });

    if (existingUser) {
      return res.status(409).json({ message: "User with this email or phone already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role,
      location: resolvedLocation,
    });

    return res.status(201).json({
      message: "User registered successfully.",
      token: createToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        location: user.location,
      },
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

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    return res.status(200).json({
      message: "Login successful.",
      token: createToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        location: user.location,
      },
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
