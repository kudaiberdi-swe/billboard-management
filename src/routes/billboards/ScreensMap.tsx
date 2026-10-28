// Map of the listed screens (D-7, ADR-0009). Loaded lazily by Billboards inside an error boundary,
// so a failed script or tile server never takes the list down.
import { useEffect, useState } from "react";
import { Text } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { t } from "../../../shared/strings";
import { MAP_HEIGHT } from "../../theme";

export type MapScreen = { _id: string; name: string; lat: number; lng: number };

const TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const KAZAKHSTAN: L.LatLngTuple = [48, 67];
// Bundled marker images: Leaflet's own CSS-path detection breaks under Vite.
const icon = L.icon({ ...L.Icon.Default.prototype.options, iconUrl, iconRetinaUrl, shadowUrl });

function FitToScreens({ screens }: { screens: MapScreen[] }) {
  const map = useMap();
  useEffect(() => {
    if (screens.length > 0) map.fitBounds(screens.map((s) => [s.lat, s.lng] as L.LatLngTuple), { padding: [24, 24], maxZoom: 13 });
  }, [map, screens]);
  return null;
}

export default function ScreensMap({ screens }: { screens: MapScreen[] }) {
  const navigate = useNavigate();
  const [tilesFailed, setTilesFailed] = useState(false);
  return (
    <>
      {tilesFailed && (
        <Text c="dimmed" size="sm" mb="xs" role="status">
          {t("ru", "billboards.mapUnavailable")}
        </Text>
      )}
      <MapContainer center={KAZAKHSTAN} zoom={4} style={{ height: MAP_HEIGHT }}>
        <TileLayer url={TILES} attribution={ATTRIBUTION} eventHandlers={{ tileerror: () => setTilesFailed(true) }} />
        {screens.map((s) => (
          <Marker
            key={s._id}
            position={[s.lat, s.lng]}
            icon={icon}
            title={s.name}
            alt={s.name}
            eventHandlers={{ click: () => navigate(`/billboards/${s._id}`) }}
          />
        ))}
        <FitToScreens screens={screens} />
      </MapContainer>
    </>
  );
}
