import React from 'react';
import CameraQRScanner from '../../components/CameraQRScanner';
import BackToDashboardButton from '../../components/BackToDashboardButton';
import { QrCode, Shield, Clock, Users } from 'lucide-react';

const QRScannerPage = () => {
  return (
    <div className="bg-gradient-to-br from-brand-cream via-white to-brand-cream/30 min-h-screen">
      <div className="w-full py-4 sm:py-6 md:py-8 px-4 sm:px-6 md:px-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <BackToDashboardButton className="mr-2" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading text-brand-burgundy font-bold">
                QR Scanner
              </h1>
              <p className="text-brand-burgundy/70 text-sm sm:text-base">
                Verify bookings and check in customers
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-2 bg-brand-gold/10 px-4 py-2 rounded-full">
            <QrCode className="h-5 w-5 text-brand-gold" />
            <span className="text-brand-burgundy font-medium">Active Scanner</span>
          </div>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-sm border border-brand-gold/20 rounded-xl p-4 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-brand-burgundy text-sm">Secure Verification</h3>
                <p className="text-brand-burgundy/60 text-xs">Real-time booking validation</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm border border-brand-gold/20 rounded-xl p-4 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-brand-burgundy text-sm">Instant Processing</h3>
                <p className="text-brand-burgundy/60 text-xs">Quick customer check-in</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm border border-brand-gold/20 rounded-xl p-4 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-brand-burgundy text-sm">Member Support</h3>
                <p className="text-brand-burgundy/60 text-xs">Eddys Members integration</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Scanner Component */}
        <div className="bg-white/90 backdrop-blur-sm border border-brand-gold/20 rounded-2xl shadow-2xl overflow-hidden">
          <CameraQRScanner onMemberScanned={(data) => console.log('Member scanned:', data)} />
        </div>

        {/* Footer Tips */}
        <div className="mt-8 bg-gradient-to-r from-brand-burgundy/5 to-brand-gold/5 border border-brand-burgundy/10 rounded-xl p-6">
          <h3 className="font-semibold text-brand-burgundy mb-3 flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Scanner Tips
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-brand-burgundy/80">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-brand-gold rounded-full mt-2 flex-shrink-0"></div>
              <p>Ensure good lighting for optimal QR code detection</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-brand-gold rounded-full mt-2 flex-shrink-0"></div>
              <p>Hold the camera steady and at a comfortable distance</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-brand-gold rounded-full mt-2 flex-shrink-0"></div>
              <p>Allow camera permissions when prompted</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-brand-gold rounded-full mt-2 flex-shrink-0"></div>
              <p>Scan both booking and member QR codes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScannerPage;
