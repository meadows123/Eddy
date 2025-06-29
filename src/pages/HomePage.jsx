import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Users, Search, Filter, Clock, Tag, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import VenueCard from '@/components/VenueCard';

const HomePage = () => {
  const [searchParams, setSearchParams] = useState({
    location: '',
    date: '',
    guests: '2',
    venueType: 'all'
  });

  const [featuredVenues, setFeaturedVenues] = useState([]);
  const [locations, setLocations] = useState(['all']);
  const [venueTypes, setVenueTypes] = useState(['all', 'Restaurant', 'Club', 'Lounge']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVenuesData();
  }, []);

  const fetchVenuesData = async () => {
    try {
      setLoading(true);
      
      // Fetch venues with their images
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select(`
          *,
          venue_images (
            image_url,
            is_primary
          )
        `)
        .eq('status', 'approved')
        .eq('is_active', true)
        .limit(6);

      if (venuesError) {
        console.error('Error fetching venues:', venuesError);
        return;
      }

      // Transform data to match the expected format
      const transformedVenues = venuesData?.map(venue => {
        const primaryImage = venue.venue_images?.find(img => img.is_primary)?.image_url || venue.venue_images?.[0]?.image_url;
        const allImages = venue.venue_images?.map(img => img.image_url) || [];
        
        return {
          id: venue.id,
          name: venue.name,
          description: venue.description,
          rating: venue.rating || 4.5,
          location: venue.city,
          venueType: venue.type,
          type: venue.type,
          images: primaryImage ? [primaryImage, ...allImages.filter(img => img !== primaryImage)] : allImages,
          address: venue.address,
          city: venue.city,
          price_range: venue.price_range,
          vibe: venue.vibe,
          isFeatured: true // For now, treat all approved venues as featured
        };
      }) || [];

      setFeaturedVenues(transformedVenues);

      // Extract unique locations
      const uniqueLocations = ['all', ...new Set(venuesData?.map(venue => venue.city) || [])];
      setLocations(uniqueLocations);

    } catch (error) {
      console.error('Error in fetchVenuesData:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add weekend deals data (keeping static for now, can be made dynamic later)
  const weekendDeals = [
    {
      id: 1,
      venueName: "Club DNA",
      location: "Victoria Island",
      deal: "50% off bottle service",
      validUntil: "2024-03-24",
      image: "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd",
      originalPrice: "₦150,000",
      dealPrice: "₦75,000",
      remainingSpots: 3
    },
    {
      id: 2,
      venueName: "RSVP Lagos",
      location: "Lekki",
      deal: "Free entry for ladies",
      validUntil: "2024-03-24",
      image: "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd",
      originalPrice: "₦10,000",
      dealPrice: "₦0",
      remainingSpots: 15
    },
    {
      id: 3,
      venueName: "Quilox",
      location: "Victoria Island",
      deal: "2-for-1 cocktails",
      validUntil: "2024-03-24",
      image: "https://images.unsplash.com/photo-1575429198097-0414ec08e8cd",
      originalPrice: "₦8,000",
      dealPrice: "₦4,000",
      remainingSpots: 8
    }
  ];

  const handleSearch = () => {
    // Filter out empty values
    const filteredParams = Object.entries(searchParams)
      .filter(([key, value]) => value && value !== 'all' && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    
    const searchQuery = new URLSearchParams(filteredParams).toString();
    window.location.href = `/venues${searchQuery ? `?${searchQuery}` : ''}`;
  };

  return (
    <div className="bg-brand-cream text-brand-burgundy">
      {/* Hero Section with Search */}
      <section className="relative overflow-hidden py-16 md:py-24 min-h-[60vh] flex items-center">
        <div className="absolute inset-0 z-0">
          <img   
            className="w-full h-full object-cover opacity-20" 
            alt="Elegant Lagos nightlife scene with city lights"
            src="https://images.unsplash.com/photo-1504487857078-a29d3990e6aa" />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-cream/50 via-brand-cream to-brand-cream"></div>
        </div>
        
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-center mb-8"
            >
              <h1 className="text-4xl md:text-6xl font-heading mb-4 text-brand-burgundy">
                Find Your Perfect <span className="text-brand-gold">VIP</span> Experience
              </h1>
              <p className="text-lg text-brand-burgundy/80 font-body">
                Book exclusive tables at Lagos' most prestigious venues
              </p>
            </motion.div>
            
            {/* Search Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="bg-white p-6 rounded-2xl shadow-xl border border-brand-burgundy/10"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-brand-burgundy/50" />
                  <Select
                    value={searchParams.location}
                    onValueChange={(value) => setSearchParams(prev => ({ ...prev, location: value }))}
                  >
                    <SelectTrigger className="pl-10 h-12 bg-white border-brand-burgundy/20 hover:border-brand-gold focus:border-brand-gold">
                      <SelectValue placeholder="Where in Lagos?" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(location => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-brand-burgundy/50" />
                  <Input
                    type="date"
                    className="pl-10 h-12 bg-white border-brand-burgundy/20 hover:border-brand-gold focus:border-brand-gold"
                    value={searchParams.date}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-brand-burgundy/50" />
                  <Select
                    value={searchParams.guests}
                    onValueChange={(value) => setSearchParams(prev => ({ ...prev, guests: value }))}
                  >
                    <SelectTrigger className="pl-10 h-12 bg-white border-brand-burgundy/20 hover:border-brand-gold focus:border-brand-gold">
                      <SelectValue placeholder="Guests" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10].map(num => (
                        <SelectItem key={num} value={num.toString()}>{num} {num === 1 ? 'Guest' : 'Guests'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-brand-burgundy/50" />
                  <Select
                    value={searchParams.venueType}
                    onValueChange={(value) => setSearchParams(prev => ({ ...prev, venueType: value }))}
                  >
                    <SelectTrigger className="pl-10 h-12 bg-white border-brand-burgundy/20 hover:border-brand-gold focus:border-brand-gold">
                      <SelectValue placeholder="Venue Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {venueTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  className="h-12 bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90 transition-all duration-300"
                  onClick={handleSearch}
                >
                  <Search className="h-5 w-5 mr-2" />
                  Search Venues
              </Button>
              </div>
            </motion.div>

            {/* Quick Links */}
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              {['VIP Tables', 'Bottle Service', 'Private Events', 'Live Music'].map((link) => (
                <Button
                  key={link}
                  variant="ghost"
                  className="text-brand-burgundy hover:text-brand-gold hover:bg-brand-gold/10"
                >
                  {link}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* Featured Venues Section */}
      <section className="py-16 bg-brand-cream">
          <div className="container">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-heading text-brand-burgundy">Featured Venues</h2>
              <p className="text-brand-burgundy/70 mt-2">Most popular venues in Lagos</p>
            </div>
            <Button variant="outline" className="border-brand-gold text-brand-gold hover:bg-brand-gold/10">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden border border-brand-burgundy/10">
                    <div className="h-48 bg-gray-200 animate-pulse"></div>
                    <div className="p-6 space-y-3">
                      <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                    </div>
                  </div>
                ))
              ) : featuredVenues.length > 0 ? (
                featuredVenues.map((venue, index) => (
                  <motion.div
                    key={venue.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <VenueCard venue={venue} />
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-brand-burgundy/70 text-lg">No featured venues available at the moment.</p>
                  <p className="text-brand-burgundy/50 text-sm mt-2">Please check back later or browse all venues.</p>
                </div>
              )}
            </div>

          <div className="text-center mt-12">
            <Button 
              className="bg-[#5B0202] text-white hover:bg-[#5B0202]/90"
              onClick={() => window.location.href = '/venues'}
            >
              View All Venues
            </Button>
          </div>
          </div>
        </section>
      
      {/* Weekend Deals Section */}
      <section className="py-16 bg-gradient-to-b from-brand-cream to-brand-burgundy/5">
        <div className="container">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-heading text-brand-burgundy">Weekend Deals</h2>
              <p className="text-brand-burgundy/70 mt-2">Limited time offers for this weekend</p>
            </div>
            <Button className="bg-[#5B0202] text-white hover:bg-[#5B0202]/90">
              <Tag className="h-4 w-4 mr-2" />
              View All Deals
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {weekendDeals.map((deal, index) => (
              <motion.div
                key={deal.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group"
              >
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-brand-burgundy/10 hover:shadow-xl transition-shadow duration-300">
                  <div className="relative">
                    <img
                      src={deal.image}
                      alt={deal.venueName}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-4 right-4 bg-brand-gold text-brand-burgundy px-3 py-1 rounded-full text-sm font-semibold">
                      {deal.deal}
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-heading text-brand-burgundy mb-1">{deal.venueName}</h3>
                        <div className="flex items-center text-brand-burgundy/70">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span className="text-sm">{deal.location}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-brand-burgundy/50 line-through">{deal.originalPrice}</div>
                        <div className="text-xl font-bold text-brand-gold">{deal.dealPrice}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-brand-burgundy/70 mb-4">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>Valid until {new Date(deal.validUntil).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        <span>{deal.remainingSpots} spots left</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90"
                      onClick={() => {/* Handle booking */}}
                    >
                      Book Now
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button className="bg-[#5B0202] text-white hover:bg-[#5B0202]/90">
              View All Weekend Deals
            </Button>
          </div>
        </div>
      </section>

      {/* Sign in, Save Money Section */}
      <section className="py-16 bg-brand-burgundy/5">
        <div className="container">
          <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-heading mb-4 text-brand-burgundy">
                Feel at ease for less
              </h2>
              <p className="text-lg text-brand-burgundy/70 font-body">
                Sign in to unlock exclusive member rates and special offers
            </p>
          </motion.div>

               <motion.div
              initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-brand-burgundy/10"
            >
              <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                  <h3 className="text-2xl font-heading text-brand-burgundy mb-4">
                    Sign in to save up to 20% on your bookings
                  </h3>
                  <ul className="space-y-4">
                    {[
                      "Exclusive member-only rates",
                      "Early access to special deals",
                      "Free cancellation on most bookings",
                      "Earn points with every booking"
                    ].map((benefit, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                        className="flex items-center text-brand-burgundy/80"
                      >
                        <div className="w-6 h-6 rounded-full bg-brand-gold/20 flex items-center justify-center mr-3">
                          <Check className="h-4 w-4 text-brand-gold" />
                  </div>
                        {benefit}
                      </motion.li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col space-y-4">
                  <Button 
                    size="lg"
                    className="w-full bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90 h-12"
                  >
                    Sign in
                  </Button>
                  <Button 
                    variant="outline"
                    size="lg"
                    className="w-full border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/10 h-12"
                  >
                    Create an account
                  </Button>
                  <p className="text-center text-sm text-brand-burgundy/60">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
                </div>
              </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;