import React from 'react';
import UserProfilePage from './UserProfilePage';

const ProfilePage = () => {
  console.log('🔍 ProfilePage wrapper is rendering');
  
  // Temporary simple test component
  return (
    <div className="min-h-screen bg-brand-cream/50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-brand-burgundy mb-4">Profile Page Test</h1>
        <p className="text-brand-burgundy/70 mb-4">This is a simple test to see if the profile page loads.</p>
        <div className="bg-green-100 p-4 rounded">
          <p className="text-green-800">✅ Profile page is working!</p>
        </div>
      </div>
    </div>
  );
  
  // Uncomment this to test the full component
  // return <UserProfilePage />;
};

export default ProfilePage; 