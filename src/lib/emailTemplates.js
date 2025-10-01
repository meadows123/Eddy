// Email templates for Eddys Members with deep linking support
import { emailDeepLinks, generateEmailButton, generateFallbackLink, generateEmailFooter } from './deepLinking.js';

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
        href="${emailDeepLinks.openApp()}"
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
        <tr style="border-top: 2px solid #333;">
          <td style="width: 60%;"></td>
          <td style="padding: 4px 8px; font-weight: bold;">Total</td>
          <td style="padding: 4px 8px; font-weight: bold; white-space: nowrap">₦${bookingData.totalAmount}</td>
        </tr>
      </table>

      <!-- Customer Information -->
      <div style="margin-top: 24px; padding: 16px; background-color: #f8f8f8; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; color: #5B0202;">Customer Details</h3>
        <p style="margin: 0;">
          <strong>Name:</strong> ${bookingData.customerName}<br>
          <strong>Email:</strong> ${bookingData.customerEmail}<br>
          <strong>Phone:</strong> ${bookingData.customerPhone}
        </p>
      </div>

      <!-- Action Buttons with Deep Linking -->
      <div style="text-align: center; margin: 24px 0;">
        ${generateEmailButton('View Booking in App', 'bookings', { id: bookingData.bookingId })}
        ${generateFallbackLink('/bookings', { id: bookingData.bookingId })}
      </div>
    </div>
  </div>
  
  <!-- App Download Footer -->
  ${generateEmailFooter()}
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
        href="https://oneeddy.com/venue-owner/dashboard"
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
          ${bookingData.tableNumber ? `<strong>Table:</strong> ${bookingData.tableNumber}<br>` : ''}
          <strong>Total Amount:</strong> ₦${bookingData.totalAmount}
        </p>
      </div>

      <!-- Action Buttons -->
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://oneeddy.com/venue-owner/bookings" 
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
      Manage your bookings at oneeddy.com/venue-owner
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
        href="${emailDeepLinks.openApp()}"
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

      <!-- Action Buttons with Deep Linking -->
      <div style="text-align: center; margin: 24px 0;">
        ${generateEmailButton('Book Another Venue', 'venues')}
        ${generateFallbackLink('/venues')}
      </div>
    </div>
  </div>
  
  <!-- App Download Footer -->
  ${generateEmailFooter()}
</div>
  `;
};

// New signup confirmation template with deep linking
export const signupConfirmationTemplate = (userData) => {
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
    <div style="border-top: 6px solid #5B0202; padding: 16px">
      <a
        style="text-decoration: none; outline: none; margin-right: 8px; vertical-align: middle"
        href="${emailDeepLinks.openApp()}"
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
        <strong>Welcome to VIPClub!</strong>
      </span>
    </div>
    <div style="padding: 0 16px">
      <h1 style="color: #5B0202; text-align: center; margin: 24px 0;">Welcome to VIPClub!</h1>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Hi ${userData.firstName || userData.email}! Thank you for joining VIPClub - your premier destination for exclusive venue bookings.
      </p>

      <div style="background-color: #f8f8f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #5B0202; margin: 0 0 15px 0;">What's Next?</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li style="margin-bottom: 8px;">Complete your profile to personalize your experience</li>
          <li style="margin-bottom: 8px;">Browse exclusive venues and make your first booking</li>
          <li style="margin-bottom: 8px;">Earn loyalty points with every reservation</li>
          <li style="margin-bottom: 8px;">Get priority access to premium tables and events</li>
        </ul>
      </div>

      <!-- Action Buttons with Deep Linking -->
      <div style="text-align: center; margin: 30px 0;">
        ${generateEmailButton('Complete Profile', 'profile')}
        ${generateFallbackLink('/profile')}
      </div>

      <div style="text-align: center; margin: 20px 0;">
        ${generateEmailButton('Browse Venues', 'venues')}
        ${generateFallbackLink('/venues')}
      </div>

      <div style="text-align: center; margin: 20px 0;">
        ${generateEmailButton('Open App', 'home')}
        ${generateFallbackLink('/')}
      </div>
    </div>
  </div>
  
  <!-- App Download Footer -->
  ${generateEmailFooter()}
</div>
  `;
};

// QR Code Scan Notification Template
export const qrScanNotificationTemplate = (scanData) => {
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
        href="${emailDeepLinks.openApp()}"
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
        <strong>QR Code Scanned</strong>
      </span>
    </div>
    
    <div style="padding: 20px;" class="mobile-padding">
      <h2 style="color: #5B0202; margin: 0 0 20px 0; font-size: 20px; text-align: center;" class="mobile-title">
        ✅ QR Code Scanned
      </h2>
      
      <div style="background-color: #d4edda; border: 2px solid #28a745; border-radius: 12px; padding: 24px; margin: 0 0 20px 0; text-align: center;" class="mobile-padding">
        <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: bold; color: #155724;" class="mobile-text">
          🎉 Welcome to ${scanData.venueName}!
        </p>
        <p style="margin: 0 0 8px 0; font-size: 16px; color: #155724; line-height: 1.6;" class="mobile-text">
          Your table is ready. Please enjoy your experience!
        </p>
      </div>
      
      <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;" class="mobile-padding">
        <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #333; text-align: center;" class="mobile-text">
          🪑 Your Table: <span style="color: #5B0202; font-size: 20px;">${scanData.tableNumber}</span>
        </p>
        <p style="margin: 0; font-size: 14px; color: #666; text-align: center;" class="mobile-text">
          Scanned at ${scanData.scanTime}
        </p>
      </div>
      
      <div style="border-top: 1px solid #e9ecef; padding-top: 16px; margin-top: 24px;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #6c757d; text-align: center;" class="mobile-text">
          <strong>Security Notification:</strong> This is an automated security notification to confirm your entry.
        </p>
        <p style="margin: 0; font-size: 12px; color: #6c757d; text-align: center;" class="mobile-text">
          If you did not scan your QR code, please contact <a href="mailto:security@oneeddy.com" style="color: #5B0202;">security@oneeddy.com</a>
        </p>
      </div>
    </div>
    
    ${generateEmailFooter()}
  </div>
</div>`;
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
    tableNumber: booking.table_number,
    bookingFee: booking.booking_fee || '0',
    serviceCharge: booking.service_charge || '0',
    totalAmount: booking.total_amount || booking.amount,
    dressCode: venue.dress_code,
    status: booking.status
  };
};

export default {
  bookingConfirmationTemplate,
  cancellationTemplate,
  signupConfirmationTemplate,
  venueOwnerNotificationTemplate,
  qrScanNotificationTemplate,
  generateEmailData
}; 