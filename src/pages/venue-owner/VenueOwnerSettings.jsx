import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

const VenueOwnerSettings = () => {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-heading text-brand-burgundy mb-6">Venue Settings</h1>
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="bg-white p-1 rounded-lg border border-brand-burgundy/10 mb-4">
          <TabsTrigger value="profile" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy">
            Venue Profile
          </TabsTrigger>
          <TabsTrigger value="staff" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy">
            Staff Management
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-brand-gold data-[state=active]:text-brand-burgundy">
            Notification Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle>Venue Profile</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Venue profile form goes here */}
              <p className="text-brand-burgundy/70">Edit your venue details, address, contact info, images, and more.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle>Staff Management</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Staff management UI goes here */}
              <p className="text-brand-burgundy/70">Add, remove, or update staff members who can help manage your venue.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="bg-white border-brand-burgundy/10">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Notification preferences UI goes here */}
              <p className="text-brand-burgundy/70">Set your email and SMS notification preferences for bookings and other events.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VenueOwnerSettings; 