import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen as CapacitorSplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';

const App = () => {
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  console.log('🚀 App component rendering');

  // Initialize app and hide native splash screen
  useEffect(() => {
    console.log(' useEffect running - initializing app');
    const initializeApp = async () => {
      try {
        console.log(' Starting app initialization');
        if (Capacitor.isNativePlatform()) {
          console.log('🔧 Hiding native splash screen');
          await CapacitorSplashScreen.hide();
          console.log('✅ Native splash screen hidden');
        }
        
        console.log('🔧 Setting app as ready');
        setAppReady(true);
        console.log('✅ App is ready');
      } catch (error) {
        console.error('❌ Error initializing app:', error);
        setAppReady(true);
      }
    };

    initializeApp();
  }, []);

  // Handle splash screen completion
  const handleSplashComplete = () => {
    console.log('🎬 Custom splash screen completed');
    setShowSplashScreen(false);
  };

  if (!appReady) {
    console.log('⏳ App not ready yet, returning null');
    return null;
  }

  console.log(' Rendering app content');
  return (
    <Router>
      <div>
        {showSplashScreen ? (
          <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            backgroundColor: '#5B0202', 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            zIndex: 9999
          }}>
            <h1>Custom Splash Screen</h1>
            <p>Loading...</p>
            <button 
              onClick={handleSplashComplete}
              style={{
                padding: '10px 20px',
                backgroundColor: 'white',
                color: '#5B0202',
                border: 'none',
                borderRadius: '5px',
                marginTop: '20px'
              }}
            >
              Skip Splash
            </button>
          </div>
        ) : (
          <div>
            <h1>Main App Content - Splash Complete!</h1>
            <p>Basic routing works!</p>
          </div>
        )}
      </div>
    </Router>
  );
};

export default App;