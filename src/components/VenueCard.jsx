import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Star, Users, MapPin, Tag, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { savedVenuesApi } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

const VenueCard = ({ venue }) => {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if venue is saved when component mounts
  useEffect(() => {
    if (user && venue) {
      checkIfSaved();
    }
  }, [user, venue]);

  const checkIfSaved = async () => {
    try {
      const savedVenues = await savedVenuesApi.getSavedVenues(user.id);
      const isVenueSaved = savedVenues.some(saved => saved.venue_id === venue.id);
      setIsSaved(isVenueSaved);
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  };

  const handleToggleSave = async (e) => {
    e.preventDefault(); // Prevent navigation when clicking the heart
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to save venues",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isSaved) {
        await savedVenuesApi.removeSavedVenue(user.id, venue.id);
        setIsSaved(false);
        toast({
          title: "Venue removed",
          description: `${venue.name} has been removed from your saved venues`,
          className: "bg-red-50 border-red-200"
        });
      } else {
        await savedVenuesApi.saveVenue(user.id, venue.id);
        setIsSaved(true);
        toast({
          title: "Venue saved!",
          description: `${venue.name} has been added to your saved venues`,
          className: "bg-green-50 border-green-200"
        });
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      toast({
        title: "Error",
        description: "Failed to update saved venues. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -5, boxShadow: "0 10px 20px hsla(var(--primary), 0.1), 0 6px 6px hsla(var(--secondary), 0.05)" }}
      className="venue-card h-full group"
    >
      <Card className="overflow-hidden h-full flex flex-col bg-white border-brand-burgundy/10 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl">
        <div className="relative h-56 overflow-hidden">
          <img  
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            alt={`${venue.name} - ${venue.type} in ${venue.city}`}
            src={venue.images && venue.images.length > 0 
              ? venue.images[0] 
              : "https://images.unsplash.com/photo-1699990320295-ecd2664079ab"
            } />
          
          {/* Favorite Button */}
          <button
            onClick={handleToggleSave}
            disabled={isLoading}
            className={`absolute top-3 left-3 p-2 rounded-full transition-all duration-200 ${
              isSaved 
                ? 'bg-red-500 text-white shadow-lg hover:bg-red-600' 
                : 'bg-white/90 text-gray-600 hover:bg-white hover:text-red-500 shadow-md'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
            title={isSaved ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart 
              className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} 
            />
          </button>
          
          <div className="absolute top-3 right-3 flex gap-2">
            {venue.tags && venue.tags.slice(0, 1).map((tag, index) => (
              <Badge key={index} variant="secondary" className="bg-brand-gold text-brand-burgundy backdrop-blur-sm border-brand-gold/50 shadow-md">
                {tag}
              </Badge>
            ))}
            <Badge variant="default" className="bg-brand-burgundy text-brand-cream backdrop-blur-sm border-brand-burgundy/50 shadow-md">
              {venue.price_range || 'N/A'}
            </Badge>
          </div>
          
          {venue.isFeatured && (
            <div className="absolute bottom-3 left-3">
              <Badge className="bg-brand-gold text-brand-burgundy font-semibold shadow-lg">Featured</Badge>
            </div>
          )}
        </div>
        
        <CardHeader className="pb-3 pt-4">
          <div className="flex justify-between items-start">
            <CardTitle className="text-2xl font-heading text-brand-burgundy group-hover:text-brand-gold transition-colors duration-300">{venue.name}</CardTitle>
            <div className="flex items-center text-sm shrink-0 ml-2 mt-1">
              <Star className="h-4 w-4 fill-brand-gold text-brand-gold mr-1" />
              <span className="font-semibold text-brand-burgundy/80">{venue.rating}</span>
            </div>
          </div>
          <p className="text-xs text-brand-burgundy/60 flex items-center">
            <MapPin className="h-3.5 w-3.5 mr-1 text-brand-gold" /> {venue.address}
          </p>
        </CardHeader>
        
        <CardContent className="flex-grow pt-0 pb-4">
          <p className="text-sm text-brand-burgundy/70 mb-4 line-clamp-2 font-body">{venue.description}</p>
          
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-brand-burgundy/70 font-body">
            <div className="flex items-center">
              <Tag className="h-3.5 w-3.5 mr-1.5 text-brand-gold" />
              <span>{venue.type}</span>
            </div>
            {venue.capacity && (
              <div className="flex items-center">
                <Users className="h-3.5 w-3.5 mr-1.5 text-brand-gold" />
                <span>Up to {venue.capacity} guests</span>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="pt-2 pb-4 px-4">
          <Button asChild className="w-full bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90 transition-opacity rounded-md font-body py-3">
            <Link to={`/venues/${venue.id}`}>
              View Details & Book
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default VenueCard;
