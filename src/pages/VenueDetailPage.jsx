import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, MapPin, ArrowLeft, Share2, Heart, CheckCircle, Utensils, Music2, Wifi, Car, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

const VenueDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const fetchVenue = async () => {
      setLoading(true);
      try {
        // Fetch venue data
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

        setVenue({
          ...venueData,
          images: imagesData?.map(img => img.image_url) || []
        });

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
    try {
      if (navigator.share) {
        await navigator.share({
          title: venue?.name,
          text: venue?.description,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied!",
          description: "Venue link has been copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
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

  // Mock data for reviews count
  const reviewCount = Math.floor(Math.random() * 50) + 10;

  return (
    <div className="min-h-screen bg-white">
      {/* Photo Gallery Header */}
      <div className="relative">
        <div className="aspect-square sm:aspect-video overflow-hidden">
          <img
            src={venue.images && venue.images.length > 0 
              ? venue.images[0] 
              : "https://images.unsplash.com/photo-1699990320295-ecd2664079ab"
            }
            alt={venue.name}
            className="w-full h-full object-cover"
          />
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
              <span className="font-medium text-brand-burgundy">{venue.rating}</span>
            </div>
            <span className="text-brand-burgundy/60">·</span>
            <span className="text-brand-burgundy/60 underline">{reviewCount} reviews</span>
            <span className="text-brand-burgundy/60">·</span>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-brand-burgundy/60" />
              <span className="text-brand-burgundy/60">{venue.location}</span>
            </div>
          </div>
        </div>

        {/* Additional Venue Image */}
        {venue.images && venue.images.length > 1 && (
          <div className="aspect-video rounded-xl overflow-hidden">
            <img
              src={venue.images[1] || venue.images[0]}
              alt={`${venue.name} interior`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* What makes this place special */}
        <div>
          <h2 className="text-xl font-semibold text-brand-burgundy mb-4">What makes this place special</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-brand-gold" />
              <span className="text-brand-burgundy">Premium dining experience with curated menu</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-brand-gold" />
              <span className="text-brand-burgundy">Live entertainment and music performances</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-brand-gold" />
              <span className="text-brand-burgundy">Exclusive VIP table service available</span>
            </div>
          </div>
        </div>

        {/* What this place offers */}
        <div>
          <h2 className="text-xl font-semibold text-brand-burgundy mb-4">What this place offers</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Utensils, title: "Fine Dining" },
              { icon: Music2, title: "Live Music" },
              { icon: Wifi, title: "Free WiFi" },
              { icon: Car, title: "Valet Parking" },
              { icon: Shield, title: "Security" },
              { icon: Users, title: "VIP Service" }
            ].map((amenity, index) => (
              <div key={index} className="flex items-center gap-3 py-2">
                <amenity.icon className="h-5 w-5 text-brand-burgundy/60" />
                <span className="text-brand-burgundy">{amenity.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <h2 className="text-xl font-semibold text-brand-burgundy mb-4">Where you'll be</h2>
          <div className="aspect-video bg-brand-cream rounded-xl flex items-center justify-center mb-3">
            <div className="text-center text-brand-burgundy/60">
              <MapPin className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Interactive map coming soon</p>
            </div>
          </div>
          <p className="text-brand-burgundy font-medium">{venue.location}, Lagos</p>
          <p className="text-brand-burgundy/60 text-sm mt-1">
            Located in the heart of Lagos with easy access to major attractions
          </p>
        </div>

        {/* Reviews */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 fill-brand-gold text-brand-gold" />
            <span className="text-xl font-semibold text-brand-burgundy">{venue.rating}</span>
            <span className="text-brand-burgundy/60">·</span>
            <span className="text-brand-burgundy/60">{reviewCount} reviews</span>
          </div>
          
          <div className="space-y-4">
            {[
              { name: "Sarah M.", rating: 5, comment: "Amazing atmosphere and excellent service. Perfect for special occasions!", avatar: "SM" },
              { name: "Mike O.", rating: 4, comment: "Great venue with fantastic food. The live music was a nice touch.", avatar: "MO" },
              { name: "Jennifer K.", rating: 5, comment: "Loved everything about this place. Will definitely be coming back!", avatar: "JK" }
            ].map((review, index) => (
              <div key={index} className="border-b border-gray-100 pb-4 last:border-b-0">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-brand-burgundy rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">{review.avatar}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-brand-burgundy">{review.name}</span>
                      <div className="flex items-center gap-1">
                        {[...Array(review.rating)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-brand-gold text-brand-gold" />
                        ))}
                      </div>
                    </div>
                    <p className="text-brand-burgundy/80 text-sm">{review.comment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <Button 
            variant="outline" 
            className="w-full mt-4 border-brand-burgundy/20 text-brand-burgundy hover:bg-brand-burgundy/5"
          >
            Show all {reviewCount} reviews
          </Button>
        </div>

        {/* Bottom padding for fixed button */}
        <div className="h-20"></div>
      </div>

      {/* Fixed Book Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-lg font-semibold text-brand-burgundy">Ready to book?</div>
            <div className="text-sm text-brand-burgundy/60">Reserve your table now</div>
          </div>
        </div>
        <Button 
          className="w-full bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90 h-12 text-base font-medium"
          onClick={() => navigate(`/venues/${id}/book`)}
        >
          Book Now
        </Button>
      </div>
    </div>
  );
};

export default VenueDetailPage;