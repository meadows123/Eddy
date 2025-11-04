import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const AppRedirectPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const path = searchParams.get('path');
    const params = searchParams.get('params');
    const fallback = searchParams.get('fallback');

    if (!path) {
      navigate('/');
      return;
    }

    // Try to open the app first
    const openApp = () => {
      setIsRedirecting(true);
      
      // Parse parameters
      let queryParams = '';
      if (params) {
        try {
          const parsedParams = JSON.parse(params);
          queryParams = Object.keys(parsedParams)
            .map(key => `${key}=${encodeURIComponent(parsedParams[key])}`)
            .join('&');
        } catch (e) {
          console.error('Error parsing params:', e);
        }
      }

      // Create app deep link
      const appDeepLink = `oneeddy://${path}${queryParams ? `?${queryParams}` : ''}`;
      
      // Try to open the app
      window.location.href = appDeepLink;
      
      // Set a timeout to redirect to web fallback if app doesn't open
      setTimeout(() => {
        if (fallback) {
          window.location.href = fallback;
        } else {
          navigate(`/${path}`);
        }
      }, 2000);
    };

    // Start countdown
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          openApp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-burgundy to-brand-gold flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
      >
        <div className="mb-6">
          <div className="w-20 h-20 bg-brand-burgundy rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Opening Eddys Members App</h1>
          <p className="text-gray-600">
            Redirecting you to the Eddys Members mobile app for the best experience...
          </p>
        </div>

        {!isRedirecting && (
          <div className="mb-6">
            <div className="text-4xl font-bold text-brand-burgundy mb-2">{countdown}</div>
            <p className="text-sm text-gray-500">Opening app in {countdown} seconds</p>
          </div>
        )}

        {isRedirecting && (
          <div className="mb-6">
            <div className="animate-spin w-8 h-8 border-4 border-brand-burgundy border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Opening app...</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => {
              const fallback = searchParams.get('fallback');
              if (fallback) {
                window.location.href = fallback;
              } else {
                const path = searchParams.get('path');
                navigate(`/${path}`);
              }
            }}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Open in Browser Instead
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full bg-brand-burgundy hover:bg-brand-burgundy/90 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Go to Homepage
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-3">Don't have the app?</p>
          <div className="flex justify-center space-x-3">
            <a
              href="https://apps.apple.com/app/idYOUR_IOS_APP_STORE_ID"
              className="inline-block"
            >
              <img
                src="https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg"
                alt="Download on the App Store"
                className="h-8"
              />
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.oneeddy.app"
              className="inline-block"
            >
              <img
                src="https://play.google.com/intl/en_us/badges/static/images/badge_web_generic.png"
                alt="Get it on Google Play"
                className="h-8"
              />
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AppRedirectPage;