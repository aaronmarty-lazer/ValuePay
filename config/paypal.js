const axios = require('axios');
require('dotenv').config();

const PAYPAL_API = process.env.PAYPAL_MODE === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';
console.log(process.env.PAYPAL_CLIENT_ID);
const getAccessToken = async () => {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
  try {
    const response = await axios.post(
      `${PAYPAL_API}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting PayPal access token:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = { PAYPAL_API, getAccessToken };