import React from 'react';
import { motion } from 'framer-motion';

const ClubGallery = ({ images, clubName }) => {
  // If no images provided, don't render the gallery
  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Gallery</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.05 }}
            className="rounded-lg overflow-hidden aspect-square"
          >
            <img 
              className="w-full h-full object-cover" 
              alt={`${clubName} gallery image ${index + 1}`}
              src={image}
              onError={(e) => {
                e.target.src = "https://images.unsplash.com/photo-1513661296-6b1502d89c3d";
              }}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ClubGallery;