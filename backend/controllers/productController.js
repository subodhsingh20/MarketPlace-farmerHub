const { products, users } = require("../data");
const { hydrateProduct, toFarmerSummary } = require("../data/hydrators");

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const distanceInMeters = (left, right) => {
  if (
    !left ||
    !right ||
    typeof left.latitude !== "number" ||
    typeof left.longitude !== "number" ||
    typeof right.latitude !== "number" ||
    typeof right.longitude !== "number"
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const earthRadius = 6371000;
  const deltaLat = toRadians(right.latitude - left.latitude);
  const deltaLon = toRadians(right.longitude - left.longitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(left.latitude)) *
      Math.cos(toRadians(right.latitude)) *
      Math.sin(deltaLon / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const attachFarmer = async (product) => {
  const farmer = await users.findById(product.farmerId);
  return hydrateProduct(product, farmer);
};

const addProduct = async (req, res) => {
  try {
    const { name, price, quantity, unit, category, imageUrl, location } = req.body;
    const normalizedUnit = unit === "litre" ? "litre" : "kg";

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

    const product = await products.create({
      name,
      price: Number(price),
      quantity: Number(quantity),
      unit: normalizedUnit,
      category,
      imageUrl,
      farmerId: req.user._id,
      location: {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
      },
      ratings: [],
      averageRating: 0,
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
    const product = await products.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    if (String(product.farmerId) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Forbidden. You can only update your own products." });
    }

    const allowedFields = [
      "name",
      "price",
      "quantity",
      "unit",
      "category",
      "imageUrl",
      "location",
    ];

    const nextProduct = { ...product };

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        nextProduct[field] = req.body[field];
      }
    });

    if (nextProduct.location) {
      nextProduct.location = {
        latitude: Number(nextProduct.location.latitude),
        longitude: Number(nextProduct.location.longitude),
      };
    }

    if (nextProduct.price !== undefined) {
      nextProduct.price = Number(nextProduct.price);
    }

    if (nextProduct.quantity !== undefined) {
      nextProduct.quantity = Number(nextProduct.quantity);
    }

    const updatedProduct = await products.save(nextProduct);

    return res.status(200).json({
      message: "Product updated successfully.",
      product: updatedProduct,
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
    const product = await products.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    if (String(product.farmerId) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Forbidden. You can only delete your own products." });
    }

    await products.deleteById(id);

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
    const productDocs = await products.find({}, { sort: [{ createdAt: -1 }] });
    const enrichedProducts = await Promise.all(productDocs.map((product) => attachFarmer(product)));

    return res.status(200).json({ products: enrichedProducts });
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
    const productDocs = await products.find(
      { farmerId: String(farmerId) },
      { sort: [{ createdAt: -1 }] }
    );

    return res.status(200).json({ products: productDocs });
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

    const productDocs = await products.find({}, { sort: [{ createdAt: -1 }] });
    const farmerDocs = await Promise.all(
      Array.from(new Set(productDocs.map((product) => String(product.farmerId))))
        .filter(Boolean)
        .map((id) => users.findById(id))
    );
    const farmerMap = new Map(
      farmerDocs.filter(Boolean).map((farmer) => [String(farmer._id), toFarmerSummary(farmer)])
    );

    const nearbyProducts = productDocs
      .map((product) => ({
        ...product,
        distanceInMeters: distanceInMeters(
          { latitude, longitude },
          product.location || {}
        ),
        farmerId: farmerMap.get(String(product.farmerId)) || product.farmerId,
      }))
      .filter((product) => Number.isFinite(product.distanceInMeters))
      .sort((left, right) => left.distanceInMeters - right.distanceInMeters);

    return res.status(200).json({ products: nearbyProducts });
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
