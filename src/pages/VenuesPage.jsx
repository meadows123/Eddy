import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Tag, Star, FilterX, Users, Utensils, GlassWater, Music2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import VenueCard from '@/components/VenueCard';
// Dynamic filter options will be generated from venue data
const ratings = [
  { value: '4.5', label: '4.5+ Stars' },
  { value: '4.0', label: '4.0+ Stars' },
  { value: '3.5', label: '3.5+ Stars' },
  { value: '3.0', label: '3.0+ Stars' }
];
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import VenueDetailPage from '@/pages/VenueDetailPage';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase.js';

// Fixed table import issues - cache refresh
const VenuesPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const typeFromUrl = searchParams.get('type');
  
  // Map URL type to venue type format
  const mapTypeToVenueType = (type) => {
    if (!type) return 'all';
    // Map the URL parameters to the correct venue types
    const typeMap = {
      'restaurant': 'Restaurant',
      'club': 'Club',
      'lounge': 'Lounge'
    };
    return typeMap[type] || 'all';
  };

  if (id) {
    return <VenueDetailPage />;
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredVenues, setFilteredVenues] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dynamic filter options state
  const [filterOptions, setFilterOptions] = useState({
    locations: [],
    venueTypes: [],
    cuisineTypes: [],
    musicGenres: []
  });
  
  const [filters, setFilters] = useState({
    location: 'all',
    venueType: mapTypeToVenueType(typeFromUrl),
    rating: 'all',
    cuisineType: 'all',
    musicGenre: 'all',
  });

  // Function to generate dynamic filter options from venues
  const generateFilterOptions = React.useCallback((venuesData) => {
    const locations = [...new Set(venuesData.map(venue => venue.location).filter(Boolean))].sort();
    const venueTypes = [...new Set(venuesData.map(venue => venue.type).filter(Boolean))].sort();
    
    // Fallback options if no data is available
    const fallbackLocations = ['Lagos Island', 'Victoria Island', 'Lekki', 'Ikeja', 'Surulere'];
    const fallbackVenueTypes = ['Restaurant', 'Club', 'Lounge'];
    const fallbackCuisineTypes = ['Nigerian', 'International', 'Fusion', 'Mediterranean', 'Asian', 'European', 'African', 'American'];
    const fallbackMusicGenres = ['Afrobeats', 'Hip Hop', 'R&B', 'House', 'Amapiano', 'Reggae', 'Pop', 'Jazz', 'Live Band', 'DJ Sets'];
    
    // Extract cuisine types from venues
    const cuisineTypes = [];
    venuesData.forEach(venue => {
      if (venue.cuisine && Array.isArray(venue.cuisine)) {
        venue.cuisine.forEach(cuisine => {
          if (cuisine && !cuisineTypes.includes(cuisine)) {
            cuisineTypes.push(cuisine);
          }
        });
      }
    });
    cuisineTypes.sort();
    
    // Extract music genres from venues
    const musicGenres = [];
    venuesData.forEach(venue => {
      if (venue.music && Array.isArray(venue.music)) {
        venue.music.forEach(music => {
          if (music && !musicGenres.includes(music)) {
            musicGenres.push(music);
          }
        });
      }
      // Also check musicGenres field if it exists
      if (venue.musicGenres && Array.isArray(venue.musicGenres)) {
        venue.musicGenres.forEach(genre => {
          if (genre && !musicGenres.includes(genre)) {
            musicGenres.push(genre);
          }
        });
      }
    });
    musicGenres.sort();
    
    setFilterOptions({
      locations: locations.length > 0 ? locations : fallbackLocations,
      venueTypes: venueTypes.length > 0 ? venueTypes : fallbackVenueTypes,
      cuisineTypes: cuisineTypes.length > 0 ? cuisineTypes : fallbackCuisineTypes,
      musicGenres: musicGenres.length > 0 ? musicGenres : fallbackMusicGenres
    });
  }, []);


  // Add effect to update filters when URL changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      venueType: mapTypeToVenueType(typeFromUrl)
    }));
  }, [typeFromUrl]);

  useEffect(() => {
    let results = venues;
    if (searchTerm) {
      results = results.filter(venue =>
        (venue.name && venue.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (venue.description && venue.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (venue.ambiance && venue.ambiance.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (venue.cuisine && Array.isArray(venue.cuisine) && venue.cuisine.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()))) ||
        (venue.music && Array.isArray(venue.music) && venue.music.some(m => m.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    }
    if (filters.location !== 'all') {
      results = results.filter(venue => venue.location === filters.location);
    }
    if (filters.venueType !== 'all') {
      results = results.filter(venue => venue.type && venue.type.toLowerCase() === filters.venueType.toLowerCase());
    }
    if (filters.rating !== 'all') {
      results = results.filter(venue => venue.rating >= parseFloat(filters.rating));
    }
    if (filters.cuisineType !== 'all') {
      results = results.filter(venue => 
        (venue.cuisine && Array.isArray(venue.cuisine) && venue.cuisine.includes(filters.cuisineType))
      );
    }
    if (filters.musicGenre !== 'all') {
      results = results.filter(venue => 
        (venue.music && Array.isArray(venue.music) && venue.music.includes(filters.musicGenre)) ||
        (venue.musicGenres && Array.isArray(venue.musicGenres) && venue.musicGenres.includes(filters.musicGenre))
      );
    }
    setFilteredVenues(results);
  }, [venues, searchTerm, filters.location, filters.venueType, filters.rating, filters.cuisineType, filters.musicGenre]);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        // Fetch venues
        const { data: venuesData, error: venuesError } = await supabase
          .from('venues')
          .select('*')
          .eq('status', 'approved')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (venuesError) throw venuesError;

        // Fetch images for all venues
        const { data: imagesData, error: imagesError } = await supabase
          .from('venue_images')
          .select('*')
          .order('is_primary', { ascending: false });

        if (imagesError) {
          console.error('Error fetching images:', imagesError);
        }

        // Combine venues with their images
        const venuesWithImages = venuesData.map(venue => {
          const venueImages = imagesData 
            ? imagesData
                .filter(img => img.venue_id === venue.id)
                .map(img => img.image_url)
            : [];
          
          return {
            ...venue,
            images: venueImages
          };
        });

        setVenues(venuesWithImages);
        generateFilterOptions(venuesWithImages); // Generate dynamic options after venues are fetched
      } catch (error) {
        console.error('Error fetching venues:', error);
        toast({
          title: "Error",
          description: "Failed to load venues. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, []);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilters({
      location: 'all',
      venueType: 'all',
      rating: 'all',
      cuisineType: 'all',
      musicGenre: 'all',
    });
  };

  // Top picks for tonight (use live venues)
  const topPicks = venues.filter(v => v.rating >= 4.7).slice(0, 3);
  
  return (
    <div className="py-12 bg-brand-cream text-brand-burgundy">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <h1 className="text-5xl font-heading mb-4 text-brand-burgundy">Explore Lagos' Premier Venues</h1>
          <p className="text-lg text-brand-burgundy/80 font-body max-w-3xl mx-auto">
            Discover an curated collection of Lagos' most exclusive clubs, sophisticated restaurants, and chic lounges.
          </p>
        </motion.div>

        {/* Top Picks for Tonight Section */}
        {topPicks.length > 0 && (
          <motion.section 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-heading mb-8 text-center text-brand-burgundy">Top Picks for Tonight</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {topPicks.map(venue => (
                 <motion.div
                    key={venue.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0,0,0,0.05)"}}
                  >
                    <Card className="overflow-hidden h-full flex flex-col bg-white border-brand-burgundy/10 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
                      <div className="relative h-56 overflow-hidden">
                        <img 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          alt={`${venue.name} venue image`}
                          src={venue.images && venue.images.length > 0 
                            ? venue.images[0] 
                            : "https://images.unsplash.com/photo-1699990320295-ecd2664079ab"
                          } />
                        <div className="absolute top-3 right-3">
                           <span className="bg-brand-gold text-brand-burgundy px-3 py-1 text-xs font-semibold rounded-full shadow">Top Pick</span>
                        </div>
                      </div>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-2xl font-heading text-brand-burgundy">{venue.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-grow pt-0">
                        <p className="text-sm text-brand-burgundy/70 mb-3 line-clamp-2">{venue.description}</p>
                        <div className="flex items-center text-sm text-brand-gold">
                          <Star className="h-4 w-4 fill-current mr-1" /> {venue.rating}
                        </div>
                      </CardContent>
                       <CardFooter className="pt-2">
                        <Button asChild className="w-full bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90 transition-opacity rounded-md">
                          <Link to={`/venues/${venue.id}`}>View Details & Book</Link>
                        </Button>
                      </CardFooter>
                    </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
        
        <div className="mb-10 p-6 md:p-8 bg-white border border-brand-burgundy/10 rounded-xl shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-x-6 gap-y-4 items-end">
            <div className="relative sm:col-span-2 lg:col-span-1 xl:col-span-2">
              <Label htmlFor="search" className="text-sm font-body font-medium mb-1 block text-brand-burgundy/80">Search Venues</Label>
              <div className="relative">
                <Input 
                  id="search"
                  type="text" 
                  placeholder="Name, vibe, e.g., 'Rooftop Bar'" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 bg-brand-cream/50 border-brand-burgundy/30 focus:border-brand-gold focus:ring-brand-gold text-brand-burgundy placeholder:text-brand-burgundy/60 rounded-md"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-brand-burgundy/60" />
              </div>
            </div>

            <div>
              <Label htmlFor="location-filter" className="text-sm font-body font-medium mb-1 block text-brand-burgundy/80 flex items-center"><MapPin className="h-4 w-4 mr-1 text-brand-gold" />Location</Label>
              <Select value={filters.location} onValueChange={(value) => handleFilterChange('location', value)} disabled={loading}>
                <SelectTrigger id="location-filter" className="h-12 bg-brand-cream/50 border-brand-burgundy/30 text-brand-burgundy rounded-md">
                  <SelectValue placeholder={loading ? "Loading..." : "All"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {filterOptions.locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type-filter" className="text-sm font-body font-medium mb-1 block text-brand-burgundy/80 flex items-center"><Tag className="h-4 w-4 mr-1 text-brand-gold" />Venue Type</Label>
              <Select 
                value={filters.venueType} 
                onValueChange={(value) => handleFilterChange('venueType', value)}
                disabled={loading}
              >
                <SelectTrigger id="type-filter" className="h-12 bg-brand-cream/50 border-brand-burgundy/30 text-brand-burgundy rounded-md">
                  <SelectValue placeholder={loading ? "Loading..." : "All"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {filterOptions.venueTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="rating-filter" className="text-sm font-body font-medium mb-1 block text-brand-burgundy/80 flex items-center"><Star className="h-4 w-4 mr-1 text-brand-gold" />Min. Rating</Label>
              <Select value={filters.rating} onValueChange={(value) => handleFilterChange('rating', value)} disabled={loading}>
                <SelectTrigger id="rating-filter" className="h-12 bg-brand-cream/50 border-brand-burgundy/30 text-brand-burgundy rounded-md"><SelectValue placeholder="Any Rating" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Any Rating</SelectItem>{ratings.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            
            {filters.venueType === 'Restaurant' && (
              <div>
                <Label htmlFor="cuisine-filter" className="text-sm font-body font-medium mb-1 block text-brand-burgundy/80 flex items-center"><Utensils className="h-4 w-4 mr-1 text-brand-gold" />Cuisine Type</Label>
                <Select value={filters.cuisineType} onValueChange={(value) => handleFilterChange('cuisineType', value)} disabled={loading}>
                  <SelectTrigger id="cuisine-filter" className="h-12 bg-brand-cream/50 border-brand-burgundy/30 text-brand-burgundy rounded-md"><SelectValue placeholder="Any Cuisine" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Any Cuisine</SelectItem>{filterOptions.cuisineTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            
            {(filters.venueType === 'Club' || filters.venueType === 'Lounge') && (
              <div>
                <Label htmlFor="music-filter" className="text-sm font-body font-medium mb-1 block text-brand-burgundy/80 flex items-center"><Music2 className="h-4 w-4 mr-1 text-brand-gold" />Music Genre</Label>
                <Select value={filters.musicGenre} onValueChange={(value) => handleFilterChange('musicGenre', value)} disabled={loading}>
                  <SelectTrigger id="music-filter" className="h-12 bg-brand-cream/50 border-brand-burgundy/30 text-brand-burgundy rounded-md"><SelectValue placeholder="Any Genre" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Any Genre</SelectItem>{filterOptions.musicGenres.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Button onClick={resetFilters} variant="ghost" className="mt-6 text-sm text-brand-burgundy/70 hover:text-brand-gold">
            <FilterX className="h-4 w-4 mr-1" /> Reset All Filters
          </Button>
        </div>
        
        {/* Venues Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredVenues.length > 0 ? (
            filteredVenues.map((venue, index) => (
              <motion.div
                key={venue.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
              >
                <VenueCard venue={venue} />
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-16">
              <Users className="h-16 w-16 mx-auto text-brand-burgundy/30 mb-6" />
              <h3 className="text-2xl font-heading mb-3 text-brand-burgundy">No Venues Match Your Criteria</h3>
              <p className="text-brand-burgundy/70 font-body mb-6 max-w-md mx-auto">
                Please try adjusting your search terms or filters. Lagos has many hidden gems waiting to be discovered!
              </p>
              <Button 
                variant="outline"
                className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
                onClick={resetFilters}
              >
                Clear Filters & Search Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VenuesPage;