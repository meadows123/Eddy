import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Tag, Star } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const VenueCard = ({ venue }) => {
  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Card className="overflow-hidden h-full flex flex-col bg-white border-brand-burgundy/10 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
        <div className="relative h-56 overflow-hidden">
          <img 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            alt={`${venue.name} venue image`}
            src={venue.images && venue.images.length > 0 
              ? venue.images[0] 
              : "https://images.unsplash.com/photo-1699990320295-ecd2664079ab"
            } 
          />
          {venue.rating >= 4.7 && (
            <div className="absolute top-3 right-3">
              <span className="bg-brand-gold text-brand-burgundy px-3 py-1 text-xs font-semibold rounded-full shadow">Top Pick</span>
            </div>
          )}
        </div>
        
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl font-heading text-brand-burgundy">{venue.name}</CardTitle>
          {/* Location under the name */}
          {venue.location && (
            <div className="flex items-center text-sm text-brand-burgundy/70 mt-1">
              <MapPin className="h-4 w-4 mr-1 text-brand-gold" />
              {venue.location}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="flex-grow pt-0">
          <p className="text-sm text-brand-burgundy/70 mb-3 line-clamp-2">{venue.description}</p>
          {/* Venue type as a tag */}
          {venue.type && (
            <div className="flex items-center text-xs text-brand-burgundy/80 mb-2">
              <Tag className="h-4 w-4 mr-1 text-brand-gold" />
              {venue.type}
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