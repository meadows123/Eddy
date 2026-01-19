import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Use environment variable for Mapbox token
const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Debug logging
console.log('Mapbox Token:', mapboxToken);

// Set the token
mapboxgl.accessToken = mapboxToken;

export default function Map({ venues = [], onVenueSelect }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [error, setError] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (map.current) return;

    try {
      console.log('Initializing map...');
      
      // Basic map initialization
      const mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-74.5, 40],
        zoom: 9,
        attributionControl: true
      });

      // Add basic controls
      mapInstance.addControl(new mapboxgl.AttributionControl(), 'bottom-right');
      mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Handle map load
      mapInstance.on('load', () => {
        console.log('Map loaded successfully');
        setMapLoaded(true);
      });

      // Handle errors
      mapInstance.on('error', (e) => {
        console.error('Mapbox error:', e);
        setError(e.message || 'Failed to load map');
      });

      // Store map instance
      map.current = mapInstance;

      // Cleanup
      return () => {
        if (map.current) {
          map.current.remove();
          map.current = null;
        }
      };
    } catch (error) {
      console.error('Error initializing map:', error);
      setError(error.message || 'Failed to initialize map');
    }
  }, []);

  // Add venue markers when map is loaded and venues change
  useEffect(() => {
    if (!map.current || !mapLoaded || !venues.length) return;

    try {
      // Remove existing markers
      const markers = document.getElementsByClassName('venue-marker');
      while (markers[0]) {
        markers[0].remove();
      }

      // Add new markers
      venues.forEach(venue => {
        if (!venue.longitude || !venue.latitude) return;

        const el = document.createElement('div');
        el.className = 'venue-marker';
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.backgroundImage = 'url(/venue-marker.png)';
        el.style.backgroundSize = 'cover';
        el.style.cursor = 'pointer';

        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <h3>${venue.name}</h3>
            <p>${venue.address}</p>
            <button onclick="window.dispatchEvent(new CustomEvent('venueSelect', { detail: ${JSON.stringify(venue)} }))">
              View Details
            </button>
          `);

        new mapboxgl.Marker(el)
          .setLngLat([venue.longitude, venue.latitude])
          .setPopup(popup)
          .addTo(map.current);
      });
    } catch (error) {
      console.error('Error adding markers:', error);
    }
  }, [venues, mapLoaded]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-red-500 text-center p-4">
          <p className="font-bold">Error Loading Map</p>
          <p>{error}</p>
          <p className="mt-2 text-sm">Please check your Mapbox token in the .env file</p>
          <p className="mt-2 text-sm">Token: {mapboxToken.substring(0, 10)}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
} 