import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, MapPin, Search, Clock, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

// Mock upcoming events data for Lagos
const upcomingEventsData = [
  {
    id: 'evt1',
    name: 'AfroBeats All Night Long',
    date: '2025-07-15',
    time: '10:00 PM - Late',
    venueName: 'Club DNA',
    venueId: '1',
    description: 'Experience the hottest Afrobeats tracks with top DJs spinning all night. Special guest appearance!',
    coverImage: 'AfroBeats party flyer',
    tags: ['Afrobeats', 'DJ Night', 'Live Music'],
    price: 5000,
    rsvpLink: '/venues/1',
  },
  {
    id: 'evt2',
    name: 'Lagos Fashion Week Afterparty',
    date: '2025-08-05',
    time: '11:00 PM onwards',
    venueName: 'RSVP Lagos',
    venueId: '2',
    description: 'Mingle with designers, models, and fashion enthusiasts at the official LFW afterparty. Dress to impress.',
    coverImage: 'Fashion week afterparty scene',
    tags: ['Fashion', 'Exclusive', 'Networking', 'Celebrity'],
    price: 15000,
    rsvpLink: '/venues/2',
  },
  {
    id: 'evt3',
    name: 'Sip & Paint Soirée',
    date: '2025-07-28',
    time: '6:00 PM - 9:00 PM',
    venueName: 'Circa Lagos',
    venueId: '5',
    description: 'Unleash your inner artist with a guided painting session, complemented by fine wines and gourmet bites.',
    coverImage: 'Sip and paint event with people painting',
    tags: ['Art', 'Wine', 'Relaxed', 'Creative'],
    price: 10000,
    rsvpLink: '/venues/5',
  },
  {
    id: 'evt4',
    name: 'Old School Hip-Hop Throwback',
    date: '2025-08-12',
    time: '9:00 PM - 3:00 AM',
    venueName: 'The Place (Victoria Island)',
    venueId: '6',
    description: 'Jam to classic 90s and 00s hip-hop anthems. Breakdancers welcome!',
    coverImage: 'Hip hop party retro style',
    tags: ['Hip-Hop', 'Throwback', 'Dance'],
    price: 3000,
    rsvpLink: '/venues/6',
  }
];

const EventsPage = () => {
  const [events, setEvents] = useState(upcomingEventsData);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (searchTerm) {
      setEvents(
        upcomingEventsData.filter(event =>
          event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.venueName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      );
    } else {
      setEvents(upcomingEventsData);
    }
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-brand-cream text-brand-burgundy font-body">
      <div className="container py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-heading mb-3 text-brand-burgundy">Upcoming Nightlife Events</h1>
          <p className="text-lg text-brand-burgundy/80 max-w-2xl mx-auto">
            Stay in the know. Discover Lagos's most exciting upcoming parties, shows, and exclusive gatherings.
          </p>
        </motion.div>

        <div className="mb-8 max-w-xl mx-auto">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search events, venues, or tags (e.g., Afrobeats)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 bg-white border-brand-burgundy/20 focus:border-brand-gold focus:ring-brand-gold text-brand-burgundy rounded-full shadow-sm"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-brand-burgundy/50" />
          </div>
        </div>

        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="overflow-hidden h-full flex flex-col bg-white border-brand-burgundy/10 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl">
                  <div className="relative h-56">
                    <img 
                      className="w-full h-full object-cover"
                      alt={`Cover image for ${event.name}`}
                      src="https://images.unsplash.com/photo-1679521358679-301c295e2cd4" />
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-brand-gold text-brand-burgundy font-semibold shadow">₦{event.price.toLocaleString()}</Badge>
                    </div>
                  </div>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-2xl font-heading text-brand-burgundy">{event.name}</CardTitle>
                    <CardDescription className="text-sm text-brand-burgundy/70 flex items-center pt-1">
                      <CalendarDays className="h-4 w-4 mr-1.5 text-brand-gold" /> {new Date(event.date).toLocaleDateString('en-NG', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow pt-0">
                    <p className="text-sm text-brand-burgundy/80 mb-3 line-clamp-3">{event.description}</p>
                    <div className="text-xs text-brand-burgundy/70 space-y-1">
                      <p className="flex items-center"><MapPin className="h-3.5 w-3.5 mr-1.5 text-brand-gold" /> {event.venueName}</p>
                      <p className="flex items-center"><Clock className="h-3.5 w-3.5 mr-1.5 text-brand-gold" /> {event.time}</p>
                    </div>
                    <div className="mt-3">
                      {event.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="mr-1.5 mb-1.5 border-brand-gold/50 text-brand-burgundy/80 bg-brand-gold/10 text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2">
                    <Button asChild className="w-full bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90 transition-opacity rounded-md py-3">
                      <Link to={event.rsvpLink || `/venues/${event.venueId || ''}`}>
                        <UserPlus className="h-4 w-4 mr-2" /> Book / RSVP
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <CalendarDays className="h-20 w-20 mx-auto text-brand-burgundy/30 mb-6" />
            <h3 className="text-2xl font-heading text-brand-burgundy mb-3">No Events Found</h3>
            <p className="text-brand-burgundy/70 font-body mb-6 max-w-md mx-auto">
              There are no events matching your search, or no upcoming events listed at the moment. Please check back soon!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage;