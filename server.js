const express = require('express');
const app = express();
require('dotenv').config();

app.use(express.json());

// Existing PayPal routes
app.use('/payment', require('./routes/payment'));

// New Braintree routes
app.use('/braintree', require('./routes/braintree'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});     