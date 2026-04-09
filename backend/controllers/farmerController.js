const { products, users } = require("../data");

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

const getNearestFarmers = async (req, res) => {
  try {
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lon);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({
        message: "Valid lat and lon query parameters are required.",
      });
    }

    const farmers = await users.find({ role: "farmer" });
    const farmersWithDistance = farmers
      .map((farmer) => ({
        ...farmer,
        distanceInMeters: distanceInMeters(
          { latitude, longitude },
          farmer.location || {}
        ),
      }))
      .sort((left, right) => left.distanceInMeters - right.distanceInMeters)
      .filter((farmer) => farmer.distanceInMeters <= 50000);

    const farmerIds = farmersWithDistance.map((farmer) => farmer._id);
    const farmerProducts = await products.find(
      { farmerId: { $in: farmerIds } },
      { sort: [{ createdAt: -1 }] }
    );

    const productsByFarmer = new Map();

    farmerProducts.forEach((product) => {
      const farmerId = String(product.farmerId);

      if (!productsByFarmer.has(farmerId)) {
        productsByFarmer.set(farmerId, []);
      }

      productsByFarmer.get(farmerId).push(product);
    });

    const payload = farmersWithDistance.map((farmer, index) => ({
      id: farmer._id,
      name: farmer.name,
      phone: farmer.phone,
      location: farmer.location,
      coordinates: farmer.locationPoint?.coordinates || [
        farmer.location.longitude,
        farmer.location.latitude,
      ],
      isNearest: index === 0,
      distanceInMeters: farmer.distanceInMeters,
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
