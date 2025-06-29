import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import { supabase } from '../lib/supabase';
import { MapPin, Star, DollarSign, Users, Phone, Mail, ExternalLink, Filter, Search } from 'lucide-react';
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
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      () => {
        // Fallback to Lagos coordinates
        setUserLocation({ lat: 6.5244, lng: 3.3792 });
      }
    );
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
          console.log('No venues found in database');
          setVenues([]);
          setFilteredVenues([]);
          return;
        }

        // Transform venues with proper coordinates and images
        const venuesWithData = data.map(venue => {
          const primaryImage = venue.venue_images?.find(img => img.is_primary)?.image_url || 
                              venue.venue_images?.[0]?.image_url || 
                              'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4';
          
          return {
            ...venue,
            lat: venue.latitude || 6.5244,
            lng: venue.longitude || 3.3792,
            image: primaryImage,
            priceLevel: venue.price_range?.length || 1
          };
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

  // Auto-fit map to venues
  useEffect(() => {
    if (!mapRef.current || !filteredVenues.length) return;
    
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
  }, [filteredVenues]);

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

  return (
    <div className="bg-brand-cream min-h-screen">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-heading text-brand-burgundy mb-4">Explore Lagos Venues</h1>
          <p className="text-brand-burgundy/70 text-lg">Discover the best restaurants, clubs, and lounges on our interactive map</p>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-white border-brand-burgundy/10">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-burgundy/50" />
                <Input
                  placeholder="Search venues, locations..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10 border-brand-burgundy/20 focus:border-brand-gold"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="px-3 py-2 border border-brand-burgundy/20 rounded-md bg-white text-brand-burgundy"
                >
                  <option value="all">All Types</option>
                  <option value="restaurant">Restaurants</option>
                  <option value="club">Clubs</option>
                  <option value="lounge">Lounges</option>
                </select>

                <select
                  value={filters.priceRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceRange: e.target.value }))}
                  className="px-3 py-2 border border-brand-burgundy/20 rounded-md bg-white text-brand-burgundy"
                >
                  <option value="all">All Prices</option>
                  <option value="$">$ - Budget</option>
                  <option value="$$">$$ - Moderate</option>
                  <option value="$$$">$$$ - Premium</option>
                </select>

                <select
                  value={filters.minRating}
                  onChange={(e) => setFilters(prev => ({ ...prev, minRating: parseFloat(e.target.value) }))}
                  className="px-3 py-2 border border-brand-burgundy/20 rounded-md bg-white text-brand-burgundy"
                >
                  <option value={0}>All Ratings</option>
                  <option value={4.5}>4.5+ Stars</option>
                  <option value={4.0}>4.0+ Stars</option>
                  <option value={3.5}>3.5+ Stars</option>
                </select>

                <Button
                  onClick={resetFilters}
                  variant="outline"
                  className="border-brand-burgundy/20 text-brand-burgundy hover:bg-brand-burgundy/5"
                >
                  Clear
                </Button>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-brand-burgundy/70">
                Showing {filteredVenues.length} of {venues.length} venues
              </p>
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Restaurants</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span>Clubs</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span>Lounges</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map Container */}
        <Card className="overflow-hidden shadow-xl border-brand-burgundy/10">
          <div className="h-[600px] relative">
            {loading ? (
              <div className="flex items-center justify-center h-full bg-brand-cream/50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-burgundy mx-auto mb-4"></div>
                  <p className="text-brand-burgundy">Loading venues...</p>
                </div>
              </div>
            ) : (
              <Map
                ref={mapRef}
                initialViewState={{
                  latitude: userLocation?.lat || 6.5244,
                  longitude: userLocation?.lng || 3.3792,
                  zoom: 11
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
                  >
                    <div className="p-0 max-w-sm">
                      <div className="relative">
                        <img
                          src={selectedVenue.image}
                          alt={selectedVenue.name}
                          className="w-full h-32 object-cover rounded-t-lg"
                        />
                        <Badge 
                          className="absolute top-2 right-2 bg-white/90 text-brand-burgundy"
                        >
                          {selectedVenue.type.charAt(0).toUpperCase() + selectedVenue.type.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="p-4">
                        <h3 className="font-heading text-lg text-brand-burgundy mb-2">
                          {selectedVenue.name}
                        </h3>
                        
                        <div className="flex items-center gap-2 mb-2">
                          {selectedVenue.rating && (
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                              <span className="text-sm font-medium ml-1">{selectedVenue.rating}</span>
                            </div>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {selectedVenue.price_range}
                          </Badge>
                        </div>

                        <p className="text-sm text-brand-burgundy/70 mb-3 line-clamp-2">
                          {selectedVenue.description}
                        </p>

                        <div className="space-y-2 text-xs text-brand-burgundy/60">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            <span>{selectedVenue.address}, {selectedVenue.city}</span>
                          </div>
                          
                          {selectedVenue.contact_phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              <span>{selectedVenue.contact_phone}</span>
                            </div>
                          )}
                        </div>

                        <Button
                          className="w-full mt-3 bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
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
        <div className="mt-8">
          <h2 className="text-2xl font-heading text-brand-burgundy mb-4">
            Featured Venues ({filteredVenues.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVenues.slice(0, 6).map(venue => (
              <Card key={venue.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer bg-white border-brand-burgundy/10">
                <div className="relative h-48">
                  <img
                    src={venue.image}
                    alt={venue.name}
                    className="w-full h-full object-cover"
                  />
                  <Badge 
                    className="absolute top-3 right-3 bg-white/90 text-brand-burgundy"
                  >
                    {venue.type.charAt(0).toUpperCase() + venue.type.slice(1)}
                  </Badge>
                </div>
                
                <CardContent className="p-4">
                  <h3 className="font-heading text-xl text-brand-burgundy mb-2">
                    {venue.name}
                  </h3>
                  
                  <div className="flex items-center justify-between mb-2">
                    {venue.rating && (
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium ml-1">{venue.rating}</span>
                      </div>
                    )}
                    <Badge variant="outline">
                      {venue.price_range}
                    </Badge>
                  </div>

                  <p className="text-sm text-brand-burgundy/70 mb-3 line-clamp-2">
                    {venue.description}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-brand-burgundy/60 mb-3">
                    <MapPin className="h-3 w-3" />
                    <span>{venue.city}</span>
                  </div>

                  <Button
                    className="w-full bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
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