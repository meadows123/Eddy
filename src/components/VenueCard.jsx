import React from 'react';
import { MapPin, Star, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const VenueCard = ({ venue }) => {
  return (
    <Link to={`/venues/${venue.id}`} className="block group">
      <div className="space-y-3">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-xl bg-brand-cream">
          <img
            src={venue.images && venue.images.length > 0 
              ? venue.images[0] 
              : "https://images.unsplash.com/photo-1699990320295-ecd2664079ab"
            }
            alt={venue.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          
          {/* Heart Icon */}
          <button 
            className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Add to favorites logic here
            }}
          >
            <Heart className="h-4 w-4 text-brand-burgundy/60 hover:text-red-500 transition-colors" />
          </button>
          
          {/* Top Pick Badge */}
          {venue.rating >= 4.7 && (
            <div className="absolute top-3 left-3">
              <span className="bg-brand-gold text-brand-burgundy px-2 py-1 text-xs font-medium rounded-md shadow-sm">
                Top Pick
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-1">
          {/* Location and Rating */}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-brand-burgundy/70 text-sm">
              <MapPin className="h-4 w-4 mr-1 text-brand-gold" />
              <span className="truncate">{venue.location}</span>
            </div>
            <div className="flex items-center">
              <Star className="h-4 w-4 fill-brand-gold text-brand-gold mr-1" />
              <span className="text-sm font-medium text-brand-burgundy">{venue.rating}</span>
            </div>
          </div>

          {/* Venue Name */}
          <h3 className="font-medium text-brand-burgundy truncate group-hover:text-brand-burgundy/80 transition-colors">
            {venue.name}
          </h3>

          {/* Venue Type */}
          <p className="text-brand-burgundy/70 text-sm">{venue.type}</p>

          {/* Description */}
          <p className="text-brand-burgundy/70 text-sm line-clamp-2 leading-relaxed">
            {venue.description}
          </p>

          {/* Cuisine/Music Tags */}
          {((venue.cuisine && venue.cuisine.length > 0) || (venue.music && venue.music.length > 0)) && (
            <div className="flex flex-wrap gap-1 pt-1">
              {venue.cuisine && venue.cuisine.slice(0, 2).map((cuisine, index) => (
                <span 
                  key={`cuisine-${index}`} 
                  className="inline-block bg-brand-cream text-brand-burgundy text-xs px-2 py-1 rounded-md"
                >
                  {cuisine}
                </span>
              ))}
              {venue.music && venue.music.slice(0, 1).map((music, index) => (
                <span 
                  key={`music-${index}`} 
                  className="inline-block bg-brand-cream text-brand-burgundy text-xs px-2 py-1 rounded-md"
                >
                  {music}
                </span>
              ))}
            </div>
          )}

          {/* Booking Info */}
          <div className="pt-1">
            <span className="text-brand-burgundy font-medium">Available for booking</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default VenueCard;