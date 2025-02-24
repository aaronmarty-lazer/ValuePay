const express = require('express');
const router = express.Router();
const { gateway } = require('../config/braintree');

// Create a Customer with Payment Method
const createCustomerWithPayment = async (nonce) => {
  console.log('Attempting to create customer with nonce:', nonce);
  try {
    const result = await gateway.customer.create({
      paymentMethodNonce: nonce,
    });
    if (!result.success) {
      console.error('Customer creation failed:', result.message, result.errors);
      throw new Error(result.message || 'Customer creation failed');
    }
    console.log('Customer created successfully:', result.customer.id);
    console.log('Payment method:', result.customer.paymentMethods[0]);
    return result.customer.paymentMethods[0].token;
  } catch (error) {
    console.error('Error in createCustomerWithPayment:', error.message, error.stack);
    throw error;
  }
};

// Create a Subscription
const createSubscription = async (paymentMethodToken) => {
  console.log('Attempting to create dynamic subscription with token:', paymentMethodToken);
  try {
    const result = await gateway.subscription.create({
      paymentMethodToken,
      merchantAccountId: 'byyn8rvkn643n9c6_USD', // Replace with your actual merchant account ID
      price: '10.00',
      currencyIsoCode: 'USD', // Explicitly specify the currency
      recurring: true,
      billingDayOfMonth: 1,
      options: {
        startImmediately: true,
      },
      numberOfBillingCycles: 0, // Infinite (or 6 for installments)
    });
    if (!result.success) {
      console.error('Dynamic subscription creation failed:', result.message, result.errors);
      throw new Error(result.message);
    }
    console.log('Dynamic subscription created successfully:', result.subscription.id);
    return result.subscription.id;
  } catch (error) {
    console.error('Error in createSubscription:', error.message, error.stack);
    throw error;
  }
};

// Check Subscription Status
const checkSubscriptionStatus = async (subscriptionId) => {
  const result = await gateway.subscription.find(subscriptionId);
  return result;
};

// Update Payment Method for Subscription
const updatePaymentMethod = async (subscriptionId, newNonce) => {
  console.log('Attempting to update payment method for subscription:', subscriptionId, 'with nonce:', newNonce);
  try {
    const paymentResult = await gateway.paymentMethod.create({
      paymentMethodNonce: newNonce,
    });
    if (!paymentResult.success) {
      console.error('Payment method creation failed:', paymentResult.message, paymentResult.errors);
      throw new Error(paymentResult.message);
    }
    const newPaymentMethodToken = paymentResult.paymentMethod.token;

    const updateResult = await gateway.subscription.update(subscriptionId, {
      paymentMethodToken: newPaymentMethodToken,
    });
    if (!updateResult.success) {
      console.error('Subscription update failed:', updateResult.message, updateResult.errors);
      throw new Error(updateResult.message);
    }
    console.log('Payment method updated successfully for subscription:', subscriptionId);
    return updateResult.subscription;
  } catch (error) {
    console.error('Error in updatePaymentMethod:', error.message, error.stack);
    throw error;
  }
};

// Routes
router.post('/subscribe', async (req, res) => {
  const { paymentMethodNonce } = req.body;
  console.log('Received nonce:', paymentMethodNonce);
  try {
    console.log('Step 1: Creating customer with payment method...');
    const paymentMethodToken = await createCustomerWithPayment(paymentMethodNonce);
    console.log('Step 2: Payment method token obtained:', paymentMethodToken);
    console.log('Step 3: Creating subscription...');
    const subscriptionId = await createSubscription(paymentMethodToken);
    console.log('Step 4: Subscription ID:', subscriptionId);
    res.json({ subscriptionId, message: 'Braintree subscription created successfully.' });
  } catch (error) {
    console.error('Error in subscribe:', error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});

router.get('/check-subscription/:subscriptionId', async (req, res) => {
  const { subscriptionId } = req.params;
  try {
    const subscription = await checkSubscriptionStatus(subscriptionId);
    res.json({
      id: subscription.id,
      status: subscription.status,
      nextBillingDate: subscription.nextBillingDate,
      paymentMethodToken: subscription.paymentMethodToken,
      amount: subscription.price,
      currency: subscription.currencyIsoCode,
      cyclesCompleted: subscription.billingCyclesCompleted,
      totalCycles: subscription.numberOfBillingCycles,
      failureCount: subscription.failureCount,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    });
  } catch (error) {
    console.error('Error checking subscription status:', error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});

router.post('/update-card/:subscriptionId', async (req, res) => {
  const { subscriptionId } = req.params;
  const { paymentMethodNonce } = req.body;
  console.log('Received request to update card for subscription:', subscriptionId, 'with nonce:', paymentMethodNonce);
  try {
    const updatedSubscription = await updatePaymentMethod(subscriptionId, paymentMethodNonce);
    res.json({
      message: 'Braintree payment method updated successfully.',
      subscriptionId: updatedSubscription.id,
      paymentMethodToken: updatedSubscription.paymentMethodToken,
    });
  } catch (error) {
    console.error('Error updating card:', error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});

router.get('/test-connection', async (req, res) => {
  try {
    const result = await gateway.clientToken.generate();
    console.log('Client token generated:', result.clientToken);
    res.json({ message: 'Braintree API connection successful', clientToken: result.clientToken });
  } catch (error) {
    console.error('Connection test error:', error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});

router.post('/test-subscription', async (req, res) => {
  const { paymentMethodToken } = req.body;
  console.log('Testing subscription creation with token:', paymentMethodToken);
  try {
    const subscriptionId = await createSubscription(paymentMethodToken);
    res.json({ subscriptionId, message: 'Subscription created successfully.' });
  } catch (error) {
    console.error('Test subscription error:', error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;