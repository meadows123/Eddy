import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Map, { Marker } from 'react-map-gl';
import { Star, MapPin, ArrowLeft, Share2, Heart, CheckCircle, Utensils, Music2, Wifi, Car, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import BookingModal from '@/components/BookingModal';
import VenueReviews from '@/components/VenueReviews';
import { shareUrl, getFullUrl } from '@/lib/urlUtils';
import 'mapbox-gl/dist/mapbox-gl.css';

const VenueDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venue, setVenue] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const galleryRef = useRef(null);
  const [mapCoordinates, setMapCoordinates] = useState({ lat: 6.5244, lng: 3.3792 }); // Default to Lagos center

  // Geocode address to get coordinates
  const geocodeAddress = async (venueData) => {
    if (!venueData.address && !venueData.city) return;

    try {
      const addressString = [
        venueData.address,
        venueData.city,
        venueData.country || 'Nigeria'
      ].filter(Boolean).join(', ');

      const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
      if (!mapboxToken) {
        console.warn('Mapbox token not found, using default coordinates');
        return;
      }

      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addressString)}.json?access_token=${mapboxToken}&limit=1`;
      
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setMapCoordinates({ lat, lng });
        console.log('📍 Geocoded address:', { address: addressString, lat, lng });
      } else {
        console.warn('⚠️ No geocoding results found for:', addressString);
      }
    } catch (error) {
      console.error('❌ Error geocoding address:', error);
    }
  };

  useEffect(() => {
    const fetchVenue = async () => {
      setLoading(true);
      try {
        // Fetch venue data with coordinates
        const { data: venueData, error: venueError } = await supabase
          .from('venues')
          .select('*')
          .eq('id', id)
          .single();

        if (venueError) throw venueError;

        // Fetch images for this venue
        const { data: imagesData, error: imagesError } = await supabase
          .from('venue_images')
          .select('*')
          .eq('venue_id', id)
          .order('is_primary', { ascending: false });

        if (imagesError) {
          console.error('Error fetching images:', imagesError);
        }

        // Fetch reviews for this venue
        let reviewsData = [];
        try {
          // Try to fetch reviews with profiles join (constraint exists)
          const { data: reviewsResult, error: reviewsError } = await supabase
            .from('venue_reviews')
            .select(`
              *,
              profiles (
                id,
                first_name,
                last_name
              )
            `)
            .eq('venue_id', id)
            .order('created_at', { ascending: false });

          if (reviewsError) {
            console.error('Error fetching reviews with profiles:', reviewsError);
            
            // Fallback: fetch just reviews without profiles
            const { data: simpleReviews, error: simpleError } = await supabase
              .from('venue_reviews')
              .select('*')
              .eq('venue_id', id)
              .order('created_at', { ascending: false });
              
            if (simpleError) {
              console.error('Error fetching simple reviews:', simpleError);
              reviewsData = [];
            } else {
              reviewsData = simpleReviews || [];
            }
          } else {
            reviewsData = reviewsResult || [];
          }
        } catch (error) {
          console.error('Exception fetching reviews:', error);
          reviewsData = [];
        }

        const venueWithImages = {
          ...venueData,
          images: imagesData?.map(img => img.image_url) || []
        };

        setVenue(venueWithImages);
        setReviews(reviewsData);

        // Set map coordinates - use existing coordinates or geocode address
        if (venueData.latitude && venueData.longitude) {
          setMapCoordinates({
            lat: parseFloat(venueData.latitude),
            lng: parseFloat(venueData.longitude)
          });
        } else if (venueData.address || venueData.city) {
          // Geocode address if coordinates are missing
          geocodeAddress(venueData);
        }

        // Check if venue is in favorites
        const favorites = JSON.parse(localStorage.getItem('lagosvibe_favorites') || '[]');
        setIsFavorite(favorites.includes(id));
      } catch (error) {
        console.error('Error fetching venue:', error);
        toast({
          title: "Error",
          description: "Failed to load venue details",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchVenue();
    }
  }, [id, toast]);

  const handleBack = () => {
    navigate('/venues');
  };

  const handleShare = async () => {
    const shareData = {
      title: venue?.name,
      text: venue?.description,
      url: getFullUrl(`/venues/${id}`),
    };
    
    await shareUrl(shareData, toast);
  };

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('lagosvibe_favorites') || '[]');
    let newFavorites;
    
    if (isFavorite) {
      newFavorites = favorites.filter(fav => fav !== id);
    } else {
      newFavorites = [...favorites, id];
    }
    
    localStorage.setItem('lagosvibe_favorites', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
    
    toast({
      title: isFavorite ? "Removed from favorites" : "Added to favorites",
      description: isFavorite ? "Venue removed from your favorites" : "Venue added to your favorites",
    });
  };

  const handleGalleryScroll = () => {
    const container = galleryRef.current;
    if (!container) return;
    const index = Math.round(container.scrollLeft / container.clientWidth);
    setActiveImageIndex(Math.max(0, Math.min(index, (venue?.images?.length || 1) - 1)));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-brand-burgundy">Loading venue details...</div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-heading text-brand-burgundy mb-4">Venue not found</h2>
          <Button onClick={handleBack} className="bg-brand-burgundy text-brand-cream">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Debug logging
  console.log('🔍 VenueDetailPage Debug:', {
    venue: venue?.id,
    venueRating: venue?.rating
  });

  const images = (venue.images && venue.images.length > 0)
    ? venue.images
    : ["https://images.unsplash.com/photo-1699990320295-ecd2664079ab"]; 

  return (
    <div className="min-h-screen bg-white">
      {/* Photo Gallery Header */}
      <div className="relative">
        <div
          ref={galleryRef}
          onScroll={handleGalleryScroll}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {images.map((src, idx) => (
            <div key={idx} className="min-w-full aspect-square sm:aspect-video overflow-hidden snap-center">
              <img
                src={src}
                alt={`${venue.name} image ${idx + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          ))}
        </div>

        {/* Counter overlay */}
        <div className="absolute top-4 right-4 bg-black/55 text-white text-xs px-2 py-1 rounded-full">
          {activeImageIndex + 1}/{images.length}
        </div>

        {/* Header Icons */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
          <Button
            onClick={handleBack}
            variant="secondary"
            size="sm"
            className="bg-white/90 text-gray-800 hover:bg-white rounded-full p-2 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex gap-3">
            <Button
              onClick={handleShare}
              variant="secondary"
              size="sm"
              className="bg-white/90 text-gray-800 hover:bg-white rounded-full p-2 shadow-sm"
            >
              <Share2 className="h-5 w-5" />
            </Button>
            <Button
              onClick={toggleFavorite}
              variant="secondary"
              size="sm"
              className="bg-white/90 text-gray-800 hover:bg-white rounded-full p-2 shadow-sm"
            >
              <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6">
        {/* Venue Info */}
        <div>
          <h1 className="text-2xl font-semibold text-brand-burgundy mb-2">{venue.name}</h1>
          <p className="text-brand-burgundy/70 mb-4 leading-relaxed">
            {venue.description || "Experience the finest dining and entertainment at this premier Lagos venue."}
          </p>
          
          {/* Rating and Reviews */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5 fill-brand-gold text-brand-gold" />
              <span className="font-medium text-brand-burgundy">
                {reviews.length > 0 
                  ? (reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length).toFixed(1)
                  : venue.rating || '0.0'
                }
              </span>
            </div>
            <span className="text-brand-burgundy/60">·</span>
            <button
              onClick={() => {
                const reviewsSection = document.getElementById('reviews-section');
                if (reviewsSection) {
                  reviewsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="text-brand-burgundy/60 underline hover:text-brand-burgundy transition-colors"
            >
              {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
            </button>
            <span className="text-brand-burgundy/60">·</span>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-brand-burgundy/60" />
              <span className="text-brand-burgundy/60">{venue.city}</span>
            </div>
          </div>
        </div>

        {/* Section Divider */}
        <div className="border-t border-gray-200"></div>

        {/* Additional Venue Image */}
        {images.length > 1 && (
          <div className="aspect-video rounded-2xl overflow-hidden shadow-lg">
            <img
              src={images[1]}
              alt={`${venue.name} interior`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* What makes this place special */}
        {venue.special_features && venue.special_features.length > 0 && (
          <>
            {/* Section Divider */}
            <div className="border-t border-gray-200"></div>
            <div>
              <h2 className="text-xl font-semibold text-brand-burgundy mb-4">What makes this place special</h2>
              <div className="space-y-3">
                {venue.special_features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-brand-gold" />
                    <span className="text-brand-burgundy">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* What this place offers */}
        {venue.amenities && venue.amenities.length > 0 && (
          <>
            {/* Section Divider */}
            <div className="border-t border-gray-200"></div>
            <div>
              <h2 className="text-xl font-semibold text-brand-burgundy mb-4">What this place offers</h2>
              <div className="grid grid-cols-2 gap-4">
                {venue.amenities.map((amenity, index) => {
                  // Map amenity names to icons
                  const amenityIconMap = {
                    'Fine Dining': Utensils,
                    'Live Music': Music2,
                    'Free WiFi': Wifi,
                    'Valet Parking': Car,
                    'Parking': Car,
                    'Security': Shield,
                    'VIP Service': Users,
                    'Outdoor Seating': Utensils,
                    'Private Dining': Utensils,
                    'Bar Service': Utensils,
                    'Entertainment': Music2,
                    'Accessibility': Users
                  };
                  const IconComponent = amenityIconMap[amenity] || Utensils;
                  return (
                    <div key={index} className="flex items-center gap-3 py-2">
                      <IconComponent className="h-5 w-5 text-brand-burgundy/60" />
                      <span className="text-brand-burgundy">{amenity}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Location */}
        <div>
          <h2 className="text-xl font-semibold text-brand-burgundy mb-4">Where you'll be</h2>
          <div className="aspect-video rounded-2xl overflow-hidden mb-3 border border-gray-200 shadow-lg">
            <Map
              initialViewState={{
                latitude: mapCoordinates.lat,
                longitude: mapCoordinates.lng,
                zoom: 15
              }}
              style={{ width: "100%", height: "100%" }}
              mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
              mapStyle="mapbox://styles/mapbox/light-v11"
              attributionControl={false}
              scrollZoom={false}
              dragPan={false}
              doubleClickZoom={false}
              touchZoomRotate={false}
            >
              {/* Venue marker */}
              <Marker 
                latitude={mapCoordinates.lat} 
                longitude={mapCoordinates.lng}
              >
                <div className="relative">
                  <div className="w-8 h-8 bg-brand-burgundy rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                  <div className="absolute -top-1 -left-1 w-10 h-10 bg-brand-burgundy/20 rounded-full animate-ping"></div>
                </div>
              </Marker>
            </Map>
          </div>
          <p className="text-brand-burgundy font-medium">
            {venue.address ? `${venue.address}, ` : ''}{venue.city}
            {venue.country && venue.country !== 'Nigeria' && `, ${venue.country}`}
          </p>
          <p className="text-brand-burgundy/60 text-sm mt-1">
            {venue.city}{venue.country && `, ${venue.country}`}
          </p>
          <Button 
            variant="outline" 
            className="w-full mt-3 border-brand-burgundy/20 text-brand-burgundy hover:bg-brand-burgundy/5"
            onClick={() => {
              // Use coordinates if available, otherwise use address string
              const query = venue.latitude && venue.longitude
                ? `${venue.latitude},${venue.longitude}`
                : encodeURIComponent([
                    venue.address,
                    venue.city,
                    venue.country || 'Nigeria'
                  ].filter(Boolean).join(', '));
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
              window.open(mapsUrl, '_blank');
            }}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Open in Maps
          </Button>
        </div>

        {/* Section Divider */}
        <div className="border-t border-gray-200"></div>

        {/* Reviews */}
        <div id="reviews-section">
          <VenueReviews venueId={venue.id} venueName={venue.name} />
        </div>

        {/* Bottom padding for fixed button */}
        <div className="h-20"></div>
      </div>

      {/* Fixed Book Button - Moved up for better mobile UX */}
      <div className="fixed bottom-4 left-4 right-4 p-4 bg-white border border-gray-200 rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-lg font-semibold text-brand-burgundy">Ready to book?</div>
            <div className="text-sm text-brand-burgundy/60">Reserve your table now</div>
          </div>
        </div>
        <Button 
          className="w-full bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90 h-12 text-base font-medium"
          onClick={() => setIsBookingModalOpen(true)}
        >
          Book Now
        </Button>
      </div>

      {/* Booking Modal */}
      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        venue={venue}
      />
    </div>
  );
};

export default VenueDetailPage;