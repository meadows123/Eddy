import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { toast } from '../../../components/ui/use-toast';
import { Star, StarOff, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';

const ImageManagement = ({ currentUser }) => {
  const [venue, setVenue] = useState(null);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchVenueAndImages();
    }
  }, [currentUser]);

  const fetchVenueAndImages = async () => {
    try {
      setLoading(true);
      
      // Get venue for current user
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', currentUser.id)
        .single();

      if (venueError) {
        console.error('Error fetching venue:', venueError);
        return;
      }

      setVenue(venueData);

      // Get images for this venue
      const { data: imagesData, error: imagesError } = await supabase
        .from('venue_images')
        .select('*')
        .eq('venue_id', venueData.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (imagesError) {
        console.error('Error fetching images:', imagesError);
        return;
      }

      setImages(imagesData || []);
    } catch (error) {
      console.error('Error in fetchVenueAndImages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load venue images',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadImageByUrl = async (imageUrl) => {
    if (!venue || !imageUrl) return;

    try {
      setUploading(true);

      // Save URL directly to database (no file upload needed)
      const { data: imageData, error: dbError } = await supabase
        .from('venue_images')
        .insert([{
          venue_id: venue.id,
          image_url: imageUrl,
          is_primary: images.length === 0 // First image is primary
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      // Update local state
      setImages(prev => [imageData, ...prev]);
      
      toast({
        title: 'Success',
        description: 'Image added successfully!',
        className: 'bg-green-500 text-white'
      });

    } catch (error) {
      console.error('Error adding image:', error);
      toast({
        title: 'Error',
        description: 'Failed to add image. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageId) => {
    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('venue_images')
        .delete()
        .eq('id', imageId);

      if (dbError) throw dbError;

      // Update local state
      setImages(prev => prev.filter(img => img.id !== imageId));
      
      toast({
        title: 'Success',
        description: 'Image deleted successfully!',
        className: 'bg-green-500 text-white'
      });

    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete image. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const setPrimaryImage = async (imageId) => {
    try {
      // First, set all images to not primary
      const { error: resetError } = await supabase
        .from('venue_images')
        .update({ is_primary: false })
        .eq('venue_id', venue.id);

      if (resetError) throw resetError;

      // Then set the selected image as primary
      const { error: setPrimaryError } = await supabase
        .from('venue_images')
        .update({ is_primary: true })
        .eq('id', imageId);

      if (setPrimaryError) throw setPrimaryError;

      // Update local state
      setImages(prev => 
        prev.map(img => ({
          ...img,
          is_primary: img.id === imageId
        }))
      );

      toast({
        title: 'Success',
        description: 'Primary image updated!',
        className: 'bg-green-500 text-white'
      });

    } catch (error) {
      console.error('Error setting primary image:', error);
      toast({
        title: 'Error',
        description: 'Failed to update primary image. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleAddImageUrl = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const imageUrl = formData.get('imageUrl');
    if (imageUrl) {
      uploadImageByUrl(imageUrl);
      e.target.reset();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="text-center p-8">
        <p className="text-brand-burgundy/70">No venue found for your account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-heading text-brand-burgundy">Venue Images</h2>
          <p className="text-brand-burgundy/70">Add and manage photos of your venue</p>
        </div>
        <div className="text-sm text-brand-burgundy/60">
          {images.length} image{images.length !== 1 ? 's' : ''} uploaded
        </div>
      </div>

      {/* Add Image URL Form */}
      <Card className="border-brand-burgundy/20">
        <CardContent className="p-6">
          <form onSubmit={handleAddImageUrl} className="space-y-4">
            <div>
              <Label htmlFor="imageUrl" className="text-brand-burgundy font-medium">
                Add Image URL
              </Label>
              <p className="text-sm text-brand-burgundy/60 mb-2">
                Paste a URL from Unsplash, your website, or any image hosting service
              </p>
              <div className="flex gap-2">
                <Input
                  id="imageUrl"
                  name="imageUrl"
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  className="flex-1"
                  required
                />
                <Button 
                  type="submit" 
                  disabled={uploading}
                  className="bg-brand-gold text-brand-burgundy hover:bg-brand-gold/90"
                >
                  {uploading ? 'Adding...' : 'Add Image'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image) => (
            <Card key={image.id} className="overflow-hidden">
              <div className="relative aspect-video">
                <img
                  src={image.image_url}
                  alt="Venue"
                  className="w-full h-full object-cover"
                />
                {image.is_primary && (
                  <div className="absolute top-2 left-2">
                    <span className="bg-brand-gold text-brand-burgundy px-2 py-1 rounded text-xs font-semibold">
                      Primary
                    </span>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                    onClick={() => setPrimaryImage(image.id)}
                    disabled={image.is_primary}
                  >
                    {image.is_primary ? (
                      <Star className="h-4 w-4 text-brand-gold fill-current" />
                    ) : (
                      <StarOff className="h-4 w-4 text-brand-burgundy/60" />
                    )}
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 w-8 p-0 bg-red-500/80 hover:bg-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Image</DialogTitle>
                      </DialogHeader>
                      <p className="text-brand-burgundy/70 mb-4">
                        Are you sure you want to delete this image? This action cannot be undone.
                      </p>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline">Cancel</Button>
                        <Button 
                          variant="destructive"
                          onClick={() => deleteImage(image.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <Card className="text-center p-8">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 text-brand-burgundy/30" />
          <h3 className="text-lg font-semibold text-brand-burgundy mb-2">
            No Images Yet
          </h3>
          <p className="text-brand-burgundy/70">
            Add your first venue image using the form above
          </p>
        </Card>
      )}
    </div>
  );
};

export default ImageManagement; 