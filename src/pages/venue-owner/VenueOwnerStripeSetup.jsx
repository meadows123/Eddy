import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/use-toast';
import { AlertCircle, CheckCircle, ExternalLink, Loader, CreditCard, Shield } from 'lucide-react';
import BackToDashboardButton from '../../components/BackToDashboardButton';
import { Alert, AlertDescription } from '../../components/ui/alert';

const VenueOwnerStripeSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [venue, setVenue] = useState(null);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [connectedAccountId, setConnectedAccountId] = useState(null);
  const [accountDetails, setAccountDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuthAndFetchData();
    checkForOAuthCallback();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        navigate('/venue-owner/login');
        return null;
      }
      return user;
    } catch (error) {
      console.error('❌ Auth error:', error);
      navigate('/venue-owner/login');
      return null;
    }
  };

  const fetchVenueData = async (user) => {
    try {
      // Fetch venue owner data
      const { data: venueOwnerData, error: venueOwnerError } = await supabase
        .from('venue_owners')
        .select('*, venues(*)')
        .eq('user_id', user.id)
        .single();

      if (venueOwnerError) throw venueOwnerError;

      if (venueOwnerData?.venues) {
        setVenue(venueOwnerData.venues);
        setStripeConnected(!!venueOwnerData.stripe_connected_account_id);
        setConnectedAccountId(venueOwnerData.stripe_connected_account_id);
      }
    } catch (error) {
      console.error('❌ Error fetching venue data:', error);
      setError('Failed to load venue data');
    }
  };

  const checkAuthAndFetchData = async () => {
    try {
      setLoading(true);
      const user = await checkAuth();
      if (user) {
        setCurrentUser(user);
        await fetchVenueData(user);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkForOAuthCallback = async () => {
    // Check if this page was accessed via OAuth callback
    const params = new URLSearchParams(window.location.search);
    const stripeCode = params.get('code');
    const state = params.get('state');

    if (stripeCode && state) {
      // Verify state and exchange code for connected account ID
      handleOAuthCallback(stripeCode, state);
    }
  };

  const handleOAuthCallback = async (code, state) => {
    try {
      setConnecting(true);

      // Call your backend function to exchange the code
      const { data: result, error: callError } = await supabase.functions.invoke(
        'stripe-oauth-callback',
        {
          body: {
            code,
            state
          }
        }
      );

      if (callError) throw callError;

      if (result?.success) {
        toast({
          title: '✅ Success!',
          description: 'Your Stripe account has been connected successfully.',
          className: 'bg-green-500 text-white'
        });

        // Refresh the data
        await checkAuthAndFetchData();

        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        throw new Error(result?.error || 'Failed to connect Stripe account');
      }
    } catch (error) {
      console.error('❌ OAuth callback error:', error);
      toast({
        title: '❌ Connection Failed',
        description: error.message || 'Failed to connect your Stripe account',
        className: 'bg-red-500 text-white'
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectStripe = async () => {
    try {
      setConnecting(true);

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Generate OAuth redirect URL
      const stripeClientId = import.meta.env.VITE_STRIPE_CLIENT_ID;
      if (!stripeClientId) {
        throw new Error('Stripe Client ID not configured');
      }

      const redirectUri = `${window.location.origin}/venue-owner/stripe-setup`;
      const state = Math.random().toString(36).substring(7); // Simple state for demo

      // Store state in sessionStorage for verification
      sessionStorage.setItem('stripe_oauth_state', state);

      // Build OAuth URL
      const oauthUrl = new URL('https://connect.stripe.com/oauth/authorize');
      oauthUrl.searchParams.set('client_id', stripeClientId);
      oauthUrl.searchParams.set('redirect_uri', redirectUri);
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set('scope', 'read_write');
      oauthUrl.searchParams.set('state', state);

      // Redirect to Stripe OAuth
      window.location.href = oauthUrl.toString();
    } catch (error) {
      console.error('❌ Connect Stripe error:', error);
      toast({
        title: '❌ Error',
        description: error.message,
        className: 'bg-red-500 text-white'
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (!confirm('Are you sure you want to disconnect your Stripe account? You won\'t be able to process payments until you reconnect.')) {
        return;
      }

      setConnecting(true);

      // Update the venue_owners record to remove the connected account ID
      const { data: { user } } = await supabase.auth.getUser();
      const { error: updateError } = await supabase
        .from('venue_owners')
        .update({ stripe_connected_account_id: null })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setStripeConnected(false);
      setConnectedAccountId(null);

      toast({
        title: '✅ Disconnected',
        description: 'Your Stripe account has been disconnected.',
        className: 'bg-green-500 text-white'
      });

      await checkAuthAndFetchData();
    } catch (error) {
      console.error('❌ Disconnect error:', error);
      toast({
        title: '❌ Error',
        description: error.message || 'Failed to disconnect Stripe account',
        className: 'bg-red-500 text-white'
      });
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-[#FFD700]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-8">
          <BackToDashboardButton />
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-[#FFD700]" />
            Stripe Payment Setup
          </h1>
          <p className="text-slate-400">
            Connect your Stripe account to start processing payments for your bookings
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-8 bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <div className="text-red-800 font-semibold mb-1">Error</div>
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Connection Status */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#FFD700]" />
                  Connection Status
                </CardTitle>
                <CardDescription>Manage your Stripe connected account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                  <span className="text-white font-medium">Account Status</span>
                  {stripeConnected ? (
                    <Badge className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-600 hover:bg-slate-700">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                </div>

                {/* Connected Account ID */}
                {stripeConnected && connectedAccountId && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Connected Account ID</label>
                    <div className="p-3 bg-slate-700 rounded-lg font-mono text-sm text-slate-200 break-all">
                      {connectedAccountId}
                    </div>
                  </div>
                )}

                {/* Venue Information */}
                {venue && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Venue</label>
                    <div className="p-3 bg-slate-700 rounded-lg text-slate-200">
                      {venue.name}
                    </div>
                  </div>
                )}

                {/* Info Text */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-900 text-sm">
                    <strong>ℹ️ How it works:</strong> When you connect your Stripe account, all payments from your venue bookings 
                    will be processed directly to your connected Stripe account. This gives you direct control over your funds and 
                    payment reconciliation.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  {stripeConnected ? (
                    <>
                      <Button
                        onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
                        variant="outline"
                        className="flex-1 border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700] hover:text-slate-900"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Stripe Dashboard
                      </Button>
                      <Button
                        onClick={handleDisconnect}
                        disabled={connecting}
                        variant="destructive"
                        className="flex-1"
                      >
                        {connecting ? (
                          <>
                            <Loader className="w-4 h-4 mr-2 animate-spin" />
                            Disconnecting...
                          </>
                        ) : (
                          'Disconnect Account'
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={handleConnectStripe}
                      disabled={connecting}
                      className="w-full bg-[#FFD700] hover:bg-yellow-500 text-slate-900 font-bold py-3"
                    >
                      {connecting ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Connect Stripe Account
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Benefits */}
          <div>
            <Card className="bg-slate-800 border-slate-700 sticky top-8">
              <CardHeader>
                <CardTitle className="text-white text-lg">Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-1" />
                    <span className="text-slate-300 text-sm">Direct payment processing</span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-1" />
                    <span className="text-slate-300 text-sm">Real-time fund transfers</span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-1" />
                    <span className="text-slate-300 text-sm">Complete payment history</span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-1" />
                    <span className="text-slate-300 text-sm">Enhanced security</span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-1" />
                    <span className="text-slate-300 text-sm">Automated payouts</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Requirements Card */}
        <Card className="mt-8 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-3">
                <span className="text-[#FFD700] font-bold">•</span>
                <span>Active Stripe account (create one at <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="text-[#FFD700] hover:underline">stripe.com</a>)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#FFD700] font-bold">•</span>
                <span>Valid business information on your Stripe profile</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#FFD700] font-bold">•</span>
                <span>Verified bank account for payouts</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#FFD700] font-bold">•</span>
                <span>Compliance with Stripe's terms of service</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VenueOwnerStripeSetup;

