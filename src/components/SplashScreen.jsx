import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SplashScreen = ({ onComplete, durationMs = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete();
      }, 300);
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
          <motion.img
            src="logos/Logo1-Trans.png"
            alt="Eddy's Members"
            className="w-40 h-40 md:w-52 md:h-52 object-contain"
            initial={{ scale: 0.92, opacity: 0.85 }}
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 2, 0],
              y: [0, -8, 0],
              opacity: 1,
              filter: [
                'drop-shadow(0 0 0 rgba(212,175,55,0.0))',
                'drop-shadow(0 8px 22px rgba(212,175,55,0.35))',
                'drop-shadow(0 0 0 rgba(212,175,55,0.0))'
              ]
            }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen; 