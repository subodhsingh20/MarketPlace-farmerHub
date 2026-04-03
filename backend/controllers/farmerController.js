const User = require("../models/User");
const Product = require("../models/Product");

const getNearestFarmers = async (req, res) => {
  try {
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lon);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({
        message: "Valid lat and lon query parameters are required.",
      });
    }

    const farmers = await User.find({
      role: "farmer",
      locationPoint: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: 50000,
        },
      },
    }).select("name phone location locationPoint");

    const farmerIds = farmers.map((farmer) => farmer._id);
    const products = await Product.find({ farmerId: { $in: farmerIds } })
      .select("name price quantity unit category imageUrl farmerId location")
      .sort({ createdAt: -1 });

    const productsByFarmer = new Map();

    products.forEach((product) => {
      const farmerId = String(product.farmerId);

      if (!productsByFarmer.has(farmerId)) {
        productsByFarmer.set(farmerId, []);
      }

      productsByFarmer.get(farmerId).push(product);
    });

    const payload = farmers.map((farmer, index) => ({
      id: farmer._id,
      name: farmer.name,
      phone: farmer.phone,
      location: farmer.location,
      coordinates: farmer.locationPoint?.coordinates || [
        farmer.location.longitude,
        farmer.location.latitude,
      ],
      isNearest: index === 0,
      products: (productsByFarmer.get(String(farmer._id)) || []).map((product) => ({
        _id: product._id,
        name: product.name,
        price: product.price,
        quantity: product.quantity,
        unit: product.unit,
        category: product.category,
        imageUrl: product.imageUrl,
        location: product.location,
      })),
    }));

    return res.status(200).json({
      farmers: payload,
      nearestFarmer: payload[0] || null,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch nearest farmers.",
      error: error.message,
    });
  }
};

module.exports = { getNearestFarmers };
