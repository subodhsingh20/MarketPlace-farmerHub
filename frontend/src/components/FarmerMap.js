import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const createMarkerIcon = (backgroundColor, borderColor = "#ffffff") =>
  L.divIcon({
    className: "",
    html: `<span style="display:flex;width:18px;height:18px;border-radius:9999px;background:${backgroundColor};border:3px solid ${borderColor};box-shadow:0 8px 24px rgba(15,23,42,0.18);"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

const customerIcon = createMarkerIcon("#2563eb");
const farmerIcon = createMarkerIcon("#059669");
const selectedFarmerIcon = createMarkerIcon("#7c3aed");
const nearestFarmerIcon = createMarkerIcon("#f97316");

function FarmerMap({
  farmerGroups,
  nearestFarmerId,
  onMarkerSelect,
  selectedFarmerId,
  userLocation,
}) {
  const mapElementRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const isMapReadyRef = useRef(false);
  const initialViewRef = useRef({
    center: userLocation
      ? [userLocation.latitude, userLocation.longitude]
      : [20.5937, 78.9629],
    zoom: userLocation ? 11 : 4,
  });

  const activeFarmerGroups = useMemo(
    () =>
      farmerGroups.filter(
        (group) =>
          typeof group.latitude === "number" && typeof group.longitude === "number"
      ),
    [farmerGroups]
  );

  useEffect(() => {
    if (!mapElementRef.current || mapInstanceRef.current) {
      return undefined;
    }

    const map = L.map(mapElementRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView(initialViewRef.current.center, initialViewRef.current.zoom);

    map.whenReady(() => {
      isMapReadyRef.current = true;
      map.invalidateSize(false);
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      isMapReadyRef.current = false;
      map.stop();
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;

    if (!map || !isMapReadyRef.current) {
      return undefined;
    }

    const syncMapSize = () => {
      if (mapInstanceRef.current && isMapReadyRef.current) {
        map.invalidateSize(false);
      }
    };

    const frameId = window.requestAnimationFrame(syncMapSize);
    window.addEventListener("resize", syncMapSize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", syncMapSize);
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;

    if (!map || !markersLayer || !isMapReadyRef.current) {
      return;
    }

    markersLayer.clearLayers();
    const bounds = [];

    if (userLocation) {
      const customerMarker = L.marker(
        [userLocation.latitude, userLocation.longitude],
        { icon: customerIcon }
      ).bindPopup("Your location");

      customerMarker.addTo(markersLayer);
      bounds.push([userLocation.latitude, userLocation.longitude]);
    }

    activeFarmerGroups.forEach((group) => {
      const isSelected = selectedFarmerId === group.id;
      const isNearest = nearestFarmerId === group.id;
      const icon = isSelected
        ? selectedFarmerIcon
        : isNearest
          ? nearestFarmerIcon
          : farmerIcon;

      const marker = L.marker([group.latitude, group.longitude], { icon })
        .on("click", () => onMarkerSelect(group.id))
        .bindPopup(
          `<div style="min-width:160px"><strong>${group.farmerName}</strong><br/>${group.products.length} product${
            group.products.length === 1 ? "" : "s"
          }${isNearest ? "<br/><span style='color:#f97316;font-weight:600'>Nearest farmer</span>" : ""}</div>`
        );

      marker.addTo(markersLayer);
      bounds.push([group.latitude, group.longitude]);
    });

    if (bounds.length === 1) {
      map.stop();
      map.setView(bounds[0], userLocation ? 12 : 10, { animate: false });
      return;
    }

    if (bounds.length > 1) {
      map.stop();
      map.fitBounds(bounds, {
        animate: false,
        padding: [30, 30],
        maxZoom: 13,
      });
    }
  }, [activeFarmerGroups, nearestFarmerId, onMarkerSelect, selectedFarmerId, userLocation]);

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <div className="h-72 w-full max-w-full overflow-hidden rounded-2xl border border-emerald-100 shadow-inner sm:h-80">
        <div ref={mapElementRef} className="h-full w-full" />
      </div>

      <div className="flex flex-wrap gap-3 text-xs font-medium text-gray-600">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
          You
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
          Farmers
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
          Nearest farmer
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />
          Selected farmer
        </span>
      </div>
    </div>
  );
}

export default FarmerMap;
