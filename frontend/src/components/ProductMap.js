import { useMemo } from "react";

function ProductMap({
  apiKey,
  farmerGroups,
  onMarkerSelect,
  selectedFarmerId,
  userLocation,
}) {
  const summary = useMemo(() => {
    if (!farmerGroups.length) {
      return "No farmer locations available yet.";
    }

    return `Map ready for ${farmerGroups.length} farmer location${
      farmerGroups.length === 1 ? "" : "s"
    }.`;
  }, [farmerGroups.length]);

  if (!apiKey) {
    return (
      <div className="map-placeholder">
        <div className="map-placeholder__copy">
          <strong>{summary}</strong>
          <span>
            Add <code>REACT_APP_GOOGLE_MAPS_API_KEY</code> to your frontend
            environment to show the live map.
          </span>
          {userLocation ? (
            <span>
              Your location: {userLocation.latitude.toFixed(4)},{" "}
              {userLocation.longitude.toFixed(4)}
            </span>
          ) : null}
          {farmerGroups.length ? (
            <div className="map-placeholder__list">
              {farmerGroups.slice(0, 6).map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className={
                    selectedFarmerId === group.id
                      ? "map-placeholder__marker map-placeholder__marker--active"
                      : "map-placeholder__marker"
                  }
                  onClick={() => onMarkerSelect(group.id)}
                >
                  {group.farmerName}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="map-placeholder">
      <div className="map-placeholder__copy">
        <strong>Live map integration placeholder</strong>
        <span>
          Your Google Maps API key is available. The UI is ready for a live map
          implementation, and you can still select farmer locations below.
        </span>
        {farmerGroups.length ? (
          <div className="map-placeholder__list">
            {farmerGroups.slice(0, 6).map((group) => (
              <button
                key={group.id}
                type="button"
                className={
                  selectedFarmerId === group.id
                    ? "map-placeholder__marker map-placeholder__marker--active"
                    : "map-placeholder__marker"
                }
                onClick={() => onMarkerSelect(group.id)}
              >
                {group.farmerName}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default ProductMap;
