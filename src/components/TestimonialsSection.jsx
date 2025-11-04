import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: 'Olivia Smith',
    location: 'London, UK',
    quote: 'NightVibe made our night out in Shoreditch absolutely epic! The VIP table at Fabric was seamless to book and the service was top-notch.',
    rating: 5,
    imageAlt: 'Happy woman in a London club',
    imagePlaceholder: 'Stylish woman enjoying nightlife in London'
  },
  {
    id: 2,
    name: 'James Wilson',
    location: 'Manchester, UK',
    quote: 'Heading to Warehouse Project was a breeze with NightVibe. Got our tickets sorted quickly and the app gave great info on the venue.',
    rating: 5,
    imageAlt: 'Man smiling at a Manchester music event',
    imagePlaceholder: 'Man having fun at a Manchester music event'
  },
  {
    id: 3,
    name: 'Chloe Davies',
    location: 'Bristol, UK',
    quote: 'Found Motion on NightVibe for a big DnB night. The app is super easy to use and the booking was instant. Highly recommend!',
    rating: 4,
    imageAlt: 'Young woman at a Bristol nightclub',
    imagePlaceholder: 'Energetic young woman at a Bristol nightclub'
  }
];

const TestimonialsSection = () => {
  return (
    <section className="py-16 bg-gradient-to-b from-background/95 to-background">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Hear from people who have experienced unforgettable nights with our VIP services.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-secondary/30 backdrop-blur-sm border border-border/50 rounded-lg p-6 glass-effect"
            >
              <div className="flex items-center mb-4">
                <div className="mr-4 rounded-full overflow-hidden w-12 h-12">
                  <img  
                    class="w-full h-full object-cover" 
                    alt={testimonial.imageAlt} src="https://images.unsplash.com/photo-1595872018818-97555653a011" />
                </div>
                <div>
                  <h4 className="font-semibold">{testimonial.name}</h4>
                  <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                </div>
              </div>
              
              <p className="text-sm mb-4 italic">"{testimonial.quote}"</p>
              
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < testimonial.rating
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'text-gray-400'
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;