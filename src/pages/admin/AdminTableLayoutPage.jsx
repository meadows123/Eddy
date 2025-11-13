import React from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const AdminTableLayoutPage = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center"><LayoutGrid className="mr-3 h-8 w-8 text-primary" />Table Layout Editor</h1>
        <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-accent-foreground">
          Create New Layout
        </Button>
      </div>

      <Card className="bg-secondary/30 border-border/50 glass-effect">
        <CardHeader>
          <CardTitle>Venue Table Management</CardTitle>
          <CardDescription>
            Design and manage your venue's table layouts. Drag and drop tables, set zones, and define pricing for different areas.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Drag & Drop Editor Coming Soon!</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            This section will feature an interactive drag-and-drop interface for creating and customizing table maps, setting price zones, and managing VIP areas.
          </p>
          <img  alt="Mockup of a table layout editor interface" className="mt-6 rounded-lg shadow-md border border-border/50 max-w-lg mx-auto" src="https://images.unsplash.com/photo-1698889670819-c3fe0d276d95" />
        </CardContent>
      </Card>

      <Card className="bg-secondary/30 border-border/50 glass-effect">
        <CardHeader>
          <CardTitle>Existing Layouts</CardTitle>
          <CardDescription>View and manage your saved table layouts.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-6">No layouts created yet. Click "Create New Layout" to get started.</p>
          {/* Placeholder for list of layouts */}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminTableLayoutPage;