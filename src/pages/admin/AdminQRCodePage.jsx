import React from 'react';
import { motion } from 'framer-motion';
import { QrCode, AlertTriangle, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AdminQRCodePage = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <h1 className="text-3xl font-bold flex items-center"><QrCode className="mr-3 h-8 w-8 text-primary" />QR Code Generator</h1>

      <Card className="bg-secondary/30 border-border/50 glass-effect">
        <CardHeader>
          <CardTitle>Generate QR Codes for Bookings & Check-in</CardTitle>
          <CardDescription>
            Create unique QR codes for tickets, table reservations, or special promotions to streamline guest entry and tracking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="qr-data">Data for QR Code (e.g., Booking ID, URL)</Label>
            <Input id="qr-data" placeholder="Enter data here..." />
          </div>
          <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-accent-foreground">
            Generate QR Code
          </Button>

          <div className="mt-8 p-6 border border-dashed border-border/70 rounded-lg text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
            <h4 className="font-semibold">QR Code Preview Area</h4>
            <p className="text-sm text-muted-foreground">Generated QR codes will appear here.</p>
            <img  alt="Placeholder for a generated QR code" className="mt-4 rounded-md shadow-sm border border-border/50 max-w-xs mx-auto" src="https://images.unsplash.com/photo-1665292591084-e8524e64f918" />
            <Button variant="outline" className="mt-4" disabled>
              <Download className="mr-2 h-4 w-4" /> Download QR Code
            </Button>
          </div>
        </CardContent>
      </Card>
       <Card className="bg-secondary/30 border-border/50 glass-effect">
        <CardHeader>
          <CardTitle>Batch QR Code Generation</CardTitle>
          <CardDescription>
            Upload a CSV file with booking data to generate multiple QR codes at once. (Feature coming soon)
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Input type="file" disabled />
           <Button className="mt-2" disabled>Upload & Generate Batch</Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminQRCodePage;