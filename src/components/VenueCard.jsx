import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Star, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const VenueCard = ({ venue }) => {
  return (
    <Link to={`/venues/${venue.id}`} className="block">
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="group cursor-pointer"
      >
        {/* Image Container */}
        <div className="relative mb-3">
          <div className="aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
            <img 
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" 
              alt={`${venue.name} venue`}
              src={venue.images && venue.images.length > 0 
                ? venue.images[0] 
                : "https://images.unsplash.com/photo-1699990320295-ecd2664079ab"
              } 
            />
          </div>
          
          {/* Top Pick Badge */}
          {venue.rating >= 4.7 && (
            <div className="absolute top-3 left-3">
              <span className="bg-white text-gray-800 px-2 py-1 text-xs font-medium rounded-md shadow-sm">
                Top Pick
              </span>
            </div>
          )}
          
          {/* Heart Icon */}
          <button className="absolute top-3 right-3 p-2 hover:scale-110 transition-transform">
            <Heart className="h-5 w-5 text-white/80 hover:text-red-500 transition-colors" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-2">
          {/* Location and Rating */}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-gray-600 text-sm">
              <MapPin className="h-4 w-4 mr-1" />
              {venue.location || 'Lagos'}
            </div>
            <div className="flex items-center">
              <Star className="h-4 w-4 fill-gray-900 text-gray-900 mr-1" />
              <span className="text-sm font-medium text-gray-900">
                {venue.rating}
              </span>
            </div>
          </div>

          {/* Venue Name */}
          <h3 className="font-medium text-gray-900 line-clamp-1 group-hover:text-gray-700 transition-colors">
            {venue.name}
          </h3>

          {/* Venue Type */}
          <p className="text-gray-600 text-sm">
            {venue.type}
          </p>

          {/* Description */}
          <p className="text-gray-600 text-sm line-clamp-2">
            {venue.description}
          </p>

          {/* Cuisine/Music Tags */}
          {((venue.cuisine && venue.cuisine.length > 0) || (venue.music && venue.music.length > 0)) && (
            <div className="flex flex-wrap gap-1 pt-1">
              {venue.cuisine && venue.cuisine.slice(0, 2).map((cuisine, index) => (
                <span key={`cuisine-${index}`} className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md">
                  {cuisine}
                </span>
              ))}
              {venue.music && venue.music.slice(0, 1).map((music, index) => (
                <span key={`music-${index}`} className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md">
                  {music}
                </span>
              ))}
              {((venue.cuisine?.length || 0) + (venue.music?.length || 0)) > 3 && (
                <span className="text-xs text-gray-500">
                  +{((venue.cuisine?.length || 0) + (venue.music?.length || 0)) - 3} more
                </span>
              )}
            </div>
          )}

          {/* Price/Booking Info */}
          <div className="pt-2">
            <div className="flex items-baseline">
              <span className="font-semibold text-gray-900">Book now</span>
              <span className="text-gray-600 text-sm ml-1">· Available</span>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

export default VenueCard;