import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, useInView, useScroll, useTransform } from 'framer-motion';
import { MapPin, Calendar, Users, Search, Filter, Clock, Tag, Check, Star, TrendingUp, Zap, Shield, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import VenueCard from '@/components/VenueCard';

// Enhanced floating particles component
const FloatingElements = () => {
  const elements = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 4 + Math.random() * 3,
    size: 2 + Math.random() * 4,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {elements.map((element) => (
        <motion.div
          key={element.id}
          className="absolute rounded-full bg-gradient-to-r from-brand-gold/20 to-brand-burgundy/10"
          style={{
            left: `${element.x}%`,
            top: `${element.y}%`,
            width: `${element.size}px`,
            height: `${element.size}px`,
          }}
          animate={{
            y: [0, -50, 0],
            x: [0, 20, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: element.duration,
            repeat: Infinity,
            delay: element.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// Parallax hero section component
const ParallaxHero = ({ children }) => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, -150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.3]);

  return (
    <motion.div style={{ y, opacity }} className="relative">
      {children}
    </motion.div>
  );
};

// Animated counter component
const AnimatedCounter = ({ end, duration = 2, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const ref = useRef();
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      let startTime;
      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
        setCount(Math.floor(progress * end));
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }
  }, [isInView, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

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
  const [searchFocused, setSearchFocused] = useState(false);

  const heroRef = useRef();
  const featuresRef = useRef();
  const venuesRef = useRef();
  const statsRef = useRef();

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
        .eq('status', 'active')
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
          isFeatured: true
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

  // Enhanced weekend deals data
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
      remainingSpots: 3,
      badge: "Hot Deal",
      badgeColor: "bg-red-500"
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
      remainingSpots: 15,
      badge: "Limited",
      badgeColor: "bg-orange-500"
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
      remainingSpots: 8,
      badge: "Popular",
      badgeColor: "bg-green-500"
    }
  ];

  const stats = [
    { number: 100, suffix: "+", label: "Premium Venues", icon: Award },
    { number: 50000, suffix: "+", label: "Happy Customers", icon: Users },
    { number: 4.9, suffix: "/5", label: "Average Rating", icon: Star },
    { number: 24, suffix: "/7", label: "Support Available", icon: Shield }
  ];

  const features = [
    {
      icon: Zap,
      title: "Instant Booking",
      description: "Book your table in seconds with our lightning-fast booking system",
      color: "from-brand-burgundy to-brand-burgundy/90"
    },
    {
      icon: Shield,
      title: "Secure Payments",
      description: "Your payments are protected with bank-level security encryption",
      color: "from-brand-burgundy/90 to-brand-burgundy/80"
    },
    {
      icon: Award,
      title: "VIP Treatment",
      description: "Enjoy exclusive perks and priority service at all partner venues",
      color: "from-brand-burgundy/80 to-brand-burgundy/70"
    },
    {
      icon: TrendingUp,
      title: "Best Prices",
      description: "Get the best deals and exclusive discounts on premium venues",
      color: "from-brand-burgundy/70 to-brand-burgundy/60"
    }
  ];

  const handleSearch = () => {
    const filteredParams = Object.entries(searchParams)
      .filter(([key, value]) => value && value !== 'all' && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    
    const searchQuery = new URLSearchParams(filteredParams).toString();
    window.location.href = `/venues${searchQuery ? `?${searchQuery}` : ''}`;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <div className="bg-brand-cream text-brand-burgundy">
      {/* Enhanced Hero Section with Parallax */}
      <section ref={heroRef} className="relative overflow-hidden py-20 md:py-32 min-h-screen flex items-center">
        <div className="absolute inset-0 z-0">
          <ParallaxHero>
            <img   
              className="w-full h-full object-cover" 
              alt="Elegant Lagos nightlife scene with city lights"
              src="https://images.unsplash.com/photo-1504487857078-a29d3990e6aa" 
            />
          </ParallaxHero>
          <div className="absolute inset-0 bg-gradient-to-b from-brand-cream/20 via-brand-cream/60 to-brand-cream/90"></div>
          <FloatingElements />
        </div>
        
        <div className="container relative z-10">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="text-center mb-12"
            >
              <motion.h1 
                className="text-5xl md:text-7xl lg:text-8xl font-heading mb-8 text-brand-burgundy"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              >
                Find Your Perfect{" "}
                <motion.span 
                  className="text-white font-bold"
                  animate={{ 
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  Eddys Members
                </motion.span>{" "}
                Experience
              </motion.h1>
              <motion.p 
                className="text-xl md:text-2xl text-brand-burgundy/80 font-medium max-w-3xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                Book exclusive tables at Lagos' most prestigious venues with instant confirmation
              </motion.p>
            </motion.div>
            
            {/* Enhanced Search Box */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className={`bg-white p-8 rounded-3xl shadow-2xl border-2 transition-all duration-300 ${
                searchFocused ? 'border-brand-gold shadow-3xl scale-105' : 'border-brand-burgundy/10'
              }`}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <motion.div 
                  className="relative"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-brand-burgundy/50" />
                  <Select
                    value={searchParams.location}
                    onValueChange={(value) => setSearchParams(prev => ({ ...prev, location: value }))}
                  >
                    <SelectTrigger className="pl-12 h-14 bg-white border-2 border-brand-burgundy/20 hover:border-brand-gold focus:border-brand-gold rounded-xl text-base">
                      <SelectValue placeholder="Where in Lagos?" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(location => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>

                <motion.div 
                  className="relative"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-brand-burgundy/50" />
                  <Input
                    type="date"
                    className="pl-12 h-14 bg-white border-2 border-brand-burgundy/20 hover:border-brand-gold focus:border-brand-gold rounded-xl text-base"
                    value={searchParams.date}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </motion.div>

                <motion.div 
                  className="relative"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-brand-burgundy/50" />
                  <Select
                    value={searchParams.guests}
                    onValueChange={(value) => setSearchParams(prev => ({ ...prev, guests: value }))}
                  >
                    <SelectTrigger className="pl-12 h-14 bg-white border-2 border-brand-burgundy/20 hover:border-brand-gold focus:border-brand-gold rounded-xl text-base">
                      <SelectValue placeholder="Guests" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10].map(num => (
                        <SelectItem key={num} value={num.toString()}>{num} Guest{num > 1 ? 's' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    onClick={handleSearch}
                    className="w-full h-14 bg-gradient-to-r from-brand-burgundy to-brand-burgundy-light hover:from-brand-gold hover:to-yellow-500 text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Search className="mr-2 h-5 w-5" />
                    Find Venues
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="py-20 bg-gradient-to-r from-brand-burgundy via-brand-burgundy-light to-brand-burgundy">
        <div className="container">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="text-center text-white"
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <motion.div
                  className="inline-flex items-center justify-center w-16 h-16 bg-brand-gold rounded-full mb-4"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <stat.icon className="w-8 h-8 text-brand-burgundy" />
                </motion.div>
                <div className="text-4xl md:text-5xl font-bold mb-2">
                  <AnimatedCounter end={stat.number} suffix={stat.suffix} />
                </div>
                <p className="text-white/80 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="py-20 bg-white">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-heading font-bold mb-12 text-center text-brand-burgundy">
              Why Choose Eddys Members?
            </h2>
            <p className="text-xl text-brand-burgundy/70 max-w-3xl mx-auto">
              Experience the difference with our premium booking platform designed for discerning customers
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group relative overflow-hidden bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-brand-burgundy/10"
              >
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                />
                <motion.div
                  className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${feature.color} rounded-xl mb-6`}
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <feature.icon className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-xl font-bold text-brand-burgundy mb-4 group-hover:text-brand-gold transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-brand-burgundy/70 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Weekend Deals Section */}
      <section className="py-20 bg-gradient-to-br from-brand-cream to-brand-cream/50">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-heading text-brand-burgundy mb-6 font-bold">
              This Weekend's <span className="text-brand-gold">Hot Deals</span>
            </h2>
            <p className="text-xl text-brand-burgundy/70 max-w-3xl mx-auto">
              Limited time offers on the hottest venues in Lagos. Book now before they're gone!
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {weekendDeals.map((deal, index) => (
              <motion.div
                key={deal.id}
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative overflow-hidden bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={deal.image}
                    alt={deal.venueName}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <motion.div
                    className={`absolute top-4 left-4 ${deal.badgeColor} text-white px-3 py-1 rounded-full text-sm font-semibold`}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {deal.badge}
                  </motion.div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-xl font-bold">{deal.venueName}</h3>
                    <p className="text-white/80 flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {deal.location}
                    </p>
                  </div>
                </div>
                
                <div className="p-6">
                  <p className="text-lg font-semibold text-brand-burgundy mb-4">{deal.deal}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-sm text-brand-burgundy/60 line-through">{deal.originalPrice}</span>
                      <span className="text-2xl font-bold text-brand-gold ml-2">{deal.dealPrice}</span>
                    </div>
                    <span className="text-sm text-brand-burgundy/60">
                      {deal.remainingSpots} spots left
                    </span>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gradient-to-r from-brand-burgundy to-brand-burgundy-light text-white py-3 rounded-xl font-semibold hover:from-brand-gold hover:to-yellow-500 transition-all duration-300"
                  >
                    Book This Deal
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured Venues Section */}
      <section ref={venuesRef} className="py-20 bg-white">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-heading text-brand-burgundy mb-6 font-bold">
              Featured Venues
            </h2>
            <p className="text-xl text-brand-burgundy/70 max-w-3xl mx-auto">
              Handpicked premium venues offering the finest experiences in Lagos
            </p>
          </motion.div>

          {loading ? (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className="bg-gray-200 rounded-2xl h-96 animate-pulse"
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {featuredVenues.map((venue, index) => (
                <motion.div
                  key={venue.id}
                  variants={itemVariants}
                  custom={index}
                >
                  <VenueCard venue={venue} />
                </motion.div>
              ))}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center mt-12"
          >
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = '/venues'}
              className="bg-gradient-to-r from-brand-burgundy to-brand-burgundy-light hover:from-brand-gold hover:to-yellow-500 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              View All Venues
            </motion.button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;