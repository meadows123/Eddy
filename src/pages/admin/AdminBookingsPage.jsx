import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Download } from 'lucide-react';

const AdminBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBookings, setFilteredBookings] = useState([]);

  useEffect(() => {
    const storedBookings = JSON.parse(localStorage.getItem('nightvibe_bookings') || '[]');
    setBookings(storedBookings);
    setFilteredBookings(storedBookings);
  }, []);

  useEffect(() => {
    const results = bookings.filter(booking =>
      booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.clubName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredBookings(results);
  }, [searchTerm, bookings]);

  const calculateBookingTotal = (booking) => {
    let total = (booking.ticket?.price || 0) + (booking.table?.price || 0) + 25; // 25 service fee
    if (booking.vipPerksApplied?.includes("10% Discount Applied")) {
      total *= 0.9;
    }
    return total.toFixed(2);
  };

  const downloadCSV = () => {
    const headers = ["ID", "Customer Name", "Email", "Club Name", "Ticket", "Table", "Total", "Date", "Referral Code"];
    const csvRows = [headers.join(",")];

    filteredBookings.forEach(booking => {
      const row = [
        booking.id,
        `"${booking.customerName}"`,
        `"${booking.customerEmail}"`,
        `"${booking.clubName}"`,
        `"${booking.ticket ? booking.ticket.name : 'N/A'}"`,
        `"${booking.table ? booking.table.tableName : 'N/A'}"`,
        calculateBookingTotal(booking),
        new Date(booking.bookingDate).toISOString(),
        `"${booking.referralCode || 'N/A'}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "nightvibe_bookings.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">Bookings Management</h1>
        <Button onClick={downloadCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="bg-secondary/30 border-border/50 glass-effect">
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <div className="mt-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Input 
                type="text" 
                placeholder="Search by name, club, or email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <Button variant="outline" className="flex-shrink-0">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Club</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <div className="font-medium">{booking.customerName}</div>
                    <div className="text-xs text-muted-foreground">{booking.customerEmail}</div>
                  </TableCell>
                  <TableCell>{booking.clubName}</TableCell>
                  <TableCell>
                    {booking.ticket && <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full mr-1">{booking.ticket.name}</span>}
                    {booking.table && <span className="text-xs bg-accent/20 text-accent-foreground px-2 py-1 rounded-full">{booking.table.tableName}</span>}
                  </TableCell>
                  <TableCell className="text-right">${calculateBookingTotal(booking)}</TableCell>
                  <TableCell>{new Date(booking.bookingDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {booking.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {filteredBookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No bookings found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminBookingsPage;