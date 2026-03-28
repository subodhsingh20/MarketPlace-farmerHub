const User = require("../models/User");

const REQUIRED_ADDRESS_FIELDS = ["label", "name", "street", "city", "state", "pincode"];

const normalizeAddressPayload = (payload = {}) => {
  const normalizedAddress = {};

  for (const field of REQUIRED_ADDRESS_FIELDS) {
    normalizedAddress[field] = String(payload[field] || "").trim();
  }

  return normalizedAddress;
};

const getAddressValidationErrors = (address) => {
  const errors = {};

  for (const field of REQUIRED_ADDRESS_FIELDS) {
    if (!address[field]) {
      errors[field] = `${field.charAt(0).toUpperCase()}${field.slice(1)} is required.`;
    }
  }

  if (address.pincode && !/^\d{6}$/.test(address.pincode)) {
    errors.pincode = "Pincode must be a 6-digit number.";
  }

  return errors;
};

const sortAddresses = (addresses) =>
  [...addresses].sort((left, right) => {
    const leftLastUsed = left.lastUsedAt ? new Date(left.lastUsedAt).getTime() : 0;
    const rightLastUsed = right.lastUsedAt ? new Date(right.lastUsedAt).getTime() : 0;

    if (rightLastUsed !== leftLastUsed) {
      return rightLastUsed - leftLastUsed;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });

const getCustomerAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("addresses");

    return res.status(200).json({
      addresses: sortAddresses(user?.addresses || []),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch customer addresses.",
      error: error.message,
    });
  }
};

const addCustomerAddress = async (req, res) => {
  try {
    const normalizedAddress = normalizeAddressPayload(req.body);
    const errors = getAddressValidationErrors(normalizedAddress);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: "Address fields are incomplete.",
        errors,
      });
    }

    const user = await User.findById(req.user._id);

    user.addresses.push(normalizedAddress);
    await user.save();

    return res.status(201).json({
      message: "Address added successfully.",
      addresses: sortAddresses(user.addresses),
      address: user.addresses[user.addresses.length - 1],
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to add customer address.",
      error: error.message,
    });
  }
};

const updateCustomerAddress = async (req, res) => {
  try {
    const normalizedAddress = normalizeAddressPayload(req.body);
    const errors = getAddressValidationErrors(normalizedAddress);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: "Address fields are incomplete.",
        errors,
      });
    }

    const user = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.id);

    if (!address) {
      return res.status(404).json({ message: "Address not found." });
    }

    address.set(normalizedAddress);
    await user.save();

    return res.status(200).json({
      message: "Address updated successfully.",
      addresses: sortAddresses(user.addresses),
      address,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update customer address.",
      error: error.message,
    });
  }
};

const deleteCustomerAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.id);

    if (!address) {
      return res.status(404).json({ message: "Address not found." });
    }

    address.deleteOne();
    await user.save();

    return res.status(200).json({
      message: "Address removed successfully.",
      addresses: sortAddresses(user.addresses),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to remove customer address.",
      error: error.message,
    });
  }
};

module.exports = {
  addCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
  updateCustomerAddress,
};
