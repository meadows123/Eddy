import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { toast } from '../../components/ui/use-toast';
import { supabase } from '../../lib/supabase';
import { Check, X, Clock, Building2, Mail, Phone, MapPin } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';

const sendVenueEmail = async ({ to, subject, template, data }) => {
  await fetch('https://agydpkzfucicraedllgl.functions.supabase.co/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, template, data })
  });
};

const VenueApprovalsPage = () => {
  const [pendingVenues, setPendingVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState({});
  const { toast: useToastToast } = useToast();

  useEffect(() => {
    fetchPendingVenues();
  }, []);

  const fetchPendingVenues = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('status', 'pending');
    if (!error) setPendingVenues(data);
    setLoading(false);
  };

  const approveVenue = async (venue) => {
    try {
      setLoading(true);

      // Update venue status
      const { error: venueError } = await supabase
        .from('venues')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', venue.id);

      if (venueError) throw venueError;

      // Send approval email
      if (venue.venue_owners?.email && venue.venue_owners?.full_name) {
        await sendVenueEmail({
          to: venue.venue_owners.email,
          subject: 'Your Venue Has Been Approved!',
          template: 'venue-approved',
          data: {
            ownerName: venue.venue_owners.full_name,
            venueName: venue.name,
          }
        });
      } else {
        // TODO: Fetch owner info if not present on venue
      }

      // Refresh the list
      await fetchPendingVenues();

      useToastToast({
        title: 'Success',
        description: 'Venue approved successfully',
      });
    } catch (error) {
      console.error('Error approving venue:', error);
      useToastToast({
        title: 'Error',
        description: 'Failed to approve venue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const rejectVenue = async (venue) => {
    try {
      setLoading(true);

      // Update venue status
      const { error: venueError } = await supabase
        .from('venues')
        .update({ 
          status: 'rejected',
          rejection_reason: rejectionReason[venue.id] || null
        })
        .eq('id', venue.id);

      if (venueError) throw venueError;

      // Send rejection email
      if (venue.venue_owners?.email && venue.venue_owners?.full_name) {
        await sendVenueEmail({
          to: venue.venue_owners.email,
          subject: 'Your Venue Submission Was Not Approved',
          template: 'venue-rejected',
          data: {
            ownerName: venue.venue_owners.full_name,
            venueName: venue.name,
            reason: rejectionReason[venue.id] || 'No reason provided',
          }
        });
      } else {
        // TODO: Fetch owner info if not present on venue
      }

      // Refresh the list
      await fetchPendingVenues();

      useToastToast({
        title: 'Success',
        description: 'Venue rejected successfully',
      });
    } catch (error) {
      console.error('Error rejecting venue:', error);
      useToastToast({
        title: 'Error',
        description: 'Failed to reject venue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-brand-cream/50 min-h-screen">
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-heading text-brand-burgundy mb-2">Venue Approvals</h1>
            <p className="text-brand-burgundy/70">Review and manage pending venue registrations</p>
          </div>
        </div>

        <div className="space-y-6">
          {pendingVenues.length === 0 ? (
            <Card className="bg-white border-brand-burgundy/10">
              <CardContent className="pt-6 text-center py-12">
                <Clock className="h-12 w-12 text-brand-burgundy/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-brand-burgundy mb-2">No Pending Approvals</h3>
                <p className="text-brand-burgundy/70">There are no venues waiting for approval.</p>
              </CardContent>
            </Card>
          ) : (
            pendingVenues.map((venue) => (
              <Card key={venue.id} className="bg-white border-brand-burgundy/10">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl text-brand-burgundy">{venue.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="outline" className="border-brand-burgundy/20 text-brand-burgundy">
                          {venue.type}
                        </Badge>
                        <Badge variant="outline" className="border-brand-burgundy/20 text-brand-burgundy">
                          {venue.price_range}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => approveVenue(venue)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <input
                        type="text"
                        placeholder="Rejection reason (optional)"
                        value={rejectionReason[venue.id] || ''}
                        onChange={(e) => setRejectionReason({ ...rejectionReason, [venue.id]: e.target.value })}
                        className="border p-2 rounded"
                      />
                      <Button
                        onClick={() => rejectVenue(venue)}
                        variant="destructive"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <Building2 className="h-5 w-5 text-brand-burgundy/50 mt-1" />
                        <div>
                          <p className="text-sm font-medium text-brand-burgundy">Description</p>
                          <p className="text-sm text-brand-burgundy/70">{venue.description}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <MapPin className="h-5 w-5 text-brand-burgundy/50 mt-1" />
                        <div>
                          <p className="text-sm font-medium text-brand-burgundy">Address</p>
                          <p className="text-sm text-brand-burgundy/70">{venue.address}, {venue.city}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <Mail className="h-5 w-5 text-brand-burgundy/50 mt-1" />
                        <div>
                          <p className="text-sm font-medium text-brand-burgundy">Owner</p>
                          <p className="text-sm text-brand-burgundy/70">{venue.venue_owners.full_name}</p>
                          <p className="text-sm text-brand-burgundy/70">{venue.venue_owners.email}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <Phone className="h-5 w-5 text-brand-burgundy/50 mt-1" />
                        <div>
                          <p className="text-sm font-medium text-brand-burgundy">Contact</p>
                          <p className="text-sm text-brand-burgundy/70">{venue.contact_phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default VenueApprovalsPage; 