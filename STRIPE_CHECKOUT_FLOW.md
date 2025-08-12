# 🚀 Stripe Checkout Payment Flow - Step by Step

This document describes the complete payment flow using **Stripe Checkout Sessions** instead of embedded payment forms.

## **Overview**

With Stripe Checkout, users are redirected to a **hosted payment page** managed by Stripe where they can securely enter their card details and complete the payment. After payment, they're redirected back to your application.

## **🔄 Complete Payment Flow**

### **Step 1: User Selects a Plan**

**Frontend displays available plans:**

```json
{
  "plans": [
    {
      "_id": "65f8a1b2c3d4e5f6a7b8c9d0",
      "planName": "Basic Plan",
      "price": 19.99,
      "currency": "usd",
      "planId": "basic_plan",
      "stripePlanId": "price_1ABC123DEF456",
      "features": ["2 Hosts", "Basic Support", "Standard Features"],
      "successUrl": "https://coordle.com/welcome-basic"
    },
    {
      "_id": "65f8a1b2c3d4e5f6a7b8c9d1",
      "planName": "Premium Plan",
      "price": 49.99,
      "currency": "usd",
      "planId": "premium_plan",
      "stripePlanId": "price_1XYZ789GHI012",
      "features": ["Unlimited Hosts", "Priority Support", "Advanced Analytics"],
      "successUrl": "https://coordle.com/welcome-premium"
    }
  ]
}
```

**User selects Premium Plan (ID: 65f8a1b2c3d4e5f6a7b8c9d1)**

---

### **Step 2: Create Stripe Checkout Session**

**Frontend Request:**

```javascript
POST /api/payments/create-checkout-session
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "planId": "65f8a1b2c3d4e5f6a7b8c9d1"
}
```

**Backend Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Checkout session created successfully",
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4y5Z6#fid=k2a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
    "sessionId": "cs_test_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4y5Z6",
    "amount": 49.99,
    "currency": "usd",
    "planName": "Premium Plan"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Database Payment Record Created:**

```json
{
  "_id": "65f8a1b2c3d4e5f6a7b8c9d2",
  "userId": "65f8a1b2c3d4e5f6a7b8c9d3",
  "planId": "65f8a1b2c3d4e5f6a7b8c9d1",
  "stripePaymentIntentId": "pi_3OjK8L2eZvKYlo2C1gFJXswQ",
  "amount": 49.99,
  "currency": "usd",
  "status": "pending",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

### **Step 3: Redirect User to Stripe Checkout**

**Frontend redirects user to Stripe's hosted payment page:**

```javascript
const { checkoutUrl } = await response.json();

// Redirect user to Stripe Checkout
window.location.href = checkoutUrl;
```

**User sees Stripe's hosted payment page:**

- **URL:** `https://checkout.stripe.com/pay/cs_test_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4y5Z6`
- **Page includes:**
  - Plan details (Premium Plan - $49.99)
  - Card input fields
  - Billing information
  - Secure payment processing
  - Stripe branding and security badges

---

### **Step 4: User Completes Payment on Stripe**

**User fills out the payment form on Stripe's page:**

```javascript
// This happens on Stripe's hosted page
{
  cardNumber: "4242424242424242",
  expiryMonth: "12",
  expiryYear: "2025",
  cvc: "123",
  cardholderName: "John Doe",
  email: "john.doe@example.com",
  billingAddress: {
    country: "United States",
    state: "California",
    city: "San Francisco",
    postalCode: "94102"
  }
}
```

**User clicks "Pay $49.99" button**

---

### **Step 5: Stripe Processes Payment**

**Stripe processes the payment and redirects to success URL:**

- **Success URL:** `https://coordle.com/api/payments/success/cs_test_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4y5Z6`
- **Cancel URL:** `https://coordle.com/api/payments/cancel/cs_test_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4y5Z6`

---

### **Step 6: Backend Success Page Processing**

**User lands on your success page:**

```javascript
GET /api/payments/success/cs_test_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4y5Z6
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Backend Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payment success details retrieved",
  "data": {
    "payment": {
      "id": "65f8a1b2c3d4e5f6a7b8c9d2",
      "amount": 49.99,
      "currency": "usd",
      "status": "succeeded",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "plan": {
      "name": "Premium Plan",
      "features": ["Unlimited Hosts", "Priority Support", "Advanced Analytics"],
      "successUrl": "https://coordle.com/welcome-premium"
    },
    "user": {
      "id": "65f8a1b2c3d4e5f6a7b8c9d3",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "userRole": "owner"
    },
    "nextSteps": [
      "Your account has been upgraded to Owner role",
      "You can now access premium features",
      "Welcome to the Coordle community!"
    ]
  }
}
```

---

### **Step 7: Frontend Success Page Display**

**Frontend shows success page with payment details:**

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Payment Successful - Coordle</title>
  </head>
  <body>
    <div class="success-container">
      <h1>🎉 Payment Successful!</h1>
      <h2>Welcome to Coordle Premium Plan</h2>

      <div class="payment-summary">
        <h3>Payment Details</h3>
        <p><strong>Amount:</strong> $49.99 USD</p>
        <p><strong>Plan:</strong> Premium Plan</p>
        <p><strong>Status:</strong> Active</p>
        <p><strong>Role:</strong> Owner</p>
      </div>

      <div class="features">
        <h3>Your Premium Features:</h3>
        <ul>
          <li>✅ Unlimited Hosts</li>
          <li>✅ Priority Support</li>
          <li>✅ Advanced Analytics</li>
          <li>✅ Premium Dashboard</li>
        </ul>
      </div>

      <div class="actions">
        <a href="/dashboard" class="btn-primary">Go to Dashboard</a>
        <a href="https://coordle.com/welcome-premium" class="btn-secondary"
          >View Welcome Page</a
        >
      </div>
    </div>
  </body>
</html>
```

---

### **Step 8: Stripe Webhook (Automatic Processing)**

**Stripe sends webhook to your backend:**

```json
POST /api/payments/webhook
stripe-signature: whsec_webhook_secret_here

{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4y5Z6",
      "payment_status": "paid",
      "amount_total": 4999,
      "currency": "usd",
      "metadata": {
        "userId": "65f8a1b2c3d4e5f6a7b8c9d3",
        "planId": "65f8a1b2c3d4e5f6a7b8c9d1",
        "planName": "Premium Plan"
      }
    }
  }
}
```

**Backend webhook processing:**

```javascript
// Webhook automatically:
// 1. Updates payment status to "succeeded"
// 2. Changes user role from "traveller" to "owner"
// 3. Logs the successful role change
```

---

## **🔧 Frontend Implementation**

### **1. Create Checkout Session**

```javascript
const createCheckoutSession = async (planId) => {
  try {
    const response = await fetch("/api/payments/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ planId }),
    });

    const { checkoutUrl } = await response.json();

    // Redirect to Stripe Checkout
    window.location.href = checkoutUrl;
  } catch (error) {
    console.error("Error creating checkout session:", error);
  }
};
```

### **2. Handle Plan Selection**

```javascript
const handlePlanSelect = (plan) => {
  // Show loading state
  setLoading(true);

  // Create checkout session
  createCheckoutSession(plan._id);
};
```

### **3. Success Page Component**

```javascript
const PaymentSuccess = () => {
  const { sessionId } = useParams();
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    const fetchSuccessData = async () => {
      const response = await fetch(`/api/payments/success/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setSuccessData(data.data);
    };

    fetchSuccessData();
  }, [sessionId]);

  if (!successData) return <div>Loading...</div>;

  return (
    <div className="success-page">
      <h1>🎉 Payment Successful!</h1>
      <h2>Welcome to {successData.plan.name}</h2>

      <div className="payment-summary">
        <h3>Payment Details</h3>
        <p>
          Amount: ${successData.payment.amount} {successData.payment.currency}
        </p>
        <p>Status: {successData.payment.status}</p>
        <p>Role: {successData.user.userRole}</p>
      </div>

      <div className="features">
        <h3>Your Features:</h3>
        <ul>
          {successData.plan.features.map((feature) => (
            <li key={feature}>✅ {feature}</li>
          ))}
        </ul>
      </div>

      <div className="actions">
        <button onClick={() => (window.location.href = "/dashboard")}>
          Go to Dashboard
        </button>

        {successData.plan.successUrl && (
          <button
            onClick={() => window.open(successData.plan.successUrl, "_blank")}
          >
            View Welcome Page
          </button>
        )}
      </div>
    </div>
  );
};
```

---

## **📱 User Experience Flow**

1. **User selects plan** → Clicks "Subscribe" button
2. **Frontend creates checkout session** → Calls your backend
3. **Backend creates Stripe session** → Returns checkout URL
4. **User redirected to Stripe** → Secure hosted payment page
5. **User enters card details** → On Stripe's secure page
6. **User completes payment** → Clicks "Pay" button
7. **Stripe processes payment** → Redirects to success URL
8. **User lands on success page** → Shows payment confirmation
9. **User role updated** → From traveller to owner
10. **User can access features** → Premium functionality unlocked

---

## **✅ Benefits of Stripe Checkout**

- **🔒 Security**: Stripe handles all sensitive payment data
- **📱 Mobile Optimized**: Responsive design for all devices
- **🌍 Global**: Supports multiple currencies and payment methods
- **⚡ Fast**: Optimized checkout flow
- **🛡️ Compliant**: PCI DSS compliant out of the box
- **🎨 Customizable**: Can match your brand colors
- **📊 Analytics**: Built-in payment analytics and reporting

---

## **🔧 Environment Variables**

```bash
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
FRONTEND_URL=https://your-frontend-domain.com
```

This approach gives you a professional, secure payment experience while maintaining full control over the post-payment flow! 🎉
