const geocodeAddress = async (address) => {
  const query = String(address || "").trim();

  if (!query) {
    throw new Error("Address is required for geocoding.");
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=1`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "farmer-marketplace/1.0",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Nominatim geocoding request failed.");
  }

  const results = await response.json();

  if (!Array.isArray(results) || !results.length) {
    throw new Error("No matching address found.");
  }

  const [match] = results;
  const latitude = Number(match.lat);
  const longitude = Number(match.lon);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    throw new Error("Geocoding response did not include valid coordinates.");
  }

  return {
    latitude,
    longitude,
    displayName: match.display_name || query,
  };
};

module.exports = { geocodeAddress };
