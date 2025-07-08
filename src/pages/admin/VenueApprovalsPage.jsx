import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { supabase } from '../../lib/supabase';
import { 
  Check, 
  X, 
  Clock, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Users, 
  DollarSign,
  Calendar,
  User,
  Globe,
  Utensils
} from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';

const sendVenueEmail = async ({ to, subject, template, data }) => {
  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co')}/send-email`;
  await fetch(functionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, template, data })
  });
};

const VenueApprovalsPage = () => {
  const [pendingVenues, setPendingVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState({});
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingVenues();
  }, []);

  const fetchPendingVenues = async () => {
    setLoading(true);
    try {
      // Enhanced query with venue owner information
      const { data, error } = await supabase
        .from('venues')
        .select(`
          *,
          venue_owners:venue_owners!venue_owners_user_id_fkey (
            id,
            full_name,
            email,
            phone,
            created_at
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending venues:', error);
        toast({
          title: 'Error',
          description: 'Failed to load pending venues',
          variant: 'destructive',
        });
        setPendingVenues([]);
      } else {
        console.log('Fetched pending venues with owners:', data);
        setPendingVenues(data || []);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setPendingVenues([]);
    } finally {
      setLoading(false);
    }
  };

  const approveVenue = async (venue) => {
    try {
      setLoading(true);

      // Update venue status
      const { error: venueError } = await supabase
        .from('venues')
        .update({ 
          status: 'approved',
          rejection_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', venue.id);

      if (venueError) throw venueError;

      // Send approval email using venue owner data
      const venueOwner = venue.venue_owners?.[0] || venue.venue_owners;
      if (venueOwner?.email && venueOwner?.full_name) {
        try {
          await sendVenueEmail({
            to: venueOwner.email,
            subject: '🎉 Your Venue Has Been Approved!',
            template: 'venue-approved',
            data: {
              ownerName: venueOwner.full_name,
              venueName: venue.name,
            }
          });
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          // Don't fail the approval if email fails
        }
      }

      // Refresh the list
      await fetchPendingVenues();

      toast({
        title: 'Venue Approved! 🎉',
        description: `${venue.name} has been approved successfully`,
        className: 'bg-green-500 text-white',
      });
    } catch (error) {
      console.error('Error approving venue:', error);
      toast({
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
          rejection_reason: rejectionReason[venue.id] || 'No reason provided',
          updated_at: new Date().toISOString()
        })
        .eq('id', venue.id);

      if (venueError) throw venueError;

      // Send rejection email using venue owner data
      const venueOwner = venue.venue_owners?.[0] || venue.venue_owners;
      if (venueOwner?.email && venueOwner?.full_name) {
        try {
          await sendVenueEmail({
            to: venueOwner.email,
            subject: 'Venue Submission Update',
            template: 'venue-rejected',
            data: {
              ownerName: venueOwner.full_name,
              venueName: venue.name,
              reason: rejectionReason[venue.id] || 'No specific reason provided',
            }
          });
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          // Don't fail the rejection if email fails
        }
      }

      // Refresh the list
      await fetchPendingVenues();

      toast({
        title: 'Venue Rejected',
        description: `${venue.name} has been rejected`,
        variant: 'destructive',
      });
    } catch (error) {
      console.error('Error rejecting venue:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject venue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-burgundy"></div>
      </div>
    );
  }

  return (
    <div className="bg-brand-cream/50 min-h-screen">
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-heading text-brand-burgundy mb-2">
              Venue Approvals
            </h1>
            <p className="text-brand-burgundy/70">
              Review and manage pending venue registrations ({pendingVenues.length} pending)
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {pendingVenues.length === 0 ? (
            <Card className="bg-white border-brand-burgundy/10">
              <CardContent className="pt-6 text-center py-12">
                <Clock className="h-12 w-12 text-brand-burgundy/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-brand-burgundy mb-2">
                  No Pending Approvals
                </h3>
                <p className="text-brand-burgundy/70">
                  There are no venues waiting for approval.
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingVenues.map((venue) => {
              const venueOwner = venue.venue_owners?.[0] || venue.venue_owners;
              
              return (
                <Card key={venue.id} className="bg-white border-brand-burgundy/10 shadow-lg">
                  <CardHeader className="bg-brand-burgundy/5 border-b border-brand-burgundy/10">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-2xl text-brand-burgundy mb-2">
                          {venue.name}
                        </CardTitle>
                        <div className="flex items-center space-x-4 text-sm text-brand-burgundy/70">
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending Review
                          </Badge>
                          <span>Submitted: {formatDate(venue.created_at)}</span>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col space-y-3">
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => approveVenue(venue)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => rejectVenue(venue)}
                            variant="destructive"
                            size="sm"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                        
                        {/* Rejection Reason */}
                        <Textarea
                          placeholder="Rejection reason (optional)"
                          value={rejectionReason[venue.id] || ''}
                          onChange={(e) => setRejectionReason({ 
                            ...rejectionReason, 
                            [venue.id]: e.target.value 
                          })}
                          className="text-sm h-20 resize-none"
                          rows={2}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      
                      {/* VENUE INFORMATION */}
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold text-brand-burgundy mb-4 flex items-center">
                            <Building2 className="h-5 w-5 mr-2" />
                            Venue Information
                          </h3>
                          
                          <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                              <Utensils className="h-4 w-4 text-brand-burgundy/50 mt-1" />
                              <div>
                                <p className="text-sm font-medium text-brand-burgundy">Type & Description</p>
                                <p className="text-sm text-brand-burgundy/80 font-medium">{venue.type}</p>
                                <p className="text-sm text-brand-burgundy/70 mt-1">
                                  {venue.description || 'No description provided'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start space-x-3">
                              <MapPin className="h-4 w-4 text-brand-burgundy/50 mt-1" />
                              <div>
                                <p className="text-sm font-medium text-brand-burgundy">Location</p>
                                <p className="text-sm text-brand-burgundy/70">{venue.address}</p>
                                <p className="text-sm text-brand-burgundy/70">{venue.city}, {venue.country}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex items-start space-x-3">
                                <Users className="h-4 w-4 text-brand-burgundy/50 mt-1" />
                                <div>
                                  <p className="text-sm font-medium text-brand-burgundy">Capacity</p>
                                  <p className="text-sm text-brand-burgundy/70">
                                    {venue.capacity ? `${venue.capacity} guests` : 'Not specified'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-start space-x-3">
                                <DollarSign className="h-4 w-4 text-brand-burgundy/50 mt-1" />
                                <div>
                                  <p className="text-sm font-medium text-brand-burgundy">Price Range</p>
                                  <p className="text-sm text-brand-burgundy/70">
                                    {venue.price_range || 'Not specified'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-start space-x-3">
                              <Calendar className="h-4 w-4 text-brand-burgundy/50 mt-1" />
                              <div>
                                <p className="text-sm font-medium text-brand-burgundy">Opening Hours</p>
                                <p className="text-sm text-brand-burgundy/70">
                                  {venue.opening_hours || 'Not provided'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* VENUE CONTACT */}
                        <div>
                          <h4 className="text-md font-semibold text-brand-burgundy mb-3 flex items-center">
                            <Phone className="h-4 w-4 mr-2" />
                            Venue Contact Information
                          </h4>
                          
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3">
                              <Phone className="h-4 w-4 text-brand-burgundy/50" />
                              <div>
                                <p className="text-sm font-medium text-brand-burgundy">Venue Phone</p>
                                <p className="text-sm text-brand-burgundy/70">
                                  {venue.contact_phone || 'Not provided'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3">
                              <Mail className="h-4 w-4 text-brand-burgundy/50" />
                              <div>
                                <p className="text-sm font-medium text-brand-burgundy">Venue Email</p>
                                <p className="text-sm text-brand-burgundy/70">
                                  {venue.contact_email || 'Not provided'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* VENUE OWNER INFORMATION */}
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold text-brand-burgundy mb-4 flex items-center">
                            <User className="h-5 w-5 mr-2" />
                            Venue Owner Information
                          </h3>
                          
                          <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                              <User className="h-4 w-4 text-brand-burgundy/50 mt-1" />
                              <div>
                                <p className="text-sm font-medium text-brand-burgundy">Owner Name</p>
                                <p className="text-sm text-brand-burgundy/70">
                                  {venueOwner?.full_name || 'No owner information'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start space-x-3">
                              <Mail className="h-4 w-4 text-brand-burgundy/50 mt-1" />
                              <div>
                                <p className="text-sm font-medium text-brand-burgundy">Owner Email</p>
                                <p className="text-sm text-brand-burgundy/70">
                                  {venueOwner?.email || 'No email provided'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start space-x-3">
                              <Phone className="h-4 w-4 text-brand-burgundy/50 mt-1" />
                              <div>
                                <p className="text-sm font-medium text-brand-burgundy">Owner Phone</p>
                                <p className="text-sm text-brand-burgundy/70">
                                  {venueOwner?.phone || 'No phone provided'}
                                </p>
                              </div>
                            </div>

                            {venueOwner?.created_at && (
                              <div className="flex items-start space-x-3">
                                <Calendar className="h-4 w-4 text-brand-burgundy/50 mt-1" />
                                <div>
                                  <p className="text-sm font-medium text-brand-burgundy">Registration Date</p>
                                  <p className="text-sm text-brand-burgundy/70">
                                    {formatDate(venueOwner.created_at)}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* TECHNICAL DETAILS */}
                        <div className="bg-brand-burgundy/5 p-4 rounded-lg">
                          <h4 className="text-md font-semibold text-brand-burgundy mb-3">
                            Technical Details
                          </h4>
                          
                          <div className="space-y-2 text-xs text-brand-burgundy/60">
                            <p><strong>Venue ID:</strong> {venue.id}</p>
                            <p><strong>Owner ID:</strong> {venue.owner_id}</p>
                            <p><strong>Status:</strong> {venue.status}</p>
                            {venue.updated_at && venue.updated_at !== venue.created_at && (
                              <p><strong>Last Updated:</strong> {formatDate(venue.updated_at)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default VenueApprovalsPage; 