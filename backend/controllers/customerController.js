const { randomUUID } = require("crypto");
const { users } = require("../data");

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

const createAddressRecord = (address) => {
  const now = new Date().toISOString();

  return {
    _id: `address_${randomUUID()}`,
    ...address,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
  };
};

const getCustomerAddresses = async (req, res) => {
  try {
    const user = await users.findById(req.user._id);

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

    const user = await users.updateById(req.user._id, (doc) => {
      const nextAddress = createAddressRecord(normalizedAddress);
      return {
        ...doc,
        addresses: [...(doc.addresses || []), nextAddress],
      };
    });

    const newAddress = user.addresses[user.addresses.length - 1];

    return res.status(201).json({
      message: "Address added successfully.",
      addresses: sortAddresses(user.addresses),
      address: newAddress,
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

    const user = await users.findById(req.user._id);
    const addressIndex = (user?.addresses || []).findIndex((entry) => String(entry._id) === String(req.params.id));

    if (addressIndex < 0) {
      return res.status(404).json({ message: "Address not found." });
    }

    const nextAddresses = [...user.addresses];
    nextAddresses[addressIndex] = {
      ...nextAddresses[addressIndex],
      ...normalizedAddress,
      updatedAt: new Date().toISOString(),
    };

    const updatedUser = await users.updateById(req.user._id, (doc) => ({
      ...doc,
      addresses: nextAddresses,
    }));

    return res.status(200).json({
      message: "Address updated successfully.",
      addresses: sortAddresses(updatedUser.addresses),
      address: nextAddresses[addressIndex],
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
    const user = await users.findById(req.user._id);
    const addresses = user?.addresses || [];
    const address = addresses.find((entry) => String(entry._id) === String(req.params.id));

    if (!address) {
      return res.status(404).json({ message: "Address not found." });
    }

    const updatedUser = await users.updateById(req.user._id, (doc) => ({
      ...doc,
      addresses: addresses.filter((entry) => String(entry._id) !== String(req.params.id)),
    }));

    return res.status(200).json({
      message: "Address removed successfully.",
      addresses: sortAddresses(updatedUser.addresses),
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
