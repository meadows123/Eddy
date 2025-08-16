import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Users, 
  DollarSign, 
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  Store,
  Globe,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';

const VenueApprovalsPage = () => {
  console.log('🚨 ADMIN VenueApprovalsPage component loaded - this should ONLY be at /admin/venue-approvals');
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('pending_venue_owner_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (req) => {
    setProcessing(true);
    try {
      // Use the actual venue type from the request, with a reasonable fallback
      const venueType = req.venue_type || 'restaurant';
      
      console.log('🏢 Venue type from request:', {
        original: req.venue_type,
        using: venueType
      });

      // Find the existing venue owner record that was created during registration
      const { data: existingVenueOwner, error: venueOwnerFindError } = await supabase
        .from('venue_owners')
        .select('*')
        .eq('owner_email', req.email)
        .eq('status', 'pending_approval')
        .single();

      if (venueOwnerFindError || !existingVenueOwner) {
        console.error('❌ Could not find existing venue owner record:', venueOwnerFindError);
        throw new Error(`Could not find venue owner record for ${req.email}. Make sure they have completed the registration process first.`);
      }

      console.log('✅ Found existing venue owner record:', existingVenueOwner);

      // Create a venue record with the correct owner_id (user already exists!)
      const { data: newVenue, error: venueError } = await supabase
        .from('venues')
        .insert([{
          name: req.venue_name,
          description: req.additional_info,
          type: venueType,
          price_range: req.price_range || '$$',
          address: req.venue_address,
          city: req.venue_city,
          state: req.venue_city, // Using city as state for now
          country: req.venue_country,
          latitude: 6.5244, // Default Lagos coordinates - can be updated later
          longitude: 3.3792,
          contact_phone: req.contact_phone,
          contact_email: req.email,
          owner_id: existingVenueOwner.user_id, // THIS IS THE KEY FIX!
          status: 'approved',
          is_active: true
        }])
        .select()
        .single();

      if (venueError) throw venueError;

      console.log('✅ Venue created with owner_id:', newVenue.owner_id);

      // Update the venue owner record: set status to active and link venue
      const { error: venueOwnerUpdateError } = await supabase
        .from('venue_owners')
        .update({ 
          venue_id: newVenue.id,
          status: 'active' // Now active since admin approved
        })
        .eq('id', existingVenueOwner.id);

      if (venueOwnerUpdateError) throw venueOwnerUpdateError;

      // Update request status
      await supabase
        .from('pending_venue_owner_requests')
        .update({ status: 'approved' })
        .eq('id', req.id);

      // Send approval notification email to venue owner
      try {
        const venueOwnerData = {
          email: req.email,
          contact_name: req.contact_name,
          owner_name: req.contact_name,
          venue_name: req.venue_name,
          venue_type: venueType,
          venue_address: req.venue_address,
          venue_city: req.venue_city
        };
        
        // Import the email service
        const { sendVenueOwnerApplicationApproved } = await import('../../lib/venueOwnerEmailService');
        await sendVenueOwnerApplicationApproved(venueOwnerData);
        console.log('✅ Approval notification email sent');
      } catch (emailError) {
        console.error('❌ Failed to send approval email:', emailError);
        // Don't fail the approval if email fails
      }

      // Refresh the list with a small delay to ensure database commit
      setTimeout(async () => {
        console.log('🔄 Refreshing requests list after approval...');
        await loadRequests();
      }, 1000);
      
      alert(`Venue owner approved successfully! ${req.contact_name} can now access their venue dashboard. The venue "${req.venue_name}" is now live with proper owner linking.`);
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Error approving request: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (req) => {
    setProcessing(true);
    try {
      await supabase.from('pending_venue_owner_requests').update({ status: 'rejected' }).eq('id', req.id);
      await loadRequests();
      alert('Request rejected successfully!');
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error rejecting request: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="border-green-500 text-green-700">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="border-red-500 text-red-700">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-cream/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-burgundy mx-auto"></div>
          <p className="mt-4 text-brand-burgundy">Loading venue applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream/50">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-brand-burgundy/10 rounded-full">
              <Store className="h-8 w-8 text-brand-burgundy" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-brand-burgundy">Venue Owner Applications</h1>
              <p className="text-brand-burgundy/70">Review and manage venue partnership requests</p>
            </div>
          </div>
          
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Pending: {requests.filter(r => r.status === 'pending').length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Approved: {requests.filter(r => r.status === 'approved').length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Rejected: {requests.filter(r => r.status === 'rejected').length}</span>
            </div>
          </div>
        </div>

        {/* Applications Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {requests.map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-brand-burgundy mb-2">
                        {request.venue_name}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-brand-burgundy/70">
                        <Building2 className="h-4 w-4" />
                        <span>{request.venue_type || 'Restaurant'}</span>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Owner Information */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-brand-burgundy flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Owner Details
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-brand-burgundy/50" />
                        <span>{request.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-brand-burgundy/50" />
                        <span>{request.contact_phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-brand-burgundy/50" />
                        <span>{request.contact_name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Venue Location */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-brand-burgundy flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-brand-burgundy/50" />
                        <span>{request.venue_address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3 text-brand-burgundy/50" />
                        <span>{request.venue_city}, {request.venue_country}</span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  {request.additional_info && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-brand-burgundy flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Description
                      </h4>
                      <p className="text-sm text-brand-burgundy/70 line-clamp-3">
                        {request.additional_info}
                      </p>
                    </div>
                  )}

                  {/* Application Date */}
                  <div className="flex items-center gap-2 text-sm text-brand-burgundy/60">
                    <Calendar className="h-3 w-3" />
                    <span>Applied: {formatDate(request.created_at)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-brand-burgundy/10">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/10"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>

                    {request.status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleApprove(request)}
                          disabled={processing}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {processing ? 'Processing...' : 'Approve'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleReject(request)}
                          disabled={processing}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {processing ? 'Processing...' : 'Reject'}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {requests.length === 0 && (
          <div className="text-center py-12">
            <Store className="h-16 w-16 text-brand-burgundy/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-brand-burgundy mb-2">No Applications Yet</h3>
            <p className="text-brand-burgundy/70">When venue owners submit applications, they will appear here for review.</p>
          </div>
        )}

        {/* Detailed View Dialog */}
        {selectedRequest && (
          <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl text-brand-burgundy">
                  {selectedRequest.venue_name} - Application Details
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Owner Information */}
                <div className="bg-brand-cream/30 p-4 rounded-lg">
                  <h3 className="font-semibold text-brand-burgundy mb-3 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Owner Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Full Name</label>
                      <p className="text-brand-burgundy">{selectedRequest.contact_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Email Address</label>
                      <p className="text-brand-burgundy">{selectedRequest.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Phone Number</label>
                      <p className="text-brand-burgundy">{selectedRequest.contact_phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Application Date</label>
                      <p className="text-brand-burgundy">{formatDate(selectedRequest.created_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Venue Information */}
                <div className="bg-brand-cream/30 p-4 rounded-lg">
                  <h3 className="font-semibold text-brand-burgundy mb-3 flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Venue Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Venue Name</label>
                      <p className="text-brand-burgundy font-semibold">{selectedRequest.venue_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Venue Type</label>
                      <p className="text-brand-burgundy">{selectedRequest.venue_type || 'Restaurant'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Description</label>
                      <p className="text-brand-burgundy">{selectedRequest.additional_info || 'No description provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Location Information */}
                <div className="bg-brand-cream/30 p-4 rounded-lg">
                  <h3 className="font-semibold text-brand-burgundy mb-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Address</label>
                      <p className="text-brand-burgundy">{selectedRequest.venue_address}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">City</label>
                      <p className="text-brand-burgundy">{selectedRequest.venue_city}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Country</label>
                      <p className="text-brand-burgundy">{selectedRequest.venue_country}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="bg-brand-cream/30 p-4 rounded-lg">
                  <h3 className="font-semibold text-brand-burgundy mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Additional Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Opening Hours</label>
                      <p className="text-brand-burgundy">{selectedRequest.opening_hours || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Capacity</label>
                      <p className="text-brand-burgundy">{selectedRequest.capacity || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-brand-burgundy/70">Price Range</label>
                      <p className="text-brand-burgundy">{selectedRequest.price_range || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedRequest.status === 'pending' && (
                  <div className="flex gap-3 pt-4 border-t border-brand-burgundy/10">
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        handleApprove(selectedRequest);
                        setSelectedRequest(null);
                      }}
                      disabled={processing}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {processing ? 'Processing...' : 'Approve Application'}
                    </Button>
                    <Button 
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        handleReject(selectedRequest);
                        setSelectedRequest(null);
                      }}
                      disabled={processing}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {processing ? 'Processing...' : 'Reject Application'}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default VenueApprovalsPage; 