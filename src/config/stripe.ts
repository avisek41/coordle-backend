import Stripe from "stripe";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY ||
    "sk_test_51RupxGDOa8XlJno7cujR2QkItzxBbMCO0VVxtioEdHN2YgNPk7wn0XdLyBkcH7NCWCn4hwZlhBA2LBaiW5Hlqrjw00oJj7oF8I",
  {
    apiVersion: "2025-07-30.basil",
  }
);

export default stripe;
