import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { deductCredits } from '../lib/creditService';

/**
 * Receipt Management System for Eddys Members
 * Handles order management and credit deduction
 */
const ReceiptManagement = ({ memberId, venueId, onReceiptComplete }) => {
  const [orderItems, setOrderItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', price: 0, quantity: 1 });
  const [subtotal, setSubtotal] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [total, setTotal] = useState(0);
  const [memberCredits, setMemberCredits] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    calculateTotals();
  }, [orderItems]);

  useEffect(() => {
    fetchMemberCredits();
  }, [memberId, venueId]);

  const fetchMemberCredits = async () => {
    try {
      const { data: credits, error } = await supabase
        .from('venue_credits')
        .select('amount, used_amount')
        .eq('user_id', memberId)
        .eq('venue_id', venueId)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching member credits:', error);
        return;
      }

      const totalCredits = credits.reduce((sum, credit) => sum + (credit.amount || 0), 0);
      const usedCredits = credits.reduce((sum, credit) => sum + (credit.used_amount || 0), 0);
      const availableBalance = totalCredits - usedCredits;
      
      setMemberCredits(availableBalance);
    } catch (error) {
      console.error('Error fetching member credits:', error);
    }
  };

  const calculateTotals = () => {
    const subtotalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const serviceChargeAmount = subtotalAmount * 0.1; // 10% service charge
    const totalAmount = subtotalAmount + serviceChargeAmount;

    setSubtotal(subtotalAmount);
    setServiceCharge(serviceChargeAmount);
    setTotal(totalAmount);
  };

  const addOrderItem = () => {
    if (!newItem.name || newItem.price <= 0) {
      alert('Please enter valid item name and price');
      return;
    }

    const item = {
      id: Date.now(),
      name: newItem.name,
      price: parseFloat(newItem.price),
      quantity: parseInt(newItem.quantity)
    };

    setOrderItems([...orderItems, item]);
    setNewItem({ name: '', price: 0, quantity: 1 });
  };

  const removeOrderItem = (id) => {
    setOrderItems(orderItems.filter(item => item.id !== id));
  };

  const updateItemQuantity = (id, quantity) => {
    if (quantity <= 0) {
      removeOrderItem(id);
      return;
    }

    setOrderItems(orderItems.map(item => 
      item.id === id ? { ...item, quantity: parseInt(quantity) } : item
    ));
  };

  const processPayment = async () => {
    if (total <= 0) {
      alert('Please add items to the order');
      return;
    }

    if (memberCredits < total) {
      alert(`Insufficient credits. Available: ₦${memberCredits.toLocaleString()}, Required: ₦${total.toLocaleString()}`);
      return;
    }

    setIsProcessing(true);

    try {
      // Deduct credits
      const result = await deductCredits(memberId, venueId, total, `receipt-${Date.now()}`);
      
      if (result.success) {
        // Create receipt record
        const { data: receipt, error: receiptError } = await supabase
          .from('receipts')
          .insert({
            member_id: memberId,
            venue_id: venueId,
            items: orderItems,
            subtotal: subtotal,
            service_charge: serviceCharge,
            total: total,
            credits_used: total,
            remaining_credits: result.remainingBalance,
            status: 'completed',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (receiptError) {
          throw new Error(`Failed to create receipt: ${receiptError.message}`);
        }

        // Reset form
        setOrderItems([]);
        setSubtotal(0);
        setServiceCharge(0);
        setTotal(0);
        setMemberCredits(result.remainingBalance);

        // Notify parent component
        if (onReceiptComplete) {
          onReceiptComplete(receipt);
        }

        alert(`Payment successful! Receipt #${receipt.id} created. Remaining credits: ₦${result.remainingBalance.toLocaleString()}`);
      } else {
        throw new Error('Failed to process payment');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert(`Payment failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="receipt-management">
      <div className="receipt-header">
        <h3>🍽️ Receipt Management</h3>
        <div className="credit-balance">
          <strong>Available Credits: ₦{memberCredits.toLocaleString()}</strong>
        </div>
      </div>

      <div className="add-item-section">
        <h4>Add Item to Order</h4>
        <div className="add-item-form">
          <input
            type="text"
            placeholder="Item name"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          />
          <input
            type="number"
            placeholder="Price"
            value={newItem.price}
            onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
            min="0"
            step="0.01"
          />
          <input
            type="number"
            placeholder="Quantity"
            value={newItem.quantity}
            onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
            min="1"
          />
          <button onClick={addOrderItem} className="add-item-btn">
            Add Item
          </button>
        </div>
      </div>

      <div className="order-items">
        <h4>Order Items</h4>
        {orderItems.length === 0 ? (
          <p className="no-items">No items added yet</p>
        ) : (
          <div className="items-list">
            {orderItems.map(item => (
              <div key={item.id} className="order-item">
                <div className="item-details">
                  <span className="item-name">{item.name}</span>
                  <span className="item-price">₦{item.price.toLocaleString()}</span>
                </div>
                <div className="item-controls">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                    min="0"
                    className="quantity-input"
                  />
                  <span className="item-total">₦{(item.price * item.quantity).toLocaleString()}</span>
                  <button 
                    onClick={() => removeOrderItem(item.id)}
                    className="remove-btn"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="receipt-totals">
        <div className="total-line">
          <span>Subtotal:</span>
          <span>₦{subtotal.toLocaleString()}</span>
        </div>
        <div className="total-line">
          <span>Service Charge (10%):</span>
          <span>₦{serviceCharge.toLocaleString()}</span>
        </div>
        <div className="total-line total">
          <span>Total:</span>
          <span>₦{total.toLocaleString()}</span>
        </div>
      </div>

      <div className="payment-section">
        <button 
          onClick={processPayment}
          disabled={isProcessing || total <= 0 || memberCredits < total}
          className="process-payment-btn"
        >
          {isProcessing ? 'Processing...' : `Process Payment (₦${total.toLocaleString()})`}
        </button>
      </div>

      <style jsx>{`
        .receipt-management {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }

        .receipt-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #800020;
        }

        .receipt-header h3 {
          color: #800020;
          margin: 0;
        }

        .credit-balance {
          background: #f0f8ff;
          padding: 8px 16px;
          border-radius: 20px;
          color: #800020;
          font-weight: bold;
        }

        .add-item-section {
          margin-bottom: 20px;
        }

        .add-item-section h4 {
          color: #800020;
          margin-bottom: 10px;
        }

        .add-item-form {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr auto;
          gap: 10px;
          align-items: center;
        }

        .add-item-form input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 14px;
        }

        .add-item-btn {
          background: #800020;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
        }

        .add-item-btn:hover {
          background: #A71D2A;
        }

        .order-items h4 {
          color: #800020;
          margin-bottom: 10px;
        }

        .no-items {
          text-align: center;
          color: #666;
          font-style: italic;
          padding: 20px;
        }

        .items-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .order-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border: 1px solid #eee;
          border-radius: 5px;
          margin-bottom: 10px;
        }

        .item-details {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .item-name {
          font-weight: bold;
          color: #333;
        }

        .item-price {
          color: #666;
          font-size: 14px;
        }

        .item-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .quantity-input {
          width: 60px;
          padding: 4px 8px;
          border: 1px solid #ddd;
          border-radius: 3px;
          text-align: center;
        }

        .item-total {
          font-weight: bold;
          color: #800020;
          min-width: 80px;
          text-align: right;
        }

        .remove-btn {
          background: #ff4444;
          color: white;
          border: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .receipt-totals {
          margin: 20px 0;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 5px;
        }

        .total-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }

        .total-line.total {
          font-weight: bold;
          font-size: 18px;
          color: #800020;
          border-top: 2px solid #800020;
          padding-top: 10px;
          margin-top: 10px;
        }

        .payment-section {
          text-align: center;
        }

        .process-payment-btn {
          background: linear-gradient(135deg, #800020 0%, #A71D2A 100%);
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 25px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(128, 0, 32, 0.3);
          transition: transform 0.2s;
        }

        .process-payment-btn:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .process-payment-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
    </div>
  );
};

export default ReceiptManagement;
