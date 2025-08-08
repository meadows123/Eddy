import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SplashScreen = ({ onComplete, durationMs = 4000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete();
      }, 400);
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
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#5B0202]"
        >
          <motion.div
            initial={{ scale: 0.85, y: 8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="w-44 h-44 p-5 bg-white/95 rounded-2xl shadow-2xl flex items-center justify-center"
            style={{ filter: 'drop-shadow(0 8px 24px rgba(212, 175, 55, 0.35))' }}
          >
            <motion.img
              src="logos/Logo1-Trans.png"
              alt="Eddy's Members"
              className="w-full h-full object-contain"
              animate={{ scale: [1, 1.06, 1], rotate: [0, 1.5, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              onError={(e) => {
                if (e.target.src.includes('Logo1-Trans.png')) {
                  e.target.src = 'logos/Logo1-Trans-new.png';
                } else if (e.target.src.includes('Logo1-Trans-new.png')) {
                  e.target.src = 'logos/Logo-Trans.png';
                } else {
                  e.target.style.display = 'none';
                }
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen; 