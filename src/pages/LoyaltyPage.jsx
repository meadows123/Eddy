import React from 'react';
import { motion } from 'framer-motion';
import { Star, Gift, Zap, Crown, Award } from 'lucide-react'; // Award for a generic perk icon
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const loyaltyTiers = [
  {
    name: 'Bronze Vibe',
    icon: <Star className="h-10 w-10 text-yellow-600" />,
    points: '0 - 499 Points',
    perks: ['Exclusive Newsletter', 'Early Access to Select Events', 'Basic Support'],
    color: 'bg-yellow-600/10 border-yellow-600/30 text-yellow-700',
    gradient: 'from-yellow-600/10 to-yellow-500/5',
  },
  {
    name: 'Silver Spark',
    icon: <Zap className="h-10 w-10 text-gray-400" />,
    points: '500 - 1499 Points',
    perks: ['All Bronze Perks', 'Priority Booking Window', 'Small Birthday Treat', '5% Off Select Bookings'],
    color: 'bg-gray-400/10 border-gray-400/30 text-gray-600',
    gradient: 'from-gray-400/10 to-gray-300/5',
  },
  {
    name: 'Gold Glow',
    icon: <Gift className="h-10 w-10 text-brand-gold" />,
    points: '1500 - 2999 Points',
    perks: ['All Silver Perks', 'Complimentary Welcome Drink (Selected Venues)', 'Dedicated Support Line', '10% Off All Bookings'],
    color: 'bg-brand-gold/10 border-brand-gold/30 text-brand-gold',
    gradient: 'from-brand-gold/10 to-yellow-400/5',
  },
  {
    name: 'Platinum Pulse',
    icon: <Crown className="h-10 w-10 text-brand-burgundy" />,
    points: '3000+ Points',
    perks: ['All Gold Perks', 'Guaranteed Table (with 24hr notice)', 'Exclusive Event Invites', 'Annual VIP Gift Box', 'Personal Concierge Access'],
    color: 'bg-brand-burgundy/10 border-brand-burgundy/30 text-brand-burgundy',
    gradient: 'from-brand-burgundy/10 to-red-700/5',
  },
];

const LoyaltyPage = () => {
  return (
    <div className="py-12 md:py-20 bg-brand-cream font-body">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-12 md:mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-heading mb-4 text-brand-burgundy">
            LagosVibe <span className="text-brand-gold">Loyalty</span> Program
          </h1>
          <p className="text-lg md:text-xl text-brand-burgundy/80 max-w-3xl mx-auto leading-relaxed">
            Your loyalty deserves recognition. Earn points with every booking and unlock a world of exclusive perks, premium discounts, and unforgettable VIP experiences across Lagos.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-16">
          {loyaltyTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.15, ease: "circOut" }}
            >
              <Card className={`h-full flex flex-col text-center bg-white shadow-xl hover:shadow-2xl transition-shadow duration-300 rounded-xl border ${tier.color.split(' ')[1]} overflow-hidden`}>
                <CardHeader className={`p-6 bg-gradient-to-br ${tier.gradient}`}>
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/50 shadow-lg ${tier.color.split(' ')[0]}`}>
                    {React.cloneElement(tier.icon, { className: `h-10 w-10 ${tier.color.split(' ')[2]}` })}
                  </div>
                  <CardTitle className={`text-3xl font-heading ${tier.color.split(' ')[2]}`}>{tier.name}</CardTitle>
                  <CardDescription className={`font-semibold ${tier.color.split(' ')[2]}/70`}>{tier.points}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow p-6">
                  <ul className="space-y-2.5 text-sm text-brand-burgundy/70">
                    {tier.perks.map(perk => (
                      <li key={perk} className="flex items-start">
                        <Award className="h-4 w-4 mr-2 mt-0.5 text-brand-gold shrink-0" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
          className="text-center bg-white p-8 md:p-12 rounded-xl shadow-xl border border-brand-burgundy/10"
        >
          <h2 className="text-3xl md:text-4xl font-heading text-brand-burgundy mb-6">How to Elevate Your Status</h2>
          <div className="max-w-3xl mx-auto text-brand-burgundy/80 space-y-6 mb-10 text-left md:text-center">
            <p className="flex items-start md:justify-center"><strong className="font-semibold text-brand-gold mr-2">1. Sign Up & Book:</strong> Automatically enroll when you create your LagosVibe account and make your first booking.</p>
            <p className="flex items-start md:justify-center"><strong className="font-semibold text-brand-gold mr-2">2. Earn Points:</strong> Collect points for every Naira spent on VIP tickets and table reservations.</p>
            <p className="flex items-start md:justify-center"><strong className="font-semibold text-brand-gold mr-2">3. Ascend Tiers:</strong> Unlock increasingly valuable rewards as you accumulate points and reach new loyalty levels.</p>
            <p className="flex items-start md:justify-center"><strong className="font-semibold text-brand-gold mr-2">4. Indulge in Perks:</strong> Enjoy benefits like complimentary drinks, priority access, exclusive event invitations, and much more.</p>
          </div>
          <Link to="/venues">
            <Button size="lg" className="bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90 transition-opacity rounded-full px-10 py-7 text-lg">
              Start Your VIP Journey
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default LoyaltyPage;