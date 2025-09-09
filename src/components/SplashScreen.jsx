import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';

const SplashScreen = ({ onComplete, durationMs = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onComplete();
        }, 300);
      }, 500);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs, onComplete]);

  // Don't render the React splash screen on native platforms
  if (!isVisible || isNative) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: isTransitioning ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-brand-burgundy"
      >
        <div className="flex flex-col items-center justify-center space-y-8">
          <motion.img
            src="/logos/Logo1-Trans.png" // Added leading slash
            alt="Eddy's Members"
            className="w-32 h-32 md:w-40 md:h-40 object-contain"
            initial={{ scale: 0.92, opacity: 0.85 }}
            animate={!isTransitioning ? {
              scale: [0.92, 1.02, 1],
              opacity: [0.85, 1, 1]
            } : {
              scale: 0.95,
              opacity: 0
            }}
            transition={{
              duration: 1.2,
              ease: "easeOut",
              times: [0, 0.7, 1]
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-white text-xl font-semibold tracking-wider"
          >
            EDDY'S MEMBERS
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen; 