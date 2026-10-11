import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const locationIcon = L.divIcon({
  className: 'driver-location-marker',
  html: `<div style="width:22px;height:22px;background:#1677ff;border:4px solid white;border-radius:50%;box-shadow:0 0 0 7px rgba(22,119,255,0.2);"></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function RouteMapUpdater({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(positions, {
        padding: [45, 45],
        maxZoom: 16,
      });
    }
  }, [map, positions]);

  return null;
}

function MapUpdater({ center }) {
  const map = useMap();

  useEffect(() => {
    if (
      Array.isArray(center) &&
      center.length === 2 &&
      center.every(Number.isFinite)
    ) {
      map.setView(center, 14);
    }
  }, [map, center?.[0], center?.[1]]);

  return null;
}

function RoadRoute({ points, onRouteSelected }) {
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [panelHost, setPanelHost] = useState(null);

  useEffect(() => {
    const findHost = () => {
      setPanelHost(document.getElementById('navigation-route-panel'));
    };

    findHost();

    const timer = setInterval(findHost, 300);

    return () => clearInterval(timer);
  }, []);

  const origin = points[0];
  const destination = points[1];

  const originLat = origin?.lat;
  const originLng = origin?.lng;
  const destinationLat = destination?.lat;
  const destinationLng = destination?.lng;

  useEffect(() => {
    const valid =
      Number.isFinite(originLat) &&
      Number.isFinite(originLng) &&
      Number.isFinite(destinationLat) &&
      Number.isFinite(destinationLng) &&
      Math.abs(originLat) <= 90 &&
      Math.abs(destinationLat) <= 90 &&
      Math.abs(originLng) <= 180 &&
      Math.abs(destinationLng) <= 180;

    if (!valid) {
      setRoutes([]);
      setRouteError('Valid driver and destination coordinates are required.');
      setLoading(false);
      return;
    }

    const difference = Math.hypot(
      (originLat - destinationLat) * 111,
      (originLng - destinationLng) *
        111 *
        Math.cos((originLat * Math.PI) / 180)
    );

    if (difference < 0.01) {
      setRoutes([]);
      setRouteError(
        'Driver is already at or very near the destination. Verify the pickup location.'
      );
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchRoutes() {
      setLoading(true);
      setRoutes([]);
      setRouteError('');
      setSelectedRouteIndex(0);

      try {
        const url =
          'https://router.project-osrm.org/route/v1/driving/' +
          `${originLng},${originLat};${destinationLng},${destinationLat}` +
          '?overview=full&geometries=geojson&alternatives=3';

        const response = await fetch(url, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Routing service is unavailable.');
        }

        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes?.length) {
          throw new Error('No drivable road route was found.');
        }

        const formattedRoutes = data.routes
          .filter(
            (route) =>
              Number.isFinite(route.distance) &&
              Number.isFinite(route.duration) &&
              route.geometry?.coordinates?.length > 1
          )
          .map((route, index) => ({
            id: index,
            positions: route.geometry.coordinates.map(([lng, lat]) => [
              lat,
              lng,
            ]),
            // Store the numeric value, not just a formatted string.
            distanceKm: route.distance / 1000,
            durationMin: Math.max(1, Math.round(route.duration / 60)),
          }));

        if (!formattedRoutes.length) {
          throw new Error('The routing service returned no usable routes.');
        }

        setRoutes(formattedRoutes);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Route error:', error);
          setRouteError(error.message || 'Unable to calculate the route.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchRoutes();

    return () => controller.abort();
  }, [originLat, originLng, destinationLat, destinationLng]);

  const selectedRoute = routes[selectedRouteIndex];

  // Share the currently selected road route with DriverDashboard.
  useEffect(() => {
    if (selectedRoute && onRouteSelected) {
      onRouteSelected({
        distanceKm: selectedRoute.distanceKm,
        durationMin: selectedRoute.durationMin,
      });
    }
  }, [selectedRoute, onRouteSelected]);

  const panel = (
    <div
      style={{
        width: 'min(100%, 390px)',
        maxHeight: 330,
        overflowY: 'auto',
        background: '#fff',
        color: '#222',
        padding: 14,
        borderRadius: 12,
        boxShadow: '0 3px 12px #0002',
        boxSizing: 'border-box',
      }}
    >
      <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>
        🚑 Available Routes
      </h3>

      {loading && <p>Calculating road routes...</p>}

      {routeError && (
        <p style={{ color: '#b42318', fontSize: 13 }}>{routeError}</p>
      )}

      {!loading && !routeError && routes.length === 1 && (
        <p style={{ fontSize: 12, color: '#555' }}>
          One route is available. Alternative routes may not exist for every
          journey.
        </p>
      )}

      {routes.map((route, index) => (
        <button
          key={route.id}
          type="button"
          onClick={() => setSelectedRouteIndex(index)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            marginBottom: 8,
            padding: 10,
            borderRadius: 8,
            border:
              index === selectedRouteIndex
                ? '2px solid #1677ff'
                : '1px solid #ddd',
            background:
              index === selectedRouteIndex ? '#eff6ff' : '#fff',
            cursor: 'pointer',
          }}
        >
          <strong>
            {index === 0 ? 'Recommended route' : `Alternative ${index + 1}`}
            {index === selectedRouteIndex ? ' ✓' : ''}
          </strong>

          <div style={{ marginTop: 5, fontSize: 13 }}>
            {route.distanceKm.toFixed(2)} km · {route.durationMin} min
          </div>

          {index === 0 && (
            <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>
              Default route from OSRM
            </div>
          )}
        </button>
      ))}

      {selectedRoute && (
        <div
          style={{
            padding: 10,
            background: '#f0fdf4',
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          <strong>Selected route</strong>

          <p style={{ margin: '5px 0 0' }}>
            Distance: {selectedRoute.distanceKm.toFixed(2)} km
          </p>

          <p style={{ margin: '5px 0 0' }}>
            Estimated time: {selectedRoute.durationMin} min
          </p>
        </div>
      )}

      <p style={{ fontSize: 11, color: '#666', marginBottom: 0 }}>
        Travel times are estimates. Live traffic is not included.
      </p>
    </div>
  );

  return (
    <>
      {routes.map((route, index) => (
        <Polyline
          key={`${route.id}-${originLat}-${destinationLat}`}
          positions={route.positions}
          pathOptions={{
            color: index === selectedRouteIndex ? '#1677ff' : '#8998ad',
            weight: index === selectedRouteIndex ? 7 : 4,
            opacity: index === selectedRouteIndex ? 0.95 : 0.65,
            dashArray: index === selectedRouteIndex ? undefined : '8 8',
          }}
          eventHandlers={{
            click: () => setSelectedRouteIndex(index),
          }}
        />
      ))}

      {selectedRoute && (
        <RouteMapUpdater positions={selectedRoute.positions} />
      )}

      {panelHost ? createPortal(panel, panelHost) : null}
    </>
  );
}

export default function Map({
  center = [17.385, 78.4867],
  points = [],
  showRoadRoute = false,
  onRouteSelected,
}) {
  const validPoints = points.filter(
    (point) =>
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng) &&
      Math.abs(point.lat) <= 90 &&
      Math.abs(point.lng) <= 180
  );

  const validCenter =
    Array.isArray(center) &&
    center.length === 2 &&
    center.every(Number.isFinite)
      ? center
      : [17.385, 78.4867];

  return (
    <MapContainer
      center={validCenter}
      zoom={14}
      scrollWheelZoom
      style={{
        height: 450,
        width: '100%',
        borderRadius: 16,
        position: 'relative',
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapUpdater center={validCenter} />

      {validPoints.map((point, index) => (
        <Marker
          key={`${point.title}-${index}`}
          position={[point.lat, point.lng]}
          icon={locationIcon}
        >
          <Popup>
            <strong>{point.title}</strong>
            <br />
            {point.subtitle}
          </Popup>
        </Marker>
      ))}

      {showRoadRoute && validPoints.length >= 2 && (
        <RoadRoute
          points={validPoints}
          onRouteSelected={onRouteSelected}
        />
      )}
    </MapContainer>
  );
}