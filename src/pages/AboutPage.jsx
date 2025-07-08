import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Gem, Target, Zap, Heart, Star, Shield, Users, MapPin, Clock } from 'lucide-react';

const AboutPage = () => {
  return (
    <div className="bg-brand-cream/50 min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-heading text-brand-burgundy mb-4">About VIP Club</h1>
          <p className="text-brand-burgundy/70 text-lg max-w-3xl mx-auto">
            Built in honor of our friend Eddy - your gateway to Nigeria's most exclusive venue experiences. We connect you with premium venues and unforgettable moments across Lagos and beyond.
          </p>
        </div>

        {/* Hero Image and Story */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <img  
              src="/images/logos/WhatsApp Image 2025-07-07 at 21.57.25_f1c2e60e.jpg" 
              alt="Eddy - Our beloved friend who inspired VIP Club"
              className="rounded-lg shadow-xl object-cover w-full h-auto aspect-[4/3] border-4 border-brand-gold" 
            />
            <p className="text-center text-brand-burgundy/60 text-sm mt-2 italic">
              Eddy - The inspiration behind VIP Club
            </p>
          </div>
          <div className="space-y-6">
            <h2 className="text-3xl font-heading font-bold text-brand-burgundy">Our Story</h2>
            <p className="text-brand-burgundy/80 leading-relaxed">
              VIP Club was born from a deeply personal place - a promise to honor the memory of our dear friend Eddy, who believed that life's most precious moments happen when people come together. 
              Eddy always said that everyone deserves to feel like a VIP, to experience the joy of being celebrated and surrounded by good company.
            </p>
            <p className="text-brand-burgundy/80 leading-relaxed">
              After we lost Eddy, we realized how important it is to create spaces and opportunities for people to connect, celebrate, and make lasting memories. 
              We named it "VIP Club" in his honor - because to Eddy, VIP wasn't just about exclusive venues, it was about making every person feel valued, important, and part of something special.
            </p>
            <p className="text-brand-burgundy/80 leading-relaxed">
              This platform is our way of ensuring that Eddy's vision lives on - connecting people with amazing venues where they can create the kind of memories he would have loved to be part of.
            </p>
            <div className="flex space-x-4">
              <Badge className="bg-brand-gold text-brand-burgundy">Founded 2024</Badge>
              <Badge className="bg-brand-burgundy text-white">Lagos Based</Badge>
              <Badge className="bg-brand-cream text-brand-burgundy border border-brand-burgundy">Built with ❤️</Badge>
            </div>
          </div>
        </div>

        {/* Memorial Section */}
        <div className="mb-16">
          <Card className="bg-gradient-to-r from-brand-burgundy/5 to-brand-gold/5 border-brand-gold/30">
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <img 
                    src="/images/logos/WhatsApp Image 2025-07-07 at 21.57.25_f1c2e60e.jpg"
                    alt="Eddy - Forever in our hearts"
                    className="w-24 h-24 rounded-full object-cover border-4 border-brand-gold shadow-lg"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-brand-burgundy rounded-full p-2">
                    <Heart className="h-4 w-4 text-white fill-current" />
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-heading font-bold text-brand-burgundy mb-4">In Loving Memory of Eddy</h3>
              <p className="text-brand-burgundy/80 max-w-2xl mx-auto leading-relaxed">
                "Everyone deserves their VIP moment" - these words from our beloved friend Eddy inspire everything we do. 
                Though he's no longer with us, his spirit of bringing people together and making everyone feel special 
                lives on through every booking, every celebration, and every connection made on our platform.
              </p>
              <p className="text-brand-burgundy/70 mt-4 italic">
                This one's for you, Eddy. Thank you for showing us that the real VIP experience is about the people we share it with.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* What We Offer */}
        <div className="mb-16">
          <h2 className="text-3xl font-heading font-bold text-center mb-12 text-brand-burgundy">What We Offer</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                icon: <Gem className="h-10 w-10 text-brand-burgundy" />, 
                title: 'Exclusive Access', 
                description: 'Unlock doors to premium venues, VIP sections, and exclusive events across Lagos and Nigeria.' 
              },
              { 
                icon: <Target className="h-10 w-10 text-brand-burgundy" />, 
                title: 'Curated Venues', 
                description: 'Handpicked selection of top-tier restaurants, lounges, and clubs known for exceptional service and ambiance.' 
              },
              { 
                icon: <Zap className="h-10 w-10 text-brand-burgundy" />, 
                title: 'Seamless Booking', 
                description: 'Effortless table reservations and event bookings through our intuitive platform with instant confirmation.' 
              },
            ].map((item, index) => (
              <Card key={index} className="bg-white border-brand-burgundy/10 hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-4 p-3 bg-brand-gold/20 rounded-full w-fit mx-auto">{item.icon}</div>
                  <h3 className="text-xl font-heading font-semibold mb-3 text-brand-burgundy">{item.title}</h3>
                  <p className="text-brand-burgundy/70">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Our Values */}
        <div className="mb-16">
          <h2 className="text-3xl font-heading font-bold text-center mb-12 text-brand-burgundy">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
                             { icon: <Heart className="h-8 w-8" />, title: 'Honor & Memory', description: 'Every experience honors Eddy\'s belief that everyone deserves their VIP moment.' },
               { icon: <Star className="h-8 w-8" />, title: 'Excellence', description: 'We strive for perfection in every booking and experience, just as Eddy would have wanted.' },
              { icon: <Shield className="h-8 w-8" />, title: 'Trust', description: 'Secure payments and reliable service you can count on, built on a foundation of integrity.' },
              { icon: <Users className="h-8 w-8" />, title: 'Community', description: 'Building connections and bringing people together, celebrating life and friendship.' },
            ].map((value, index) => (
              <Card key={index} className="bg-white border-brand-burgundy/10 text-center">
                <CardContent className="p-6">
                  <div className="text-brand-burgundy mb-3 flex justify-center">{value.icon}</div>
                  <h4 className="font-semibold text-brand-burgundy mb-2">{value.title}</h4>
                  <p className="text-brand-burgundy/70 text-sm">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-16">
          <Card className="bg-brand-burgundy text-white">
            <CardContent className="p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div>
                  <div className="text-3xl font-bold text-brand-gold mb-2">50+</div>
                  <div className="text-brand-cream/80">Partner Venues</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-brand-gold mb-2">1000+</div>
                  <div className="text-brand-cream/80">VIP Moments Created<br/><span className="text-xs">In Eddy's Honor</span></div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-brand-gold mb-2">24/7</div>
                  <div className="text-brand-cream/80">Customer Support</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-brand-gold mb-2">5★</div>
                  <div className="text-brand-cream/80">Average Rating</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Location & Contact Info */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-white border-brand-burgundy/10">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-brand-burgundy mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Our Location
              </h3>
              <div className="space-y-2 text-brand-burgundy/80">
                <p>VIP Club Headquarters</p>
                <p>(Founded in Memory of Eddy)</p>
                <p>123 Victoria Island</p>
                <p>Lagos, Nigeria</p>
                <p className="pt-2">
                  <strong>Phone:</strong> +234 (0) 123 456 7890<br />
                  <strong>Email:</strong> info@vipclub.ng<br />
                  <em className="text-sm">Continuing Eddy's legacy</em>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-brand-burgundy/10">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-brand-burgundy mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Business Hours
              </h3>
              <div className="space-y-2 text-brand-burgundy/80">
                <div className="flex justify-between">
                  <span>Monday - Friday</span>
                  <span>9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday</span>
                  <span>10:00 AM - 4:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday</span>
                  <span>Closed</span>
                </div>
                <p className="text-sm pt-2 border-t border-brand-burgundy/10">
                  Our booking platform is available 24/7 for your convenience.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <Card className="bg-brand-gold/20 border-brand-gold/30">
            <CardContent className="p-8">
              <h3 className="text-2xl font-heading font-bold text-brand-burgundy mb-4">Ready to Create Your VIP Moment?</h3>
                             <p className="text-brand-burgundy/80 mb-6 max-w-2xl mx-auto">
                 Join thousands of people who have discovered their perfect venue through VIP Club - Eddy's legacy of bringing people together. 
                 Every booking helps us carry forward Eddy's mission of making everyone feel special and creating unforgettable memories.
               </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/venues"
                  className="inline-flex items-center justify-center px-8 py-3 bg-brand-burgundy text-white rounded-lg hover:bg-brand-burgundy/90 transition-colors font-semibold"
                >
                  Explore Venues
                </a>
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center px-8 py-3 border border-brand-burgundy text-brand-burgundy rounded-lg hover:bg-brand-burgundy/10 transition-colors font-semibold"
                >
                  Share Your Story
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;