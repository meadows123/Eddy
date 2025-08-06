import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import { supabase } from '../lib/supabase.js';
import { MapPin, Star, DollarSign, Users, Phone, Mail, ExternalLink, Filter, Search, Navigation, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import 'mapbox-gl/dist/mapbox-gl.css';

const ExplorePage = () => {
  const [venues, setVenues] = useState([]);
  const [filteredVenues, setFilteredVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 6.5244, lng: 3.3792 }); // Default to Lagos
  const [mapZoom, setMapZoom] = useState(11);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    priceRange: 'all',
    minRating: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const mapRef = useRef();

  // Fetch user location
  useEffect(() => {
    const getUserLocation = () => {
      if (!navigator.geolocation) {
        console.log('Geolocation is not supported by this browser');
        setUserLocation({ lat: 6.5244, lng: 3.3792 }); // Fallback to Lagos
        return;
      }

      // Show loading state while getting location
      console.log('Getting user location...');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          console.log('User location detected:', { lat: userLat, lng: userLng });
          
          const userLocationData = {
            lat: userLat,
            lng: userLng
          };
          
          setUserLocation(userLocationData);
          setMapCenter(userLocationData);
          setGettingLocation(false);
          
          // Set zoom level based on accuracy
          const accuracy = position.coords.accuracy;
          let zoom = 13; // Default zoom for user location
          
          if (accuracy > 1000) {
            zoom = 11; // Less accurate, zoom out more
          } else if (accuracy < 100) {
            zoom = 15; // Very accurate, zoom in more
          }
          
          setMapZoom(zoom);
        },
        (error) => {
          console.log('Geolocation error:', error);
          let fallbackLocation = { lat: 6.5244, lng: 3.3792 }; // Lagos default
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              console.log('User denied location permission, using Lagos as default');
              setLocationPermissionDenied(true);
              break;
            case error.POSITION_UNAVAILABLE:
              console.log('Location information unavailable, using Lagos as default');
              break;
            case error.TIMEOUT:
              console.log('Location request timed out, using Lagos as default');
              break;
            default:
              console.log('Unknown location error, using Lagos as default');
              break;
          }
          
          setUserLocation(fallbackLocation);
          setMapCenter(fallbackLocation);
          setMapZoom(11); // Default zoom for Lagos
          setGettingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // 10 seconds timeout
          maximumAge: 300000 // Accept cached position up to 5 minutes old
        }
      );
    };

    getUserLocation();
  }, []);

  // Fetch venues from Supabase
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('venues')
          .select(`
            *,
            venue_images (
              image_url,
              is_primary
            )
          `)
          .eq('status', 'approved')
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching venues:', error);
          setVenues([]);
          return;
        }

        if (!data || data.length === 0) {
          console.log('No venues found in database with status=approved and is_active=true');
          
          // Let's also check what venues exist without filters
          const { data: allVenues } = await supabase
            .from('venues')
            .select('id, name, status, is_active, latitude, longitude');
          
          console.log('All venues in database:', allVenues);
          
          setVenues([]);
          setFilteredVenues([]);
          return;
        }

        console.log(`Found ${data.length} approved venues:`, data);

        // Transform venues with proper coordinates and images
        const venuesWithData = data.map(venue => {
          const primaryImage = venue.venue_images?.find(img => img.is_primary)?.image_url || 
                              venue.venue_images?.[0]?.image_url || 
                              'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4';
          
          const transformedVenue = {
            ...venue,
            lat: venue.latitude || 6.5244,
            lng: venue.longitude || 3.3792,
            image: primaryImage,
            priceLevel: venue.price_range?.length || 1
          };
          
          console.log(`Venue: ${venue.name}`, {
            id: venue.id,
            status: venue.status,
            is_active: venue.is_active,
            latitude: venue.latitude,
            longitude: venue.longitude,
            hasCoordinates: !!(venue.latitude && venue.longitude)
          });
          
          return transformedVenue;
        });
        setVenues(venuesWithData);
        setFilteredVenues(venuesWithData);
      } catch (error) {
        console.error('Error in fetchVenues:', error);
        setVenues([]);
        setFilteredVenues([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = venues;

    if (filters.search) {
      filtered = filtered.filter(venue =>
        venue.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        venue.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        venue.address.toLowerCase().includes(filters.search.toLowerCase()) ||
        venue.city.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.type !== 'all') {
      filtered = filtered.filter(venue => venue.type === filters.type);
    }

    if (filters.priceRange !== 'all') {
      filtered = filtered.filter(venue => venue.price_range === filters.priceRange);
    }

    if (filters.minRating > 0) {
      filtered = filtered.filter(venue => (venue.rating || 0) >= filters.minRating);
    }

    setFilteredVenues(filtered);
  }, [venues, filters]);

  // Fly to user location when detected
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;
    
    const map = mapRef.current.getMap();
    
    // Only fly to user location if we have it and it's not the default Lagos location
    if (userLocation.lat !== 6.5244 || userLocation.lng !== 3.3792) {
      setTimeout(() => {
        map.flyTo({
          center: [userLocation.lng, userLocation.lat],
          zoom: mapZoom,
          duration: 2000
        });
      }, 1000); // Small delay to ensure map is loaded
    }
  }, [userLocation, mapZoom]);

  // Auto-fit map to venues when filtering (but don't override user location)
  useEffect(() => {
    if (!mapRef.current || !filteredVenues.length) return;
    
    // Only auto-fit if user hasn't set a custom location or if they're searching
    if (filters.search || filters.type !== 'all' || filters.priceRange !== 'all' || filters.minRating > 0) {
      const map = mapRef.current.getMap();
      
      if (filteredVenues.length === 1) {
        map.flyTo({
          center: [filteredVenues[0].lng, filteredVenues[0].lat],
          zoom: 14,
          duration: 1000
        });
      } else if (filteredVenues.length > 1) {
        const lats = filteredVenues.map(v => v.lat);
        const lngs = filteredVenues.map(v => v.lng);
        const bounds = [
          [Math.min(...lngs) - 0.01, Math.min(...lats) - 0.01],
          [Math.max(...lngs) + 0.01, Math.max(...lats) + 0.01]
        ];
        map.fitBounds(bounds, { padding: 50, duration: 1000 });
      }
    }
  }, [filteredVenues, filters]);

  const getMarkerColor = (venue) => {
    switch (venue.type) {
      case 'restaurant': return '#10B981'; // Green
      case 'club': return '#8B5CF6'; // Purple
      case 'lounge': return '#F59E0B'; // Amber
      default: return '#EF4444'; // Red
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'restaurant': return '🍽️';
      case 'club': return '🎵';
      case 'lounge': return '🍸';
      default: return '📍';
    }
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      priceRange: 'all',
      minRating: 0
    });
  };

  const flyToUserLocation = () => {
    if (!mapRef.current || !userLocation) return;
    
    const map = mapRef.current.getMap();
    map.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 15,
      duration: 1000
    });
  };

  return (
    <div className="bg-brand-cream min-h-screen">
      <div className="container py-4 sm:py-8 px-4 sm:px-6">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading text-brand-burgundy mb-2 sm:mb-4">Explore Lagos Venues</h1>
          <p className="text-brand-burgundy/70 text-sm sm:text-base lg:text-lg">Discover the best restaurants, clubs, and lounges on our interactive map</p>
        </div>

        {/* Debug Panel - Remove this after fixing the issue */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="mb-4 sm:mb-6 bg-yellow-50 border-yellow-200">
            <CardContent className="p-3 sm:p-4">
              <h3 className="font-semibold text-yellow-800 mb-2 text-sm sm:text-base">Debug Info</h3>
              <div className="text-xs sm:text-sm text-yellow-700 space-y-1">
                <p>Total venues loaded: {venues.length}</p>
                <p>Filtered venues: {filteredVenues.length}</p>
                <p>Loading: {loading ? 'Yes' : 'No'}</p>
                {venues.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">Venue Details</summary>
                    <div className="mt-2 max-h-32 sm:max-h-40 overflow-y-auto">
                      {venues.map(venue => (
                        <div key={venue.id} className="text-xs border-b border-yellow-200 py-1">
                          <strong>{venue.name}</strong> - {venue.type} - Status: {venue.status} - Active: {venue.is_active ? 'Yes' : 'No'} - Coords: {venue.latitude}, {venue.longitude}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Location Permission Notice */}
        {locationPermissionDenied && (
          <Card className="mb-4 bg-amber-50 border-amber-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-amber-800">Location access denied</p>
                  <p className="text-xs text-amber-700">
                    Enable location permission in your browser to see venues near you
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-4 sm:mb-6 bg-white border-brand-burgundy/10">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-burgundy/50" />
                <Input
                  placeholder="Search venues, locations..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10 border-brand-burgundy/20 focus:border-brand-gold h-10 sm:h-9"
                />
              </div>
              
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="px-2 sm:px-3 py-2 border border-brand-burgundy/20 rounded-md bg-white text-brand-burgundy text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="restaurant">Restaurants</option>
                  <option value="club">Clubs</option>
                  <option value="lounge">Lounges</option>
                </select>

                <select
                  value={filters.priceRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceRange: e.target.value }))}
                  className="px-2 sm:px-3 py-2 border border-brand-burgundy/20 rounded-md bg-white text-brand-burgundy text-sm"
                >
                  <option value="all">All Prices</option>
                  <option value="$">$ - Budget</option>
                  <option value="$$">$$ - Moderate</option>
                  <option value="$$$">$$$ - Premium</option>
                </select>

                <select
                  value={filters.minRating}
                  onChange={(e) => setFilters(prev => ({ ...prev, minRating: parseFloat(e.target.value) }))}
                  className="px-2 sm:px-3 py-2 border border-brand-burgundy/20 rounded-md bg-white text-brand-burgundy text-sm col-span-2 sm:col-span-1"
                >
                  <option value={0}>All Ratings</option>
                  <option value={4.5}>4.5+ Stars</option>
                  <option value={4.0}>4.0+ Stars</option>
                  <option value={3.5}>3.5+ Stars</option>
                </select>

                <Button
                  onClick={resetFilters}
                  variant="outline"
                  className="border-brand-burgundy/20 text-brand-burgundy hover:bg-brand-burgundy/5 col-span-2 sm:col-span-1 text-sm"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
            
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-4">
                <p className="text-xs sm:text-sm text-brand-burgundy/70">
                  Showing {filteredVenues.length} of {venues.length} venues
                </p>
                {gettingLocation && (
                  <div className="flex items-center gap-1 sm:gap-2 text-xs text-brand-burgundy/60">
                    <div className="w-3 h-3 border-2 border-brand-burgundy/30 border-t-brand-burgundy rounded-full animate-spin"></div>
                    <span>Getting your location...</span>
                  </div>
                )}
                {userLocation && !gettingLocation && userLocation.lat !== 6.5244 && (
                  <div className="flex items-center gap-1 sm:gap-2 text-xs text-green-600">
                    <Navigation className="h-3 w-3" />
                    <span>Location detected</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 sm:gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500"></div>
                  <span>Restaurants</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-purple-500"></div>
                  <span>Clubs</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-amber-500"></div>
                  <span>Lounges</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map Container */}
        <Card className="overflow-hidden shadow-xl border-brand-burgundy/10">
          <div className="h-[400px] sm:h-[500px] lg:h-[600px] relative">
            {/* My Location Button */}
            {userLocation && (
              <Button
                onClick={flyToUserLocation}
                className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10 bg-white text-brand-burgundy border border-brand-burgundy/20 hover:bg-brand-burgundy hover:text-white shadow-lg"
                size="sm"
              >
                <Navigation className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">My Location</span>
                <span className="sm:hidden">📍</span>
              </Button>
            )}
            {loading ? (
              <div className="flex items-center justify-center h-full bg-brand-cream/50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-brand-burgundy mx-auto mb-2 sm:mb-4"></div>
                  <p className="text-brand-burgundy text-sm sm:text-base">Loading venues...</p>
                </div>
              </div>
            ) : (
              <Map
                ref={mapRef}
                initialViewState={{
                  latitude: mapCenter.lat,
                  longitude: mapCenter.lng,
                  zoom: mapZoom
                }}
                style={{ width: "100%", height: "100%" }}
                mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                mapStyle="mapbox://styles/mapbox/light-v11"
                interactiveLayerIds={['venues']}
              >
                {/* User location marker */}
                {userLocation && (
                  <Marker latitude={userLocation.lat} longitude={userLocation.lng}>
                    <div className="relative">
                      <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                      <div className="absolute -top-1 -left-1 w-6 h-6 bg-blue-500/20 rounded-full animate-ping"></div>
                    </div>
                  </Marker>
                )}

                {/* Venue markers */}
                {filteredVenues.map(venue => (
                  <Marker
                    key={venue.id}
                    latitude={venue.lat}
                    longitude={venue.lng}
                    onClick={() => setSelectedVenue(venue)}
                  >
                    <div 
                      className="cursor-pointer transform hover:scale-110 transition-transform duration-200"
                      style={{ color: getMarkerColor(venue) }}
                    >
                      <div className="relative">
                        <div 
                          className="w-8 h-8 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: getMarkerColor(venue) }}
                        >
                          {getTypeIcon(venue.type)}
                        </div>
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                          <div 
                            className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                            style={{ borderTopColor: getMarkerColor(venue) }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </Marker>
                ))}

                {/* Venue popup */}
                {selectedVenue && (
                  <Popup
                    latitude={selectedVenue.lat}
                    longitude={selectedVenue.lng}
                    onClose={() => setSelectedVenue(null)}
                    closeButton={true}
                    closeOnClick={false}
                    offsetTop={-10}
                    className="venue-popup"
                    maxWidth="300px"
                  >
                    <div className="p-0 max-w-[280px] sm:max-w-sm">
                      <div className="relative">
                        <img
                          src={selectedVenue.image}
                          alt={selectedVenue.name}
                          className="w-full h-24 sm:h-32 object-cover rounded-t-lg"
                        />
                        <Badge 
                          className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-white/90 text-brand-burgundy text-xs"
                        >
                          {selectedVenue.type.charAt(0).toUpperCase() + selectedVenue.type.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="p-3 sm:p-4">
                        <h3 className="font-heading text-base sm:text-lg text-brand-burgundy mb-2">
                          {selectedVenue.name}
                        </h3>
                        
                        <div className="flex items-center gap-2 mb-2">
                          {selectedVenue.rating && (
                            <div className="flex items-center">
                              <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 fill-current" />
                              <span className="text-xs sm:text-sm font-medium ml-1">{selectedVenue.rating}</span>
                            </div>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {selectedVenue.price_range}
                          </Badge>
                        </div>

                        <p className="text-xs sm:text-sm text-brand-burgundy/70 mb-3 line-clamp-2">
                          {selectedVenue.description}
                        </p>

                        <div className="space-y-1 sm:space-y-2 text-xs text-brand-burgundy/60">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{selectedVenue.address}, {selectedVenue.city}</span>
                          </div>
                          
                          {selectedVenue.contact_phone && (
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{selectedVenue.contact_phone}</span>
                            </div>
                          )}
                        </div>

                        <Button
                          className="w-full mt-2 sm:mt-3 bg-brand-burgundy text-white hover:bg-brand-burgundy/90 text-xs sm:text-sm"
                          onClick={() => window.location.href = `/venues/${selectedVenue.id}`}
                        >
                          View Details & Book
                        </Button>
                      </div>
                    </div>
                  </Popup>
                )}
              </Map>
            )}
          </div>
        </Card>

        {/* Venues List */}
        <div className="mt-6 sm:mt-8">
          <h2 className="text-xl sm:text-2xl font-heading text-brand-burgundy mb-3 sm:mb-4">
            Featured Venues ({filteredVenues.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredVenues.slice(0, 6).map(venue => (
              <Card key={venue.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer bg-white border-brand-burgundy/10">
                <div className="relative h-36 sm:h-48">
                  <img
                    src={venue.image}
                    alt={venue.name}
                    className="w-full h-full object-cover"
                  />
                  <Badge 
                    className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-white/90 text-brand-burgundy text-xs"
                  >
                    {venue.type.charAt(0).toUpperCase() + venue.type.slice(1)}
                  </Badge>
                </div>
                
                <CardContent className="p-3 sm:p-4">
                  <h3 className="font-heading text-lg sm:text-xl text-brand-burgundy mb-2">
                    {venue.name}
                  </h3>
                  
                  <div className="flex items-center justify-between mb-2">
                    {venue.rating && (
                      <div className="flex items-center">
                        <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 fill-current" />
                        <span className="text-xs sm:text-sm font-medium ml-1">{venue.rating}</span>
                      </div>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {venue.price_range}
                    </Badge>
                  </div>

                  <p className="text-xs sm:text-sm text-brand-burgundy/70 mb-2 sm:mb-3 line-clamp-2">
                    {venue.description}
                  </p>

                  <div className="flex items-center gap-1 sm:gap-2 text-xs text-brand-burgundy/60 mb-2 sm:mb-3">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{venue.city}</span>
                  </div>

                  <Button
                    className="w-full bg-brand-burgundy text-white hover:bg-brand-burgundy/90 text-xs sm:text-sm"
                    onClick={() => window.location.href = `/venues/${venue.id}`}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;