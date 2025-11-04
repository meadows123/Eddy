# VIP Club Database Schema

This directory contains the database schema and migrations for the VIP Club application.

## Development Setup

1. Create a new Supabase project at https://supabase.com
2. Go to the SQL Editor in your Supabase dashboard
3. Copy the contents of `migrations/20240320000000_initial_schema.sql`
4. Paste and run the SQL in the Supabase SQL Editor

## Schema Overview

The database includes the following tables:

- `venues`: Stores venue information including location, type, and pricing
- `venue_images`: Stores images associated with venues
- `venue_tables`: Manages tables within venues
- `bookings`: Handles venue bookings
- `venue_reviews`: Stores user reviews for venues
- `venue_amenities`: Lists amenities available at venues

## Security

The schema includes Row Level Security (RLS) policies to ensure:
- Public read access to venues and reviews
- Venue owners can only edit their own venues
- Users can only create bookings for themselves
- Venue owners can view all bookings for their venues

## Sample Data

The initial migration includes sample data for three venues in Lagos, Nigeria.

## Development Guidelines

1. Always test schema changes in development first
2. Use migrations for all database changes
3. Keep the sample data updated with realistic values
4. Test RLS policies thoroughly

## Next Steps

1. Set up environment variables in your React application
2. Create API endpoints for venue management
3. Implement real-time subscriptions for live updates
4. Add more sample data as needed

## Environment Variables

Add these to your `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
``` 