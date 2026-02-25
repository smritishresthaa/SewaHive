// backend/utils/esewa.js
const crypto = require('crypto');
const axios = require('axios');

// eSewa endpoints
const ESEWA_UAT_CHECKOUT_URL = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
const ESEWA_PROD_CHECKOUT_URL = 'https://epay.esewa.com.np/api/epay/main/v2/form';
const ESEWA_UAT_STATUS_URL = 'https://uat.esewa.com.np/api/epay/transaction/status/';
const ESEWA_PROD_STATUS_URL = 'https://epay.esewa.com.np/api/epay/transaction/status/';

// Use UAT for development
const isProduction = process.env.NODE_ENV === 'production';
const CHECKOUT_URL = isProduction ? ESEWA_PROD_CHECKOUT_URL : ESEWA_UAT_CHECKOUT_URL;
const STATUS_URL = isProduction ? ESEWA_PROD_STATUS_URL : ESEWA_UAT_STATUS_URL;

/**
 * Generate HMAC SHA-256 signature for eSewa
 */
function buildSignature(fields, secretKey) {
  const signedNames = fields.signed_field_names.split(',');
  const dataToSign = signedNames.map((n) => `${n}=${fields[n]}`).join(',');

  return crypto.createHmac('sha256', secretKey).update(dataToSign).digest('base64');
}

/**
 * Build payment initiation payload with signature
 */
function buildInitiationPayload({
  amount,
  tax_amount = 0,
  total_amount,
  transaction_uuid,
  product_code,
  success_url,
  failure_url,
  secretKey,
  product_service_charge = 0,
  product_delivery_charge = 0,
}) {
  const fields = {
    amount: String(amount),
    tax_amount: String(tax_amount),
    total_amount: String(total_amount),
    transaction_uuid,
    product_code,
    product_service_charge: String(product_service_charge),
    product_delivery_charge: String(product_delivery_charge),
    success_url,
    failure_url,
    signed_field_names: 'total_amount,transaction_uuid,product_code',
  };

  const signature = buildSignature(fields, secretKey);

  return { 
    ...fields, 
    signature,
    checkout_url: CHECKOUT_URL
  };
}

/**
 * Verify payment status with eSewa Status Check API
 */
async function verifyPayment({ transaction_uuid, total_amount, product_code }) {
  try {
    const url = `${STATUS_URL}?product_code=${product_code}&total_amount=${total_amount}&transaction_uuid=${transaction_uuid}`;
    
    const { data } = await axios.get(url);
    
    return data;
  } catch (error) {
    console.error('eSewa verification error:', error.response?.data || error.message);
    throw new Error('Payment verification failed');
  }
}

/**
 * Decode and verify eSewa callback data (Base64 encoded)
 */
function decodeEsewaResponse(encodedData) {
  try {
    console.log('🔐 Decoding eSewa response...');
    console.log('   Input length:', encodedData.length);
    console.log('   First 50 chars:', encodedData.substring(0, 50));
    
    const decoded = Buffer.from(encodedData, 'base64').toString('utf-8');
    console.log('   Decoded string:', decoded);
    
    const parsed = JSON.parse(decoded);
    console.log('   ✅ Successfully parsed JSON:', parsed);
    return parsed;
  } catch (error) {
    console.error('❌ Failed to decode eSewa response');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    return null;
  }
}

/**
 * Verify callback signature
 */
function verifyCallbackSignature(data, signature, secretKey) {
  const signedFieldNames = 'transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names';
  const fields = {
    transaction_code: data.transaction_code,
    status: data.status,
    total_amount: data.total_amount,
    transaction_uuid: data.transaction_uuid,
    product_code: data.product_code,
    signed_field_names: signedFieldNames,
  };

  const expectedSignature = buildSignature(fields, secretKey);
  return expectedSignature === signature;
}

module.exports = { 
  buildInitiationPayload, 
  verifyPayment,
  decodeEsewaResponse,
  verifyCallbackSignature,
  CHECKOUT_URL 
};
