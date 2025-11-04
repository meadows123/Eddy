import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Wine, Music2, Utensils } from 'lucide-react';

const CategoryPage = () => {
  const navigate = useNavigate();

  const categories = [
    {
      id: 'restaurant',
      title: 'Restaurants',
      description: 'Discover exquisite dining experiences with diverse cuisines and elegant atmospheres.',
      icon: <Utensils className="h-12 w-12" />,
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
      // Use brand gradient
      color: 'from-brand-burgundy/95 to-brand-gold/90'
    },
    {
      id: 'club',
      title: 'Clubs',
      description: 'Dance the night away in Lagos\' most vibrant clubs with world-class DJs and entertainment.',
      icon: <Music2 className="h-12 w-12" />,
      image: 'https://images.unsplash.com/photo-1632111162953-c58fa2fa1080',
      color: 'from-brand-burgundy/95 to-brand-gold/90'
    },
    {
      id: 'lounge',
      title: 'Lounges',
      description: 'Experience sophisticated lounges with premium ambiance and exclusive VIP areas.',
      icon: <Wine className="h-12 w-12" />,
      image: 'https://images.unsplash.com/photo-1575429198097-0414ec08e8cd',
      color: 'from-brand-burgundy/95 to-brand-gold/90'
    }
  ];

  const handleCategoryClick = (categoryId) => {
    navigate(`/venues?type=${categoryId}`);
  };

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Hero Section */}
      <section className="relative h-[40vh] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-burgundy/90 to-brand-burgundy/70 z-10"></div>
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1575429198097-0414ec08e8cd" 
            alt="Lagos Nightlife" 
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="relative z-20 text-center px-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-6xl font-heading text-white mb-4"
          >
            Choose Your Experience
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-white/90 mb-8 max-w-2xl mx-auto"
          >
            Select a category to explore Lagos' finest venues
          </motion.p>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative group cursor-pointer"
                onClick={() => handleCategoryClick(category.id)}
              >
                <div className="relative h-[400px] rounded-xl overflow-hidden shadow-xl">
                  <img 
                    src={category.image} 
                    alt={category.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-b ${category.color} opacity-95`}></div>
                  
                  <div className="absolute inset-0 p-8 flex flex-col justify-end">
                    <div className="mb-4 text-brand-cream">
                      {category.icon}
                    </div>
                    <h2 className="text-3xl font-heading text-brand-cream mb-2">{category.title}</h2>
                    <p className="text-brand-cream/90 mb-4">{category.description}</p>
                    <div className="flex items-center text-brand-cream group-hover:translate-x-2 transition-transform">
                      <span className="font-medium">Explore {category.title}</span>
                      <svg 
                        className="w-5 h-5 ml-2" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M17 8l4 4m0 0l-4 4m4-4H3" 
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default CategoryPage; 