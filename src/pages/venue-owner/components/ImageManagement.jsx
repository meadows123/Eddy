import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Upload, Star, StarOff, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const ImageManagement = ({ currentUser }) => {
  const [venue, setVenue] = useState(null);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [addingUrl, setAddingUrl] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.id) {
      fetchVenueAndImages();
    } else if (currentUser === null) {
      setLoading(false);
    } else if (currentUser === undefined) {
      // Still loading user data
      setLoading(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const fetchVenueAndImages = async () => {
    try {
      setLoading(true);
      
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('*')
        .eq('owner_id', currentUser.id)
        .single();

      if (venueError) {
        console.error('Error fetching venue:', venueError);
        
        let errorMessage = 'Failed to load venue data';
        if (venueError.code === 'PGRST116') {
          errorMessage = 'No venue found for your account. Please contact support to set up your venue.';
        } else if (venueError.message) {
          errorMessage = venueError.message;
        }
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
        return;
      }

      setVenue(venueData);

      const { data: imagesData, error: imagesError } = await supabase
        .from('venue_images')
        .select('*')
        .eq('venue_id', venueData.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (imagesError) {
        console.error('Error fetching images:', imagesError);
        toast({
          title: 'Error',
          description: 'Failed to load venue images',
          variant: 'destructive'
        });
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

  const addImageFromUrl = async () => {
    try {
      setAddingUrl(true);

      if (!imageUrl.trim()) {
        throw new Error('Please enter an image URL');
      }

      // Basic URL validation
      try {
        new URL(imageUrl);
      } catch {
        throw new Error('Please enter a valid URL');
      }

      // Test if the URL is accessible (basic check)
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Save to database
      const { data: imageData, error: dbError } = await supabase
        .from('venue_images')
        .insert([{
          venue_id: venue.id,
          image_url: imageUrl,
          is_primary: images.length === 0
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      setImages(prev => [imageData, ...prev]);
      setImageUrl('');
      
      toast({
        title: 'Success',
        description: 'Image added successfully!',
        className: 'bg-green-500 text-white'
      });

    } catch (error) {
      console.error('Error adding image from URL:', error);
      
      let errorMessage = 'Failed to add image from URL';
      if (error.message.includes('valid URL')) {
        errorMessage = 'Please enter a valid image URL';
      } else if (error.message.includes('load')) {
        errorMessage = 'Could not load image from this URL. Please check the URL and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Failed to Add Image',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setAddingUrl(false);
    }
  };

  const uploadFile = async (file) => {
    if (!venue || !file) return;

    try {
      setUploading(true);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be less than 5MB');
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${venue.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload using direct fetch to Supabase Storage REST API
      // This bypasses the client library's FormData handling
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const arrayBuffer = await file.arrayBuffer();
      
      // Get Supabase project URL and anon key
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://agydpkzfucicraedllgl.supabase.co';
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Upload directly to Storage REST API
      // Note: Supabase Storage API expects the path to be URL-encoded
      const encodedPath = encodeURIComponent(fileName);
      const uploadUrl = `${supabaseUrl}/storage/v1/object/venue-images/${encodedPath}`;
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': file.type,
          'x-upsert': 'false',
          'apikey': supabaseKey
        },
        body: arrayBuffer
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      // The upload response should contain the path
      await uploadResponse.json();
      
      // Get public URL using Supabase client
      const { data: { publicUrl } } = supabase.storage
        .from('venue-images')
        .getPublicUrl(fileName);

      // Save to database
      const { data: imageData, error: dbError } = await supabase
        .from('venue_images')
        .insert([{
          venue_id: venue.id,
          image_url: publicUrl,
          is_primary: images.length === 0
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      setImages(prev => [imageData, ...prev]);
      
      // Refresh the images list to ensure the new image is displayed
      await fetchVenueAndImages();
      
      toast({
        title: 'Success',
        description: 'Image uploaded successfully!',
        className: 'bg-green-500 text-white'
      });

    } catch (error) {
      console.error('Error uploading image:', error);
      
      let errorMessage = 'Failed to upload image. Please try again.';
      
      if (error.message?.includes('bucket') || error.message?.includes('Bucket')) {
        errorMessage = 'Storage bucket not configured. Please contact support or use URL upload instead.';
      } else if (error.message?.includes('policy') || error.message?.includes('permission')) {
        errorMessage = 'Permission denied. Storage bucket needs proper policies configured.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageId, imageUrl) => {
    try {
      // Extract filename from URL for storage deletion
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${venue.id}/${fileName}`;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('venue-images')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('venue_images')
        .delete()
        .eq('id', imageId);

      if (dbError) throw dbError;

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
      const { error: resetError } = await supabase
        .from('venue_images')
        .update({ is_primary: false })
        .eq('venue_id', venue.id);

      if (resetError) throw resetError;

      const { error: setPrimaryError } = await supabase
        .from('venue_images')
        .update({ is_primary: true })
        .eq('id', imageId);

      if (setPrimaryError) throw setPrimaryError;

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

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
        <p className="text-brand-burgundy/70 text-sm">
          {!currentUser ? 'Loading user data...' : 'Loading venue images...'}
        </p>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="text-center p-8">
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-brand-burgundy/10 rounded-full flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-brand-burgundy/40" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-brand-burgundy mb-2">No Venue Found</h3>
            <p className="text-brand-burgundy/70 mb-4">
              No venue has been created for your account yet.
            </p>
            <p className="text-sm text-brand-burgundy/50">
              Please contact support if you believe this is an error.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-heading text-brand-burgundy">Venue Images</h2>
          <p className="text-brand-burgundy/70">Upload and manage photos of your venue</p>
        </div>
        <div className="text-sm text-brand-burgundy/60">
          {images.length} image{images.length !== 1 ? 's' : ''} uploaded
        </div>
      </div>

      {/* Upload Area */}
      <Card className={`border-2 border-dashed transition-colors ${
        dragActive 
          ? 'border-brand-gold bg-brand-gold/10' 
          : 'border-brand-burgundy/20 hover:border-brand-gold/50'
      }`}>
        <CardContent className="p-8">
          <div
            className="text-center"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-brand-burgundy/40" />
            <h3 className="text-lg font-semibold text-brand-burgundy mb-2">
              Upload Venue Images
            </h3>
            <p className="text-brand-burgundy/70 mb-4">
              Drag and drop images here, or click to select files from your device
            </p>
            <p className="text-sm text-brand-burgundy/50 mb-4">
              Supports JPG, PNG, WebP • Max 5MB per image
            </p>
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
              id="image-upload"
              disabled={uploading}
            />
            <Label htmlFor="image-upload">
              <Button 
                variant="outline" 
                className="border-brand-gold text-brand-gold hover:bg-brand-gold/10"
                disabled={uploading}
                asChild
              >
                <span>
                  {uploading ? 'Uploading...' : 'Choose Images'}
                </span>
              </Button>
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* URL Upload Alternative */}
      <Card className="border border-brand-burgundy/20">
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-brand-burgundy mb-2">
              Add Image from URL
            </h3>
            <p className="text-brand-burgundy/70 mb-4">
              Alternative: Add an image by providing a direct image URL
            </p>
            <div className="flex gap-2 max-w-md mx-auto">
              <Input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1"
                disabled={addingUrl}
              />
              <Button
                onClick={addImageFromUrl}
                disabled={addingUrl || !imageUrl.trim()}
                className="bg-brand-burgundy text-white hover:bg-brand-burgundy/90"
              >
                {addingUrl ? 'Adding...' : 'Add Image'}
              </Button>
            </div>
            <p className="text-xs text-brand-burgundy/50 mt-2">
              Use this option if file upload isn't working
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image) => {
            const ImageCard = ({ image }) => {
              const [hasError, setHasError] = useState(false);
              const [hasLoaded, setHasLoaded] = useState(false);
              
              return (
                <Card key={image.id} className="overflow-hidden">
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={image.image_url}
                      alt="Venue"
                      className="w-full h-full object-cover"
                      onLoad={() => {
                        setHasLoaded(true);
                        setHasError(false);
                      }}
                      onError={() => {
                        setHasError(true);
                        setHasLoaded(false);
                      }}
                    />
                    {hasError && (
                      <div className="absolute inset-0 bg-gray-200 flex items-center justify-center text-gray-500 error-message">
                        <div className="text-center">
                          <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">Image failed to load</p>
                          <p className="text-xs text-gray-400 mt-1 break-all">{image.image_url}</p>
                        </div>
                      </div>
                    )}
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
                          onClick={() => deleteImage(image.id, image.image_url)}
                        >
                          Delete
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
                </Card>
              );
            };
            
            return <ImageCard key={image.id} image={image} />;
          })}
        </div>
      )}

      {images.length === 0 && (
        <Card className="text-center p-8">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 text-brand-burgundy/30" />
          <h3 className="text-lg font-semibold text-brand-burgundy mb-2">
            No Images Yet
          </h3>
          <p className="text-brand-burgundy/70">
            Upload your first venue image using the area above
          </p>
        </Card>
      )}
    </div>
  );
};

export default ImageManagement; 