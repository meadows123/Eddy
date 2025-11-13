// Basic venue data with essential fields
export const allVenuesData = [
  {
    id: 1,
    name: 'Club DNA',
    description: 'An upscale nightclub in Victoria Island, known for its vibrant atmosphere and energetic music.',
    rating: 4.7,
    location: 'Victoria Island',
    venueType: 'Club',
    images: ['club dna lagos interior', 'club dna lagos vip area'],
    isFeatured: true,
    tickets: [
      {
        id: 1,
        name: 'Regular Entry',
        description: 'Standard entry ticket',
        price: 5000,
        features: ['General admission', 'Access to main floor'],
        entryTime: '10:00 PM',
        maxGuests: 1
      },
      {
        id: 2,
        name: 'VIP Entry',
        description: 'VIP access with exclusive benefits',
        price: 15000,
        features: ['VIP access', 'Priority entry', 'Access to VIP area'],
        entryTime: '10:00 PM',
        maxGuests: 1
      }
    ],
    tables: [
      { id: 1, name: 'Silver VIP', capacity: '4-6', price: 150000 },
      { id: 2, name: 'Gold VIP', capacity: '6-8', price: 300000 },
      { id: 3, name: 'Platinum VIP', capacity: '8-12', price: 500000 }
    ]
  },
  {
    id: 2,
    name: 'RSVP Lagos',
    description: 'A chic restaurant and lounge offering a sophisticated dining experience.',
    rating: 4.8,
    location: 'Victoria Island',
    venueType: 'Restaurant',
    images: ['rsvp lagos restaurant interior', 'rsvp lagos poolside lounge'],
    isFeatured: true,
    tickets: [
      {
        id: 1,
        name: 'Dinner Table',
        description: 'Dinner table reservation',
        price: 0,
        features: [],
        entryTime: '5:00 PM',
        maxGuests: 2
      },
      {
        id: 2,
        name: 'Lounge Seating',
        description: 'Lounge seating reservation',
        price: 50000,
        features: [],
        entryTime: '5:00 PM',
        maxGuests: 4
      }
    ],
    tables: [
      { id: 1, name: 'Dinner Table', capacity: '2-4', price: 0 },
      { id: 2, name: 'Lounge Seating', capacity: '4-6', price: 50000 }
    ]
  },
  {
    id: 3,
    name: 'Club Quilox',
    description: 'One of Lagos\'s most famous and luxurious nightclubs.',
    rating: 4.6,
    location: 'Victoria Island',
    venueType: 'Club',
    images: ['club quilox interior luxury', 'club quilox vip booth'],
    isFeatured: true,
    tickets: [
      {
        id: 1,
        name: 'Silver Package',
        description: 'Silver package ticket',
        price: 300000,
        features: ['Access to main floor', 'Access to VIP area'],
        entryTime: '10:00 PM',
        maxGuests: 6
      },
      {
        id: 2,
        name: 'Gold Package',
        description: 'Gold package ticket',
        price: 750000,
        features: ['Access to main floor', 'Access to VIP area'],
        entryTime: '10:00 PM',
        maxGuests: 8
      },
      {
        id: 3,
        name: 'Diamond Package',
        description: 'Diamond package ticket',
        price: 1500000,
        features: ['Access to main floor', 'Access to VIP area'],
        entryTime: '10:00 PM',
        maxGuests: 10
      }
    ],
    tables: [
      { id: 1, name: 'Silver Package', capacity: '6-8', price: 300000 },
      { id: 2, name: 'Gold Package', capacity: '8-10', price: 750000 },
      { id: 3, name: 'Diamond Package', capacity: '10-15', price: 1500000 }
    ]
  }
];

// Export both old and new names for backward compatibility
export const allClubsData = allVenuesData;

export const getVenueById = (id) => {
  return allVenuesData.find(venue => venue.id === parseInt(id));
};

// Export the old name for backward compatibility
export const getClubById = getVenueById;

export const getFeaturedVenues = () => {
  return allVenuesData.filter(venue => venue.isFeatured === true);
};

export const getLagosLocations = () => {
  return ['all', ...new Set(allVenuesData.map(venue => venue.location))].sort();
};

// Export the old name for backward compatibility
export const getUkCities = getLagosLocations;

export const getVenueTypes = () => {
  return ['all', 'Restaurant', 'Club', 'Lounge'];
};

export const getMusicGenres = () => {
  return ['all', 'Afrobeats', 'Hip Hop', 'R&B', 'House', 'Amapiano', 'Reggae', 'Pop'];
};

export const getDressCodes = () => {
  return ['all', 'Smart Casual', 'Formal', 'Black Tie', 'Cocktail Attire', 'Business Casual'];
};

export const getPriceRanges = () => {
  return ['all', 'Budget', 'Moderate', 'Premium', 'Luxury'];
};

export const getCuisineTypes = () => {
  return [
    'Nigerian',
    'International',
    'Fusion',
    'Mediterranean',
    'Asian',
    'European',
    'African',
    'American'
  ];
};

export const getVenueRatings = () => {
  return [
    { value: '4.5', label: '4.5+ Stars' },
    { value: '4.0', label: '4.0+ Stars' },
    { value: '3.5', label: '3.5+ Stars' },
    { value: '3.0', label: '3.0+ Stars' }
  ];
};

export const getMusicGenresList = () => {
  return [
    'Afrobeats',
    'Hip Hop',
    'R&B',
    'House',
    'Amapiano',
    'Reggae',
    'Pop',
    'Jazz',
    'Live Band',
    'DJ Sets'
  ];
};
