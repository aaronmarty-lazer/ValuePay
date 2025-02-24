require('dotenv').config();
const braintree = require('braintree');

const gateway = new braintree.BraintreeGateway({
  environment: process.env.BRAINTREE_MODE =='sandbox' ? braintree.Environment.Sandbox : braintree.Environment.Production,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});

// var gateway = new braintree.BraintreeGateway({
//     environment:  braintree.Environment.Sandbox,
//     merchantId:   'byyn8rvkn643n9c6',
//     publicKey:    '332727xdvd6tf993',
//     privateKey:   '4c11d6b281a180dbded05feaf9f61ee9'
// });
module.exports = { gateway };