import React from 'react';
import CameraQRScanner from '../../components/CameraQRScanner';
import BackToDashboardButton from '../../components/BackToDashboardButton';

const QRScannerPage = () => {
  return (
    <div className="bg-brand-cream/50 min-h-screen">
      <div className="w-full py-2 sm:py-4 md:py-8 px-2 sm:px-4 md:px-6">
        <div className="flex items-center justify-start mb-4">
          <BackToDashboardButton className="mr-2" />
        </div>
        <CameraQRScanner onMemberScanned={(data) => console.log('Member scanned:', data)} />
      </div>
    </div>
  );
};

export default QRScannerPage;
