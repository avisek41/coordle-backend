# Stripe Payment Integration & Role Change

This document describes the Stripe payment integration and automatic role change functionality implemented in the Coordle backend.

## Overview

When a user selects a plan and completes payment through Stripe, their role automatically changes from `traveller` to `owner`. This is handled through both manual confirmation and automatic webhook processing.

## Architecture

### Models

1. **Payment Model** (`src/models/Payment.ts`)
   - Tracks payment status, amount, and Stripe payment intent ID
   - Links user and plan information
   - Stores payment metadata

2. **Plan Model** (`src/models/Plan.ts`)
   - Contains both internal `planId` and Stripe `stripePlanId`
   - Stores pricing and feature information

3. **User Model** (`src/models/User.ts`)
   - User roles: `traveller`, `host`, `owner`
   - Role automatically updated after successful payment

### Controllers

1. **Payment Controller** (`src/controllers/paymentController.ts`)
   - `createPaymentIntent`: Creates Stripe payment intent
   - `confirmPayment`: Manually confirms payment and updates role
   - `getPaymentHistory`: Retrieves user's payment history
   - `getPaymentStatus`: Gets specific payment status

2. **Webhook Controller** (`src/controllers/webhookController.ts`)
   - Handles Stripe webhook events automatically
   - Updates payment status and user role on payment success
   - Processes payment failures and cancellations

## API Endpoints

### Payment Routes (`/api/payments`)

- `POST /create-payment-intent` - Create payment intent for selected plan
- `POST /confirm-payment` - Confirm payment and update user role
- `GET /history` - Get user's payment history
- `GET /status/:paymentIntentId` - Get specific payment status
- `POST /webhook` - Stripe webhook endpoint (no auth required)

## Payment Flow

### 1. Plan Selection
User selects a plan from available options.

### 2. Payment Intent Creation
```javascript
POST /api/payments/create-payment-intent
{
  "planId": "plan_mongodb_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_xxx_secret_xxx",
    "paymentIntentId": "pi_xxx",
    "amount": 29.99,
    "currency": "usd"
  }
}
```

### 3. Frontend Payment Processing
Frontend uses `clientSecret` to complete payment with Stripe Elements.

### 4. Payment Confirmation
```javascript
POST /api/payments/confirm-payment
{
  "paymentIntentId": "pi_xxx"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "payment_mongodb_id",
    "status": "succeeded",
    "userRole": "owner"
  }
}
```

### 5. Automatic Webhook Processing
Stripe sends webhook events to `/api/payments/webhook`:
- `payment_intent.succeeded` - Updates payment status and user role
- `payment_intent.payment_failed` - Marks payment as failed
- `payment_intent.canceled` - Marks payment as canceled

## Environment Variables

```bash
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## Frontend Integration

### 1. Install Stripe.js
```bash
npm install @stripe/stripe-js
```

### 2. Create Payment Intent
```javascript
const response = await fetch('/api/payments/create-payment-intent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ planId: selectedPlanId })
});

const { clientSecret, paymentIntentId } = await response.json();
```

### 3. Complete Payment
```javascript
const { error } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'User Name' }
  }
});

if (error) {
  console.error('Payment failed:', error);
} else {
  // Confirm payment with backend
  await confirmPayment(paymentIntentId);
}
```

### 4. Confirm Payment
```javascript
const confirmResponse = await fetch('/api/payments/confirm-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ paymentIntentId })
});

const { userRole } = await confirmResponse.json();
// User role is now 'owner'
```

## Security Features

1. **Authentication Required**: All payment endpoints (except webhook) require valid JWT token
2. **User Verification**: Payment confirmation checks if payment belongs to authenticated user
3. **Webhook Signature Verification**: Stripe webhook events are verified using webhook secret
4. **Metadata Validation**: Payment intent metadata is validated before processing

## Error Handling

- **Plan Not Found**: 404 error if plan ID doesn't exist
- **Payment Already Exists**: 400 error if user already has active payment for plan
- **Unauthorized Access**: 403 error if user tries to access another user's payment
- **Payment Processing**: 400 error if payment is still being processed

## Testing

### Test Stripe Connection
```bash
node test-stripe.js
```

### Test Payment Flow
1. Create a test plan in database
2. Use Stripe test card numbers (e.g., 4242 4242 4242 4242)
3. Test both successful and failed payment scenarios
4. Verify user role changes from `traveller` to `owner`

## Monitoring

- Payment status changes are logged
- User role updates are logged
- Webhook processing errors are logged
- All payment activities are stored in database for audit

## Future Enhancements

1. **Subscription Management**: Handle recurring payments
2. **Refund Processing**: Implement refund functionality
3. **Payment Analytics**: Track payment metrics and analytics
4. **Multi-Currency Support**: Support for different currencies
5. **Tax Calculation**: Automatic tax calculation based on location 