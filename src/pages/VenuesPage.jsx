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
    const typeMap = {
      'restaurant': 'Restaurant',
      'restaurants': 'Restaurant',
      'club': 'Club',
      'clubs': 'Club',
      'lounge': 'Lounge',
      'lounges': 'Lounge',
    };
    return typeMap[type.toLowerCase()] || 'all';
  };

  // Normalize raw venue type values into a canonical set to avoid duplicates
  const normalizeVenueType = (rawType) => {
    if (!rawType || typeof rawType !== 'string') return null;
    const t = rawType.trim().toLowerCase();
    if (t.startsWith('rest')) return 'Restaurant';
    if (t.startsWith('club')) return 'Club';
    if (t.startsWith('loun')) return 'Lounge';
    // Fallback: capitalize first letter
    return rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();
  };

  const standardVenueTypes = ['Restaurant', 'Club', 'Lounge'];

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
    const fallbackLocations = ['Lagos Island', 'Victoria Island', 'Lekki', 'Ikeja', 'Surulere'];
    const fallbackCuisineTypes = ['Nigerian', 'International', 'Fusion', 'Mediterranean', 'Asian', 'European', 'African', 'American'];
    const fallbackMusicGenres = ['Afrobeats', 'Hip Hop', 'R&B', 'House', 'Amapiano', 'Reggae', 'Pop', 'Jazz', 'Live Band', 'DJ Sets'];

    const locations = [...new Set(venuesData.map(venue => venue.city).filter(Boolean))].sort();

    // Normalize venue types from data and merge with standard list, then de-duplicate
    const foundTypes = venuesData
      .map(venue => normalizeVenueType(venue.type))
      .filter(Boolean);
    const mergedTypes = Array.from(new Set([...foundTypes, ...standardVenueTypes]));
    // Keep standard types order first, then any extras alphabetically
    const venueTypes = [
      ...standardVenueTypes.filter(t => mergedTypes.includes(t)),
      ...mergedTypes.filter(t => !standardVenueTypes.includes(t)).sort()
    ];

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
      if (venue.musicGenres && Array.isArray(venue.musicGenres)) {
        venue.musicGenres.forEach(genre => {
          if (genre && !musicGenres.includes(genre)) {
            musicGenres.push(genre);
          }
        });
      }
      if (venue.music_genres && Array.isArray(venue.music_genres)) {
        venue.music_genres.forEach(genre => {
          if (genre && !musicGenres.includes(genre)) {
            musicGenres.push(genre);
          }
        });
      }
    });
    musicGenres.sort();

    setFilterOptions({
      locations: locations.length > 0 ? locations : fallbackLocations,
      venueTypes,
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
      results = results.filter(venue => venue.city === filters.location);
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
    <div className="min-h-screen bg-brand-cream">
      {/* Header */}
      <div className="bg-white border-b border-brand-burgundy/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col space-y-4">
            {/* Page Title */}
            <div>
              <h1 className="text-2xl font-semibold text-brand-burgundy">
                Venues
              </h1>
              <p className="text-brand-burgundy/70 mt-1">
                Find the perfect venue for your next experience
              </p>
            </div>
            
            {/* Search and Filter Bar */}
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-brand-burgundy/60" />
                  <Input
                    type="text"
                    placeholder="Search venues..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12 bg-brand-cream/50 border-brand-burgundy/30 focus:border-brand-gold focus:ring-brand-gold text-brand-burgundy rounded-lg"
                  />
                </div>
              </div>
              
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <Select value={filters.location} onValueChange={(value) => handleFilterChange('location', value)}>
                  <SelectTrigger className="w-auto min-w-[120px] h-12 bg-brand-cream/50 border-brand-burgundy/30 text-brand-burgundy rounded-lg">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {filterOptions.locations.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.venueType} onValueChange={(value) => handleFilterChange('venueType', value)}>
                  <SelectTrigger className="w-auto min-w-[120px] h-12 bg-brand-cream/50 border-brand-burgundy/30 text-brand-burgundy rounded-lg">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {filterOptions.venueTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.rating} onValueChange={(value) => handleFilterChange('rating', value)}>
                  <SelectTrigger className="w-auto min-w-[120px] h-12 bg-brand-cream/50 border-brand-burgundy/30 text-brand-burgundy rounded-lg">
                    <SelectValue placeholder="Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any rating</SelectItem>
                    {ratings.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {filters.venueType === 'Restaurant' && (
                  <Select value={filters.cuisineType} onValueChange={(value) => handleFilterChange('cuisineType', value)}>
                    <SelectTrigger className="w-auto min-w-[120px] h-12 bg-brand-cream/50 border-brand-burgundy/30 text-brand-burgundy rounded-lg">
                      <SelectValue placeholder="Cuisine" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All cuisine</SelectItem>
                      {filterOptions.cuisineTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {(filters.venueType === 'Club' || filters.venueType === 'Lounge') && (
                  <Select value={filters.musicGenre} onValueChange={(value) => handleFilterChange('musicGenre', value)}>
                    <SelectTrigger className="w-auto min-w-[120px] h-12 bg-brand-cream/50 border-brand-burgundy/30 text-brand-burgundy rounded-lg">
                      <SelectValue placeholder="Music" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All music</SelectItem>
                      {filterOptions.musicGenres.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {(searchTerm || Object.values(filters).some(f => f !== 'all')) && (
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="h-12 px-4 border-brand-gold text-brand-gold hover:bg-brand-gold/10 rounded-lg"
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredVenues.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVenues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-brand-burgundy/10 rounded-full flex items-center justify-center">
              <Users className="h-12 w-12 text-brand-burgundy/30" />
            </div>
            <h3 className="text-xl font-medium text-brand-burgundy mb-2">No venues found</h3>
            <p className="text-brand-burgundy/70 mb-6 max-w-md mx-auto">
              We couldn't find any venues that match your search criteria. Try adjusting your filters.
            </p>
            <Button
              onClick={resetFilters}
              className="bg-brand-burgundy text-brand-cream hover:bg-brand-burgundy/90 rounded-lg"
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VenuesPage;