// Email templates for Eddys Members booking confirmations

export const bookingConfirmationTemplate = (bookingData) => {
  return `
<div
  style="
    font-family: system-ui, sans-serif, Arial;
    font-size: 14px;
    color: #333;
    padding: 14px 8px;
    background-color: #f5f5f5;
  "
>
  <style>
    @media only screen and (max-width: 600px) {
      .mobile-padding { padding: 8px !important; }
      .mobile-text { font-size: 12px !important; }
      .mobile-title { font-size: 14px !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
      .mobile-center { text-align: center !important; }
      .mobile-hide { display: none !important; }
      .mobile-full-width { width: 100% !important; }
    }
  </style>
  <div style="max-width: 600px; margin: auto; background-color: #fff">
    <div style="border-top: 6px solid #5B0202; padding: 16px;" class="mobile-padding">
      <a
        style="text-decoration: none; outline: none; margin-right: 8px; vertical-align: middle"
        href="https://vipclub.com"
        target="_blank"
      >
        <img
          style="height: 32px; vertical-align: middle"
          height="32px"
          src="cid:logo.png"
          alt="Eddys Members"
        />
      </a>
      <span
        style="
          font-size: 16px;
          vertical-align: middle;
          border-left: 1px solid #333;
          padding-left: 8px;
        "
        class="mobile-title"
      >
        <strong>Booking Confirmation</strong>
      </span>
    </div>
    <div style="padding: 0 16px;" class="mobile-padding">
      <p class="mobile-text">Thank you for your reservation! We're excited to welcome you to ${bookingData.venueName}.</p>
      <div
        style="
          text-align: left;
          font-size: 14px;
          padding-bottom: 4px;
          border-bottom: 2px solid #333;
          margin-bottom: 16px;
        "
        class="mobile-text"
      >
        <strong>Booking # ${bookingData.bookingId}</strong>
      </div>
      
      <!-- Booking Details - Mobile Responsive -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 24px;" class="mobile-stack">
        <tr style="vertical-align: top;" class="mobile-stack">
          <td style="padding: 12px 8px; width: 120px;" class="mobile-stack mobile-center">
            <img style="height: 80px; width: 120px; object-fit: cover; border-radius: 8px; max-width: 100%;" 
                 src="${bookingData.venueImage}" alt="${bookingData.venueName}" class="mobile-full-width" />
          </td>
          <td style="padding: 12px 8px; width: 100%;" class="mobile-stack">
            <div style="font-weight: bold; font-size: 16px; color: #5B0202;" class="mobile-title">${bookingData.venueName}</div>
            <div style="color: #888; padding-top: 4px;" class="mobile-text">${bookingData.venueAddress}</div>
            <div style="padding-top: 8px;" class="mobile-text">
              <div><strong>Date:</strong> ${bookingData.date}</div>
              <div><strong>Time:</strong> ${bookingData.time}</div>
              <div><strong>Guests:</strong> ${bookingData.guests}</div>
              ${bookingData.tableNumber ? `<div><strong>Table:</strong> ${bookingData.tableNumber}</div>` : ''}
            </div>
          </td>
        </tr>
      </table>

      <!-- Pricing Breakdown -->
      <div style="padding: 24px 0;">
        <div style="border-top: 2px solid #333"></div>
      </div>
      <table style="border-collapse: collapse; width: 100%; text-align: right;" class="mobile-text">
        <tr>
          <td style="width: 60%;"></td>
          <td style="padding: 4px 8px;">Booking Fee</td>
          <td style="padding: 4px 8px; white-space: nowrap">₦${bookingData.bookingFee}</td>
        </tr>
        ${bookingData.serviceCharge ? `
        <tr>
          <td style="width: 60%;"></td>
          <td style="padding: 4px 8px;">Service Charge</td>
          <td style="padding: 4px 8px; white-space: nowrap">₦${bookingData.serviceCharge}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="width: 60%;"></td>
          <td style="border-top: 2px solid #333; padding: 8px;">
            <strong style="white-space: nowrap">Total Amount</strong>
          </td>
          <td style="padding: 8px; border-top: 2px solid #333; white-space: nowrap">
            <strong>₦${bookingData.totalAmount}</strong>
          </td>
        </tr>
      </table>

      <!-- Important Information -->
      <div style="margin-top: 24px; padding: 16px; background-color: #f8f8f8; border-radius: 8px;" class="mobile-padding">
        <h3 style="margin: 0 0 12px 0; color: #5B0202;" class="mobile-title">Important Information</h3>
        <ul style="margin: 0; padding-left: 20px;" class="mobile-text">
          <li style="margin-bottom: 8px;">Please arrive 15 minutes before your reservation time</li>
          <li style="margin-bottom: 8px;">Bring a valid ID for verification</li>
          <li style="margin-bottom: 8px;">Dress code: ${bookingData.dressCode || 'Smart casual'}</li>
          <li>For cancellations, contact us at least 24 hours in advance</li>
        </ul>
      </div>

      ${bookingData.hasQrCode && bookingData.qrCodeImage ? `
      <!-- QR Code Section -->
      <div style="margin-top: 24px; padding: 20px; background: linear-gradient(135deg, #FFF5E6 0%, #ffffff 100%); border: 2px solid #FFD700; border-radius: 15px; text-align: center;" class="mobile-padding">
        <h3 style="margin: 0 0 20px 0; color: #5B0202; font-size: 18px;" class="mobile-title">📱 Your Entry QR Code</h3>
        <div style="background: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 4px 15px rgba(128, 0, 32, 0.1); border: 2px solid #FFD700; display: inline-block;">
          <img src="${bookingData.qrCodeImage}" alt="QR Code for Venue Entry" style="width: 180px; height: 180px; display: block; margin: 0 auto;" />
        </div>
        <div style="margin-top: 15px; max-width: 400px; margin-left: auto; margin-right: auto;">
          <p style="color: #333; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;" class="mobile-text">
            📋 Present this QR code at the venue entrance for quick check-in
          </p>
          <div style="background: rgba(128, 0, 32, 0.1); border: 1px solid #5B0202; border-radius: 8px; padding: 12px; margin-top: 15px;">
            <p style="color: #5B0202; font-size: 12px; font-weight: bold; margin: 0;" class="mobile-text">
              🔒 This QR code is unique to your booking and contains security verification
            </p>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Contact Information -->
      <div style="margin-top: 24px; padding: 16px; border: 1px solid #ddd; border-radius: 8px;" class="mobile-padding">
        <h3 style="margin: 0 0 12px 0; color: #5B0202;" class="mobile-title">Venue Contact</h3>
        <p style="margin: 0;" class="mobile-text">
          <strong>${bookingData.venueName}</strong><br>
          📍 ${bookingData.venueAddress}<br>
          📞 ${bookingData.venuePhone}<br>
          ✉️ ${bookingData.venueEmail}
        </p>
      </div>
    </div>
  </div>
  <div style="max-width: 600px; margin: auto;">
    <p style="color: #999; text-align: center; padding: 16px;" class="mobile-text mobile-padding">
      This email was sent to ${bookingData.customerEmail}<br>
      You received this email because you made a reservation with Eddys Members
    </p>
    <p style="color: #999; text-align: center; font-size: 12px;" class="mobile-text">
      Eddys Members - Your Premier Destination for Exclusive Venue Bookings<br>
      Lagos, Nigeria | www.vipclub.com
    </p>
  </div>
</div>
  `;
};

export const venueOwnerNotificationTemplate = (bookingData, venueOwnerData) => {
  return `
<div
  style="
    font-family: system-ui, sans-serif, Arial;
    font-size: 14px;
    color: #333;
    padding: 14px 8px;
    background-color: #f5f5f5;
  "
>
  <div style="max-width: 600px; margin: auto; background-color: #fff">
    <div style="border-top: 6px solid #D4AF37; padding: 16px">
      <a
        style="text-decoration: none; outline: none; margin-right: 8px; vertical-align: middle"
        href="https://vipclub.com/venue-owner/dashboard"
        target="_blank"
      >
        <img
          style="height: 32px; vertical-align: middle"
          height="32px"
          src="cid:logo.png"
          alt="Eddys Members"
        />
      </a>
      <span
        style="
          font-size: 16px;
          vertical-align: middle;
          border-left: 1px solid #333;
          padding-left: 8px;
        "
      >
        <strong>New Booking Received</strong>
      </span>
    </div>
    <div style="padding: 0 16px">
      <p>Hello ${venueOwnerData.name},</p>
      <p>You have received a new booking for <strong>${bookingData.venueName}</strong>.</p>
      
      <div
        style="
          text-align: left;
          font-size: 14px;
          padding-bottom: 4px;
          border-bottom: 2px solid #333;
        "
      >
        <strong>Booking # ${bookingData.bookingId}</strong>
      </div>

      <!-- Customer Information -->
      <div style="margin-top: 24px; padding: 16px; background-color: #f8f8f8; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; color: #5B0202;">Customer Details</h3>
        <p style="margin: 0;">
          <strong>Name:</strong> ${bookingData.customerName}<br>
          <strong>Email:</strong> ${bookingData.customerEmail}<br>
          <strong>Phone:</strong> ${bookingData.customerPhone}
        </p>
      </div>

      <!-- Booking Details -->
      <div style="margin-top: 16px; padding: 16px; background-color: #f8f8f8; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; color: #5B0202;">Booking Details</h3>
        <p style="margin: 0;">
          <strong>Date:</strong> ${bookingData.date}<br>
          <strong>Time:</strong> ${bookingData.time}<br>
          <strong>Guests:</strong> ${bookingData.guests}<br>
          <strong>Table:</strong> ${bookingData.tableNumber || bookingData.table_number || 'TBD'}<br>
          <strong>Table Type:</strong> ${bookingData.tableType || bookingData.table_type || 'VIP Table'}<br>
          <strong>Total Amount:</strong> ₦${bookingData.totalAmount}
        </p>
      </div>

      <!-- Action Buttons -->
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://vipclub.com/venue-owner/bookings" 
           style="
             display: inline-block;
             padding: 12px 24px;
             background-color: #5B0202;
             color: white;
             text-decoration: none;
             border-radius: 6px;
             font-weight: bold;
           ">
          View in Dashboard
        </a>
      </div>
    </div>
  </div>
  <div style="max-width: 600px; margin: auto">
    <p style="color: #999; text-align: center; padding: 16px;">
      Eddys Members Venue Owner Portal<br>
      Manage your bookings at vipclub.com/venue-owner
    </p>
  </div>
</div>
  `;
};

export const cancellationTemplate = (bookingData) => {
  return `
<div
  style="
    font-family: system-ui, sans-serif, Arial;
    font-size: 14px;
    color: #333;
    padding: 14px 8px;
    background-color: #f5f5f5;
  "
>
  <div style="max-width: 600px; margin: auto; background-color: #fff">
    <div style="border-top: 6px solid #dc2626; padding: 16px">
      <a
        style="text-decoration: none; outline: none; margin-right: 8px; vertical-align: middle"
        href="https://vipclub.com"
        target="_blank"
      >
        <img
          style="height: 32px; vertical-align: middle"
          height="32px"
          src="cid:logo.png"
          alt="Eddys Members"
        />
      </a>
      <span
        style="
          font-size: 16px;
          vertical-align: middle;
          border-left: 1px solid #333;
          padding-left: 8px;
        "
      >
        <strong>Booking Cancelled</strong>
      </span>
    </div>
    <div style="padding: 0 16px">
      <p>Your booking has been cancelled as requested.</p>
      
      <div
        style="
          text-align: left;
          font-size: 14px;
          padding-bottom: 4px;
          border-bottom: 2px solid #333;
        "
      >
        <strong>Booking # ${bookingData.bookingId}</strong>
      </div>

      <!-- Cancelled Booking Details -->
      <div style="margin-top: 24px; padding: 16px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; color: #dc2626;">Cancelled Reservation</h3>
        <p style="margin: 0;">
          <strong>Venue:</strong> ${bookingData.venueName}<br>
          <strong>Date:</strong> ${bookingData.date}<br>
          <strong>Time:</strong> ${bookingData.time}<br>
          <strong>Guests:</strong> ${bookingData.guests}
        </p>
      </div>

      ${bookingData.refundAmount ? `
      <div style="margin-top: 16px; padding: 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; color: #16a34a;">Refund Information</h3>
        <p style="margin: 0;">
          A refund of <strong>₦${bookingData.refundAmount}</strong> will be processed to your original payment method within 5-7 business days.
        </p>
      </div>
      ` : ''}

      <p style="margin-top: 24px;">
        We're sorry to see you cancel your reservation. We hope to welcome you to Eddys Members in the future!
      </p>
    </div>
  </div>
  <div style="max-width: 600px; margin: auto">
    <p style="color: #999; text-align: center; padding: 16px;">
      Eddys Members - Your Premier Destination for Exclusive Venue Bookings<br>
      Lagos, Nigeria | www.vipclub.com
    </p>
  </div>
</div>
  `;
};

// Helper function to generate email data
export const generateEmailData = (booking, venue, customer) => {
  return {
    bookingId: booking.id,
    venueName: venue.name,
    venueAddress: venue.address,
    venuePhone: venue.contact_phone,
    venueEmail: venue.contact_email,
    venueImage: venue.images?.[0] || '/images/default-venue.jpg',
    customerName: customer.full_name || customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    date: new Date(booking.booking_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    time: booking.booking_time,
    guests: booking.guest_count,
    tableNumber: booking.table_number || booking.venue_tables?.table_number,
    tableType: booking.table_type || booking.venue_tables?.table_type,
    tableCapacity: booking.venue_tables?.capacity,
    bookingFee: booking.booking_fee || '0',
    serviceCharge: booking.service_charge || '0',
    totalAmount: booking.total_amount || booking.amount,
    dressCode: venue.dress_code,
    status: booking.status
  };
}; 