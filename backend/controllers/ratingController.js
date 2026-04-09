const { products, users } = require("../data");
const { hydrateProduct, toFarmerSummary } = require("../data/hydrators");

const getAverageRating = (ratings) => {
  if (!ratings.length) {
    return 0;
  }

  const total = ratings.reduce((sum, rating) => sum + rating.value, 0);
  return Number((total / ratings.length).toFixed(1));
};

const validateRating = (value) => {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > 5) {
    return null;
  }

  return numericValue;
};

const rateProduct = async (req, res) => {
  try {
    const ratingValue = validateRating(req.body.rating);

    if (!ratingValue) {
      return res.status(400).json({ message: "Rating must be an integer from 1 to 5." });
    }

    const product = await products.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const existingRatingIndex = (product.ratings || []).findIndex(
      (rating) => String(rating.userId) === String(req.user._id)
    );

    if (existingRatingIndex >= 0) {
      product.ratings[existingRatingIndex].value = ratingValue;
    } else {
      product.ratings = [...(product.ratings || []), { userId: req.user._id, value: ratingValue }];
    }

    product.averageRating = getAverageRating(product.ratings);
    const updatedProduct = await products.save(product);
    const farmer = await users.findById(updatedProduct.farmerId);

    return res.status(200).json({
      message: "Product rating saved successfully.",
      product: hydrateProduct(updatedProduct, farmer),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to save product rating.",
      error: error.message,
    });
  }
};

const rateFarmer = async (req, res) => {
  try {
    const ratingValue = validateRating(req.body.rating);

    if (!ratingValue) {
      return res.status(400).json({ message: "Rating must be an integer from 1 to 5." });
    }

    const farmer = await users.findById(req.params.id);

    if (!farmer || farmer.role !== "farmer") {
      return res.status(404).json({ message: "Farmer not found." });
    }

    const existingRatingIndex = (farmer.ratings || []).findIndex(
      (rating) => String(rating.userId) === String(req.user._id)
    );

    if (existingRatingIndex >= 0) {
      farmer.ratings[existingRatingIndex].value = ratingValue;
    } else {
      farmer.ratings = [...(farmer.ratings || []), { userId: req.user._id, value: ratingValue }];
    }

    farmer.averageRating = getAverageRating(farmer.ratings);
    const updatedFarmer = await users.save(farmer);

    return res.status(200).json({
      message: "Farmer rating saved successfully.",
      farmer: {
        id: updatedFarmer._id,
        name: updatedFarmer.name,
        averageRating: updatedFarmer.averageRating,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to save farmer rating.",
      error: error.message,
    });
  }
};

module.exports = {
  rateProduct,
  rateFarmer,
};
