import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Building2, Music, Utensils, User, Store, Sparkles, ArrowRight, Star, Users } from 'lucide-react';

// Floating particles component
const FloatingParticles = () => {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-1 h-1 bg-white/20 rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// Animated gradient background
const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0 opacity-50"
        animate={{
          background: [
            'linear-gradient(45deg, #8B1538, #A0263A, #8B1538)',
            'linear-gradient(135deg, #A0263A, #B8344F, #A0263A)',
            'linear-gradient(225deg, #8B1538, #A0263A, #8B1538)',
          ]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-brand-burgundy/90 via-brand-burgundy-light/80 to-brand-burgundy/90" />
    </div>
  );
};

// Typewriter effect component
const TypewriterText = ({ text, delay = 0 }) => {
  const [displayText, setDisplayText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(interval);
          setShowCursor(false);
        }
      }, 100);
      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [text, delay]);

  return (
    <span>
      {displayText}
      {showCursor && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
          className="inline-block w-0.5 h-8 md:h-12 bg-white/90 ml-1"
        />
      )}
    </span>
  );
};

const LandingPage = () => {
  const [showCategories, setShowCategories] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const navigate = useNavigate();
  const controls = useAnimation();

  useEffect(() => {
    setIsLoaded(true);
    controls.start({
      opacity: 1,
      y: 0,
      transition: { duration: 1, ease: "easeOut" }
    });
  }, [controls]);

  const categories = [
    {
      id: 'restaurant',
      name: 'Restaurants',
      description: 'Discover the finest dining experiences in Lagos',
      icon: Utensils,
      color: 'from-orange-600 to-red-600',
      count: '50+ venues',
      features: ['Fine Dining', 'Private Rooms', 'Chef\'s Table']
    },
    {
      id: 'club',
      name: 'Clubs',
      description: 'Experience the vibrant nightlife and premium entertainment',
      icon: Music,
      color: 'from-purple-600 to-pink-600',
      count: '30+ venues',
      features: ['VIP Tables', 'Premium Sound', 'Top DJs']
    },
    {
      id: 'lounge',
      name: 'Lounges',
      description: 'Relax in sophisticated lounges across the city',
      icon: Building2,
      color: 'from-blue-600 to-indigo-600',
      count: '25+ venues',
      features: ['Cocktail Bar', 'Sky Views', 'Premium Service']
    },
  ];

  const handleCustomerClick = () => {
    setShowCategories(true);
  };

  const handleOwnerClick = () => {
    navigate('/venue-owner/login');
  };

  const handleCategoryClick = (categoryId) => {
    navigate(`/venues?type=${categoryId}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
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
        stiffness: 100,
        damping: 10
      }
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream overflow-hidden">
      <AnimatePresence mode="wait">
        {!showCategories ? (
          <motion.section 
            key="hero"
            className="relative bg-brand-burgundy flex items-center justify-center overflow-hidden min-h-screen"
            initial={{ opacity: 1 }}
            exit={{ 
              opacity: 0,
              scale: 0.95,
              transition: { duration: 0.6, ease: "easeInOut" }
            }}
          >
            <AnimatedBackground />
            <FloatingParticles />
            
            <div className="container mx-auto px-4 flex flex-col items-center justify-center h-full relative z-10">
              <motion.div 
                className="max-w-5xl w-full text-white text-center"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {/* Logo/Brand Animation */}
                <motion.div
                  variants={itemVariants}
                  className="mb-8"
                >
                  <motion.div
                    className="inline-flex items-center gap-3 mb-6"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <motion.div
                      className="p-3 bg-brand-gold rounded-2xl"
                      animate={{ 
                        rotate: [0, 5, -5, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Sparkles className="w-8 h-8 text-brand-burgundy" />
                    </motion.div>
                    <span className="text-2xl font-bold tracking-wider text-brand-gold">VIP CLUB</span>
                  </motion.div>
                </motion.div>

                {/* Main Heading with Typewriter Effect */}
                <motion.h1 
                  variants={itemVariants}
                  className="text-5xl md:text-7xl lg:text-8xl font-heading mb-8 font-bold tracking-tight leading-tight"
                >
                  <motion.span 
                    className="block mb-4 text-white/90"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                  >
                    Discover
                  </motion.span>
                  
                  <motion.span 
                    className="block text-6xl md:text-8xl lg:text-9xl mb-4"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.8 }}
                  >
                    <span className="text-brand-gold font-extrabold drop-shadow-2xl">
                      <TypewriterText text="Eddys'" delay={1200} />
                    </span>
                  </motion.span>
                  
                  <motion.span 
                    className="block text-4xl md:text-6xl lg:text-7xl text-white/95"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1.5 }}
                  >
                    Finest Venues
                  </motion.span>
                </motion.h1>

                {/* Subtitle with Animation */}
                <motion.p 
                  variants={itemVariants}
                  className="text-xl md:text-2xl lg:text-3xl mb-12 text-white/80 font-medium max-w-3xl mx-auto leading-relaxed"
                >
                  Book tables, enjoy exclusive experiences, and make unforgettable memories in Lagos' most prestigious venues
                </motion.p>

                {/* Animated Action Buttons */}
                <motion.div 
                  variants={itemVariants}
                  className="flex flex-col md:flex-row gap-6 lg:gap-8 justify-center items-center mb-12"
                >
                  <motion.button
                    whileHover={{ 
                      scale: 1.05, 
                      boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
                      y: -2
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCustomerClick}
                    className="group relative overflow-hidden flex items-center gap-4 bg-brand-cream text-brand-burgundy text-xl lg:text-2xl px-10 py-5 rounded-2xl font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300 min-w-[250px] justify-center"
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-brand-gold/20 to-transparent"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '100%' }}
                      transition={{ duration: 0.6 }}
                    />
                    <User className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
                    <span>I'm a Customer</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ 
                      scale: 1.05,
                      y: -2,
                      boxShadow: "0 20px 40px rgba(255,255,255,0.1)"
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleOwnerClick}
                    className="group relative overflow-hidden flex items-center gap-4 bg-transparent border-2 border-brand-cream text-brand-cream text-xl lg:text-2xl px-10 py-5 rounded-2xl font-semibold shadow-2xl hover:bg-brand-cream/10 backdrop-blur-sm transition-all duration-300 min-w-[250px] justify-center"
                  >
                    <motion.div
                      className="absolute inset-0 bg-brand-cream/10"
                      initial={{ scale: 0, opacity: 0 }}
                      whileHover={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                    <Store className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
                    <span>I'm a Venue Owner</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                  </motion.button>
                </motion.div>

                {/* Trust Indicators */}
                <motion.div
                  variants={itemVariants}
                  className="flex flex-wrap justify-center items-center gap-8 text-white/60 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-brand-gold fill-brand-gold" />
                    <span>4.9/5 Customer Rating</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-brand-gold" />
                    <span>100+ Premium Venues</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-gold" />
                    <span>50K+ Happy Customers</span>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.section>
        ) : (
          <motion.section 
            key="categories"
            className="relative bg-brand-cream py-20 min-h-screen flex items-center overflow-hidden"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute inset-0 opacity-5"
                animate={{
                  backgroundImage: [
                    'radial-gradient(circle at 20% 20%, #8B1538 0%, transparent 50%), radial-gradient(circle at 80% 80%, #DAA520 0%, transparent 50%), radial-gradient(circle at 40% 60%, #8B1538 0%, transparent 50%)',
                    'radial-gradient(circle at 80% 20%, #8B1538 0%, transparent 50%), radial-gradient(circle at 20% 80%, #DAA520 0%, transparent 50%), radial-gradient(circle at 60% 40%, #8B1538 0%, transparent 50%)',
                    'radial-gradient(circle at 20% 20%, #8B1538 0%, transparent 50%), radial-gradient(circle at 80% 80%, #DAA520 0%, transparent 50%), radial-gradient(circle at 40% 60%, #8B1538 0%, transparent 50%)'
                  ]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              />
              
              {/* Floating geometric shapes */}
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-20 h-20 border-2 border-brand-burgundy/10 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -30, 0],
                    x: [0, 15, 0],
                    rotate: [0, 180, 360],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 8 + Math.random() * 4,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>

            <div className="container mx-auto px-4 relative z-10">
              {/* Enhanced Header */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-center mb-20"
              >
                <motion.div
                  className="inline-block mb-6"
                  animate={{ 
                    rotate: [0, 2, -2, 0],
                    scale: [1, 1.02, 1]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <span className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-burgundy/10 to-brand-gold/10 backdrop-blur-sm border border-brand-burgundy/20 rounded-full px-6 py-2 text-brand-burgundy/70 font-medium">
                    <Sparkles className="w-4 h-4 text-brand-gold" />
                    Premium Venue Categories
                  </span>
                </motion.div>
                
                <motion.h2 
                  className="text-5xl md:text-6xl lg:text-7xl font-heading text-brand-burgundy mb-6 font-bold"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1, delay: 0.3 }}
                >
                  Browse by{" "}
                  <motion.span 
                    className="relative inline-block"
                    whileHover={{ scale: 1.05 }}
                  >
                    <span className="text-brand-gold font-extrabold">
                      Category
                    </span>
                    <motion.div
                      className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-brand-gold to-brand-burgundy rounded-full"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 1, delay: 0.8 }}
                    />
                  </motion.span>
                </motion.h2>
                
                <motion.p 
                  className="text-xl md:text-2xl text-brand-burgundy/70 max-w-3xl mx-auto leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                >
                  Choose your perfect venue type and discover the best experiences Lagos has to offer
                </motion.p>
              </motion.div>
              
              {/* Enhanced Category Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                {categories.map((category, index) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 60, rotateY: -15 }}
                    animate={{ opacity: 1, y: 0, rotateY: 0 }}
                    transition={{ 
                      duration: 0.8, 
                      delay: 0.6 + index * 0.15,
                      ease: "easeOut"
                    }}
                    whileHover={{ 
                      y: -15, 
                      scale: 1.03,
                      rotateY: 5,
                      transition: { 
                        duration: 0.4, 
                        ease: "easeOut",
                        type: "spring",
                        stiffness: 200
                      }
                    }}
                    className="group cursor-pointer perspective-1000"
                    onClick={() => handleCategoryClick(category.id)}
                    style={{ perspective: '1000px' }}
                  >
                    <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-brand-burgundy/10 group-hover:border-brand-gold/50 group-hover:shadow-3xl transition-all duration-500 transform-gpu">
                      {/* Animated Background with 3D effect */}
                      <motion.div 
                        className={`relative h-80 bg-gradient-to-br ${category.color} flex items-center justify-center overflow-hidden`}
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.4 }}
                      >
                        {/* Animated mesh gradient overlay */}
                        <motion.div
                          className="absolute inset-0 opacity-20"
                          animate={{
                            background: [
                              'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                              'radial-gradient(circle at 100% 100%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                              'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.3) 0%, transparent 50%)'
                            ]
                          }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        />
                        
                        {/* Floating particles specific to each category */}
                        {Array.from({ length: 12 }).map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-2 h-2 bg-white/30 rounded-full"
                            style={{
                              left: `${Math.random() * 100}%`,
                              top: `${Math.random() * 100}%`,
                            }}
                            animate={{
                              y: [0, -20, 0],
                              x: [0, 10, 0],
                              opacity: [0.3, 0.8, 0.3],
                              scale: [0.5, 1, 0.5],
                            }}
                            transition={{
                              duration: 3 + Math.random() * 2,
                              repeat: Infinity,
                              delay: Math.random() * 2,
                              ease: "easeInOut"
                            }}
                          />
                        ))}
                        
                        {/* Main Icon with enhanced animations */}
                        <motion.div
                          className="relative z-10"
                          whileHover={{ 
                            scale: 1.15, 
                            rotate: [0, -5, 5, 0],
                            y: -5
                          }}
                          transition={{ 
                            duration: 0.4,
                            rotate: { duration: 0.6 }
                          }}
                        >
                          <motion.div
                            className="relative"
                            animate={{
                              filter: [
                                'drop-shadow(0 0 20px rgba(255,255,255,0.5))',
                                'drop-shadow(0 0 30px rgba(255,255,255,0.8))',
                                'drop-shadow(0 0 20px rgba(255,255,255,0.5))'
                              ]
                            }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          >
                            <category.icon className="w-28 h-28 text-white drop-shadow-2xl" />
                          </motion.div>
                        </motion.div>
                        
                        {/* Enhanced floating elements */}
                        <motion.div
                          className="absolute top-6 right-6 bg-white/25 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/30"
                          initial={{ opacity: 0, x: 30, scale: 0.8 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                          whileHover={{ scale: 1.05, y: -2 }}
                        >
                          <span className="text-white text-sm font-bold">{category.count}</span>
                        </motion.div>

                        {/* Animated corner decorations */}
                        <motion.div
                          className="absolute bottom-6 left-6 w-8 h-8 border-l-2 border-b-2 border-white/40"
                          animate={{ 
                            scale: [1, 1.1, 1],
                            opacity: [0.4, 0.8, 0.4]
                          }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </motion.div>
                      
                      {/* Enhanced Content Section */}
                      <motion.div 
                        className="p-8 relative"
                        whileHover={{ backgroundColor: 'rgba(139, 21, 56, 0.02)' }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Animated title */}
                        <motion.h3 
                          className="text-3xl md:text-4xl font-bold text-brand-burgundy mb-4 group-hover:text-brand-gold transition-colors duration-300"
                          whileHover={{ x: 5 }}
                        >
                          {category.name}
                        </motion.h3>
                        
                        <motion.p 
                          className="text-brand-burgundy/70 text-lg mb-8 leading-relaxed"
                          initial={{ opacity: 0.7 }}
                          whileHover={{ opacity: 1 }}
                        >
                          {category.description}
                        </motion.p>
                        
                        {/* Enhanced Features List */}
                        <div className="space-y-3 mb-8">
                          {category.features.map((feature, idx) => (
                            <motion.div
                              key={idx}
                              className="flex items-center text-brand-burgundy/60 group-hover:text-brand-burgundy/80"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 1 + index * 0.1 + idx * 0.1 }}
                              whileHover={{ x: 5, scale: 1.02 }}
                            >
                              <motion.div
                                className="mr-3"
                                animate={{ rotate: [0, 180, 360] }}
                                transition={{ 
                                  duration: 8, 
                                  repeat: Infinity, 
                                  ease: "linear",
                                  delay: idx * 0.2
                                }}
                              >
                                <Star className="w-4 h-4 text-brand-gold fill-brand-gold" />
                              </motion.div>
                              <span className="font-medium">{feature}</span>
                            </motion.div>
                          ))}
                        </div>
                        
                        {/* Enhanced Action Button */}
                        <motion.div
                          className="relative overflow-hidden bg-gradient-to-r from-brand-burgundy/5 to-brand-gold/5 rounded-2xl p-4 group-hover:from-brand-burgundy/10 group-hover:to-brand-gold/10 transition-all duration-300"
                          whileHover={{ scale: 1.02 }}
                        >
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-brand-gold/20 to-brand-burgundy/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            initial={{ x: '-100%' }}
                            whileHover={{ x: '100%' }}
                            transition={{ duration: 0.8 }}
                          />
                          
                          <div className="flex items-center justify-between relative z-10">
                            <div>
                              <motion.span 
                                className="font-bold text-brand-burgundy group-hover:text-brand-gold transition-colors duration-300 text-lg"
                                whileHover={{ scale: 1.05 }}
                              >
                                Explore {category.name}
                              </motion.span>
                              <p className="text-sm text-brand-burgundy/60 mt-1">
                                Discover premium venues
                              </p>
                            </div>
                            
                            <motion.div
                              className="flex items-center justify-center w-12 h-12 bg-brand-burgundy group-hover:bg-brand-gold rounded-full transition-colors duration-300"
                              whileHover={{ 
                                scale: 1.1, 
                                rotate: 90,
                                boxShadow: "0 8px 25px rgba(139, 21, 56, 0.3)"
                              }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <ArrowRight className="w-5 h-5 text-white group-hover:text-brand-burgundy transition-colors duration-300" />
                            </motion.div>
                          </div>
                        </motion.div>

                        {/* Decorative elements */}
                        <motion.div
                          className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-brand-gold/10 to-brand-burgundy/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          animate={{ 
                            scale: [1, 1.2, 1],
                            rotate: [0, 180, 360]
                          }}
                          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        />
                      </motion.div>
                      
                      {/* Hover glow effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-brand-gold/0 via-brand-gold/5 to-brand-burgundy/0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500"
                        initial={{ scale: 0.8, opacity: 0 }}
                        whileHover={{ scale: 1, opacity: 1 }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Call to Action */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2 }}
                className="text-center mt-20"
              >
                <motion.p 
                  className="text-brand-burgundy/60 mb-6 text-lg"
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  Can't find what you're looking for?
                </motion.p>
                <motion.button
                  whileHover={{ 
                    scale: 1.05, 
                    y: -3,
                    boxShadow: "0 15px 35px rgba(139, 21, 56, 0.2)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/venues')}
                  className="bg-gradient-to-r from-brand-burgundy to-brand-burgundy-light hover:from-brand-gold hover:to-yellow-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-xl transition-all duration-300"
                >
                  Browse All Venues
                </motion.button>
              </motion.div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage; 