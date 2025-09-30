import React from 'react';
import CameraQRScanner from '../../components/CameraQRScanner';
import BackToDashboardButton from '../../components/BackToDashboardButton';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { QrCode } from 'lucide-react';

const QRScannerPage = () => {
  return (
    <div className="bg-brand-cream/50 min-h-screen">
      <div className="w-full py-2 sm:py-4 md:py-8 px-2 sm:px-4 md:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 md:mb-8">
          <div className="text-center sm:text-left mb-3 sm:mb-0">
            <div className="flex items-center justify-center sm:justify-start mb-2">
              <BackToDashboardButton className="mr-2 sm:mr-4" />
            </div>
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-heading text-brand-burgundy mb-1 sm:mb-2">
              QR Code Scanner
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-brand-burgundy/70">
              Scan member QR codes for verification and entry.
            </p>
          </div>
        </div>

        {/* QR Scanner Section */}
        <Card className="bg-white border-brand-burgundy/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-brand-burgundy text-lg sm:text-xl">
              <QrCode className="h-5 w-5 text-brand-gold" />
              Live Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 sm:pt-3 px-2 sm:px-3 pb-2 sm:pb-3">
            <CameraQRScanner onMemberScanned={(data) => console.log('Member scanned:', data)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QRScannerPage;
