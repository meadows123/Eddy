import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SplashScreen = ({ onComplete, durationMs = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onComplete();
        }, 300);
      }, 500); // Add transition delay
    }, durationMs);

    return () => clearTimeout(timer);
  }, [onComplete, durationMs]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#5B0202]"
        >
          <motion.div
            className="flex flex-col items-center justify-center"
            animate={isTransitioning ? {
              scale: 0.8,
              opacity: 0.7
            } : {}}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <motion.img
              src="logos/Logo1-Trans.png"
              alt="Eddy's Members"
              className="w-32 h-32 md:w-40 md:h-40 object-contain" // Slightly smaller for better transition
              initial={{ scale: 0.92, opacity: 0.85 }}
              animate={!isTransitioning ? {
                scale: [1, 1.05, 1],
                rotate: [0, 2, 0],
                y: [0, -8, 0],
                opacity: 1,
                filter: [
                  'drop-shadow(0 0 0 rgba(212,175,55,0.0))',
                  'drop-shadow(0 8px 22px rgba(212,175,55,0.35))',
                  'drop-shadow(0 0 0 rgba(212,175,55,0.0))'
                ]
              } : {
                scale: 0.8,
                opacity: 0.7
              }}
              transition={{ 
                duration: isTransitioning ? 0.5 : 2.6, 
                repeat: isTransitioning ? 0 : Infinity, 
                ease: 'easeInOut' 
              }}
              onError={(e) => {
                if (e.currentTarget.src.includes('Logo1-Trans.png')) {
                  e.currentTarget.src = 'logos/Logo1-Trans-new.png';
                } else if (e.currentTarget.src.includes('Logo1-Trans-new.png')) {
                  e.currentTarget.src = 'logos/Logo-Trans.png';
                } else {
                  e.currentTarget.style.display = 'none';
                }
              }}
            />
            {!isTransitioning && (
              <motion.div
                className="mt-4 text-[#D4AF37] text-sm font-light tracking-wider"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              >
                EDDYS MEMBERS
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen; 