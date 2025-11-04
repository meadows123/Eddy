import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Star, Heart } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { getAvailableTimeSlots, savedVenuesApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

const VenueCard = ({ venue }) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState('');
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check if venue is already saved when component mounts
  useEffect(() => {
    if (user && venue.id) {
      checkIfVenueIsSaved();
    }
  }, [user, venue.id]);

  // Get available times when date changes
  useEffect(() => {
    if (selectedDate && venue.id) {
      fetchAvailableTimes();
    }
  }, [selectedDate, venue.id]);

  const checkIfVenueIsSaved = async () => {
    if (!user || !venue.id) return;
    
    try {
      const { data, error } = await supabase
        .from('saved_venues')
        .select('id')
        .eq('user_id', user.id)
        .eq('venue_id', venue.id)
        .single();
      
      if (!error && data) {
        setIsSaved(true);
      } else {
        setIsSaved(false);
      }
    } catch (error) {
      // If no saved venue found, it's not saved
      setIsSaved(false);
    }
  };

  const handleSaveVenue = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to save venues',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (isSaved) {
        // Remove from saved venues
        await savedVenuesApi.removeSavedVenue(user.id, venue.id);
        setIsSaved(false);
        toast({
          title: 'Venue Removed',
          description: `${venue.name} removed from saved venues`,
        });
      } else {
        // Add to saved venues
        await savedVenuesApi.saveVenue(user.id, venue.id);
        setIsSaved(true);
        toast({
          title: 'Venue Saved!',
          description: `${venue.name} added to saved venues`,
        });
      }
    } catch (error) {
      console.error('Error saving/unsaving venue:', error);
      toast({
        title: 'Error',
        description: 'Failed to save venue. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const fetchAvailableTimes = async () => {
    setLoading(true);
    try {
      const { data, error } = await getAvailableTimeSlots(venue.id, selectedDate);
      if (error) throw error;
      setAvailableTimes(data || []);
    } catch (error) {
      console.error('Error fetching available times:', error);
      setAvailableTimes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Card className="overflow-hidden h-full flex flex-col bg-white border-brand-burgundy/10 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
        <div className="relative aspect-square overflow-hidden">
          <img
            src={venue.images && venue.images.length > 0 
              ? venue.images[0] 
              : "https://images.unsplash.com/photo-1699990320295-ecd2664079ab"
            }
            alt={venue.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          
          {/* Heart Icon - Save Venue */}
          <button 
            className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-200 ${
              isSaved 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-white/80 hover:bg-white'
            }`}
            onClick={handleSaveVenue}
            disabled={saving}
            title={isSaved ? 'Remove from saved' : 'Save venue'}
          >
            <Heart 
              className={`h-4 w-4 transition-colors ${
                isSaved 
                  ? 'text-white fill-white' 
                  : 'text-brand-burgundy/60 hover:text-red-500'
              }`}
            />
          </button>
          
          {/* Top Pick Badge */}
          {venue.rating >= 4.7 && (
            <div className="absolute top-3 left-3">
              <span className="bg-brand-gold text-brand-burgundy px-3 py-1 text-xs font-semibold rounded-full shadow">
                Top Pick
              </span>
            </div>
          )}
        </div>

        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-heading text-brand-burgundy">{venue.name}</CardTitle>
          {/* Location under the name */}
          {venue.city && (
            <div className="flex items-center text-sm text-brand-burgundy/70 mt-1">
              <MapPin className="h-4 w-4 mr-1 text-brand-gold" />
              {venue.city}
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-grow pt-0">
          <p className="text-sm text-brand-burgundy/70 mb-3 line-clamp-2">{venue.description}</p>
          
          {/* Venue type as a tag */}
          {venue.type && (
            <div className="flex items-center text-xs text-brand-burgundy/80 mb-2">
              <span className="bg-brand-cream text-brand-burgundy px-2 py-1 rounded-full">{venue.type}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center text-sm text-brand-gold">
              <Star className="h-4 w-4 fill-current mr-1" /> 
              {venue.rating}
            </div>
          </div>
          
          {venue.cuisine && Array.isArray(venue.cuisine) && venue.cuisine.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {venue.cuisine.slice(0, 2).map((cuisine, index) => (
                <span key={index} className="text-xs bg-brand-cream text-brand-burgundy px-2 py-1 rounded-full">
                  {cuisine}
                </span>
              ))}
              {venue.cuisine.length > 2 && (
                <span className="text-xs text-brand-burgundy/60">+{venue.cuisine.length - 2} more</span>
              )}
            </div>
          )}
          
          {venue.music && Array.isArray(venue.music) && venue.music.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {venue.music.slice(0, 2).map((music, index) => (
                <span key={index} className="text-xs bg-brand-cream text-brand-burgundy px-2 py-1 rounded-full">
                  {music}
                </span>
              ))}
              {venue.music.length > 2 && (
                <span className="text-xs text-brand-burgundy/60">+{venue.music.length - 2} more</span>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-2">
          <Button asChild className="w-full bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90 transition-opacity rounded-md">
            <Link to={`/venues/${venue.id}`}>View Details & Book</Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default VenueCard;