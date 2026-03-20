const Product = require("../models/Product");

const addProduct = async (req, res) => {
  try {
    const { name, price, quantity, category, imageUrl, location } = req.body;

    if (
      !name ||
      price === undefined ||
      quantity === undefined ||
      !category ||
      !imageUrl ||
      !location ||
      typeof location.latitude !== "number" ||
      typeof location.longitude !== "number"
    ) {
      return res.status(400).json({
        message:
          "Name, price, quantity, category, image URL, latitude, and longitude are required.",
      });
    }

    const product = await Product.create({
      name,
      price,
      quantity,
      category,
      imageUrl,
      farmerId: req.user._id,
      location,
    });

    return res.status(201).json({
      message: "Product added successfully.",
      product,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to add product.",
      error: error.message,
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    if (product.farmerId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Forbidden. You can only update your own products." });
    }

    const allowedFields = [
      "name",
      "price",
      "quantity",
      "category",
      "imageUrl",
      "location",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    await product.save();

    return res.status(200).json({
      message: "Product updated successfully.",
      product,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update product.",
      error: error.message,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    if (product.farmerId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Forbidden. You can only delete your own products." });
    }

    await product.deleteOne();

    return res.status(200).json({ message: "Product deleted successfully." });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete product.",
      error: error.message,
    });
  }
};

const getAllProducts = async (_req, res) => {
  try {
    const products = await Product.find()
      .populate("farmerId", "name email phone location averageRating")
      .sort({ createdAt: -1 });

    return res.status(200).json({ products });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch products.",
      error: error.message,
    });
  }
};

const getProductsByFarmer = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const products = await Product.find({ farmerId }).sort({ createdAt: -1 });

    return res.status(200).json({ products });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch farmer products.",
      error: error.message,
    });
  }
};

const getNearbyProducts = async (req, res) => {
  try {
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({
        message: "Valid latitude and longitude query parameters are required.",
      });
    }

    const products = await Product.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          distanceField: "distanceInMeters",
          spherical: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "farmerId",
          foreignField: "_id",
          as: "farmerId",
        },
      },
      {
        $unwind: {
          path: "$farmerId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          name: 1,
          price: 1,
          quantity: 1,
          category: 1,
          imageUrl: 1,
          location: 1,
          distanceInMeters: 1,
          farmerId: {
            _id: "$farmerId._id",
            name: "$farmerId.name",
            email: "$farmerId.email",
            phone: "$farmerId.phone",
            location: "$farmerId.location",
            averageRating: "$farmerId.averageRating",
          },
          averageRating: 1,
        },
      },
    ]);

    return res.status(200).json({ products });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch nearby products.",
      error: error.message,
    });
  }
};

module.exports = {
  addProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductsByFarmer,
  getNearbyProducts,
};
