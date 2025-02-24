const express = require('express');
const router = express.Router();
const { PAYPAL_API, getAccessToken } = require('../config/paypal');
const axios = require('axios');

// Create a Product
const createProduct = async (token) => {
  const productData = {
    name: 'Monthly Subscription',
    description: 'Monthly recurring payment for premium access',
    type: 'SERVICE',
    category: 'SOFTWARE',
  };

  const response = await axios.post(`${PAYPAL_API}/v1/catalogs/products`, productData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `PRODUCT-${Date.now()}`,
    },
  });
  return response.data.id;
};

// Create a Subscription Plan
const createPlan = async (token, productId) => {
  const planData = {
    product_id: productId,
    name: 'Monthly Premium Plan',
    description: 'Monthly subscription for $10',
    status: 'ACTIVE',
    billing_cycles: [
      {
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: '10.00', currency_code: 'USD' } },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: 'CONTINUE',
      payment_failure_threshold: 3,
    },
  };

  const response = await axios.post(`${PAYPAL_API}/v1/billing/plans`, planData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `PLAN-${Date.now()}`,
    },
  });
  return response.data.id;
};

// Create a Subscription
const createSubscription = async (token, planId) => {
  const startTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const subscriptionData = {
    plan_id: planId,
    start_time: startTime,
    subscriber: {
      name: { given_name: 'John', surname: 'Doe' },
      email_address: 'customer@example.com',
    },
  };

  const response = await axios.post(`${PAYPAL_API}/v1/billing/subscriptions`, subscriptionData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `SUB-${Date.now()}`,
    },
  });
  return {
    approvalUrl: response.data.links.find(link => link.rel === 'approve').href,
    subscriptionId: response.data.id,
  };
};

// Check Subscription Status
const checkSubscriptionStatus = async (token, subscriptionId) => {
  const response = await axios.get(`${PAYPAL_API}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
};

// Routes
router.get('/create-plan', async (req, res) => {
  try {
    const token = await getAccessToken();
    const productId = await createProduct(token);
    const planId = await createPlan(token, productId);
    res.json({ planId });
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

router.post('/subscribe', async (req, res) => {
  const { planId } = req.body;
  try {
    const token = await getAccessToken();
    const result = await createSubscription(token, planId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

router.get('/check-subscription/:subscriptionId', async (req, res) => {
  const { subscriptionId } = req.params;
  try {
    const token = await getAccessToken();
    const subscriptionDetails = await checkSubscriptionStatus(token, subscriptionId);
    res.json({
      id: subscriptionDetails.id,
      status: subscriptionDetails.status,
      plan_id: subscriptionDetails.plan_id,
      start_time: subscriptionDetails.start_time,
      next_billing_time: subscriptionDetails.billing_info?.next_billing_time,
      last_payment: subscriptionDetails.billing_info?.last_payment,
    });
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

module.exports = router;