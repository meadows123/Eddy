import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Star, Users, MapPin, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const VenueCard = ({ venue }) => {
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
            alt={`${venue.name} - ${venue.venueType} in ${venue.location}`}
           src="https://images.unsplash.com/photo-1699990320295-ecd2664079ab" />
          
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
            <div className="absolute top-3 left-3">
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
            <MapPin className="h-3.5 w-3.5 mr-1 text-brand-gold" /> {venue.address || venue.location}
          </p>
        </CardHeader>
        
        <CardContent className="flex-grow pt-0 pb-4">
          <p className="text-sm text-brand-burgundy/70 mb-4 line-clamp-2 font-body">{venue.description}</p>
          
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-brand-burgundy/70 font-body">
            <div className="flex items-center">
              <Tag className="h-3.5 w-3.5 mr-1.5 text-brand-gold" />
              <span>{venue.venueType}</span>
            </div>
            <div className="flex items-center">
              <Users className="h-3.5 w-3.5 mr-1.5 text-brand-gold" />
              <span>Up to {venue.capacity} guests</span>
            </div>
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
