import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Gift, PlusCircle, Trash2, Copy } from 'lucide-react';

const AdminReferralsPage = () => {
  const { toast } = useToast();
  const [referralCodes, setReferralCodes] = useState([]);
  const [newCode, setNewCode] = useState({ code: '', discount: '', perks: '' });

  useEffect(() => {
    const storedCodes = JSON.parse(localStorage.getItem('nightvibe_referral_codes') || '[]');
    // Add a default one if none exist for demo
    if (storedCodes.length === 0) {
      const defaultCode = { id: Date.now(), code: 'VIP2025', discount: '10%', perks: '10% off total booking, Free Welcome Drink' };
      setReferralCodes([defaultCode]);
      localStorage.setItem('nightvibe_referral_codes', JSON.stringify([defaultCode]));
    } else {
      setReferralCodes(storedCodes);
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCode(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCode = () => {
    if (!newCode.code || !newCode.discount) {
      toast({ title: "Missing Information", description: "Code and Discount are required.", variant: "destructive" });
      return;
    }
    const newReferral = { id: Date.now(), ...newCode };
    const updatedCodes = [...referralCodes, newReferral];
    setReferralCodes(updatedCodes);
    localStorage.setItem('nightvibe_referral_codes', JSON.stringify(updatedCodes));
    setNewCode({ code: '', discount: '', perks: '' });
    toast({ title: "Referral Code Added", description: `Code ${newCode.code} created successfully.` });
  };

  const handleDeleteCode = (id) => {
    const updatedCodes = referralCodes.filter(code => code.id !== id);
    setReferralCodes(updatedCodes);
    localStorage.setItem('nightvibe_referral_codes', JSON.stringify(updatedCodes));
    toast({ title: "Referral Code Deleted", description: "Code removed successfully." });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: `${text} copied to clipboard.` });
    }).catch(err => {
      toast({ title: "Copy Failed", description: "Could not copy text.", variant: "destructive" });
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <h1 className="text-3xl font-bold">Referral Codes & VIP Perks</h1>

      <Card className="bg-secondary/30 border-border/50 glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center"><PlusCircle className="mr-2 h-5 w-5" /> Create New Referral Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="code">Referral Code</Label>
            <Input id="code" name="code" value={newCode.code} onChange={handleInputChange} placeholder="e.g., SUMMERVIBES20" />
          </div>
          <div>
            <Label htmlFor="discount">Discount / Value</Label>
            <Input id="discount" name="discount" value={newCode.discount} onChange={handleInputChange} placeholder="e.g., 15% off or $20 credit" />
          </div>
          <div>
            <Label htmlFor="perks">VIP Perks (comma-separated)</Label>
            <Input id="perks" name="perks" value={newCode.perks} onChange={handleInputChange} placeholder="e.g., Free Drink, Queue Jump" />
          </div>
          <Button onClick={handleAddCode} className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-accent-foreground">
            Add Code
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-secondary/30 border-border/50 glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center"><Gift className="mr-2 h-5 w-5" /> Existing Referral Codes</CardTitle>
        </CardHeader>
        <CardContent>
          {referralCodes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No referral codes created yet.</p>
          ) : (
            <ul className="space-y-3">
              {referralCodes.map(rc => (
                <li key={rc.id} className="p-4 bg-background/50 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <div className="flex items-center">
                      <strong className="text-lg text-primary">{rc.code}</strong>
                      <Button variant="ghost" size="icon" className="ml-2 h-7 w-7" onClick={() => copyToClipboard(rc.code)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">Discount: {rc.discount}</p>
                    {rc.perks && <p className="text-sm text-muted-foreground">Perks: {rc.perks}</p>}
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteCode(rc.id)}>
                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminReferralsPage;