/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as jose from 'jose';
import crypto from 'crypto';

export interface BillDeskNeoConfig {
  mercid: string;
  clientid: string;
  keyid: string;
  encryptionKey: string;
  signingKey: string;
  env: 'uat' | 'production';
  returnUrl: string;
}

export interface BillDeskNeoCreateOrderParams {
  orderId: string;
  amount: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerIp?: string;
  returnUrl?: string;
}

export interface BillDeskNeoCreateOrderResult {
  success: boolean;
  orderId: string;
  bdorderid?: string;
  redirectUrl?: string;
  redirectParams?: Record<string, string>;
  rawResponse?: any;
  error?: string;
}

export interface BillDeskNeoTransactionResponse {
  objectid?: string;
  mercid?: string;
  transaction_date?: string;
  payment_method_type?: string;
  amount?: string;
  orderid?: string;
  transaction_error_type?: string;
  transactionid?: string;
  auth_status?: string; // "0300" = SUCCESS
  transaction_error_desc?: string;
  bankid?: string;
  bank_ref_no?: string;
  additional_info?: Record<string, string>;
  raw?: any;
}

/**
 * Retrieve configuration from environment variables
 */
export function getBillDeskNeoConfig(): BillDeskNeoConfig {
  const mercid = (process.env.BILLDESK_MERCID || process.env.BILLDESK_MERCHANT_ID || '').trim();
  const clientid = (process.env.BILLDESK_CLIENTID || process.env.BILLDESK_CLIENT_ID || mercid).trim();
  const keyid = (process.env.BILLDESK_KEYID || process.env.BILLDESK_SECURITY_ID || '').trim();
  const encryptionKey = (process.env.BILLDESK_ENCRYPTION_KEY || process.env.BILLDESK_CHECKSUM_KEY || '').trim();
  const signingKey = (process.env.BILLDESK_SIGNING_KEY || process.env.BILLDESK_CHECKSUM_KEY || encryptionKey).trim();
  const env = (process.env.BILLDESK_ENV === 'production') ? 'production' : 'uat';
  const returnUrl = (process.env.BILLDESK_RETURN_URL || 'https://taashbhatti.com/api/payment/billdesk/callback').trim();

  return {
    mercid,
    clientid,
    keyid,
    encryptionKey,
    signingKey,
    env,
    returnUrl
  };
}

/**
 * Check if BillDesk Neo has been configured
 */
export function isBillDeskNeoConfigured(): boolean {
  const cfg = getBillDeskNeoConfig();
  return Boolean(cfg.mercid && cfg.encryptionKey && cfg.signingKey);
}

/**
 * Return API base URL based on environment
 */
export function getBillDeskNeoApiBaseUrl(): string {
  const cfg = getBillDeskNeoConfig();
  if (cfg.env === 'production') {
    return 'https://api.billdesk.com';
  }
  return 'https://uat1.billdesk.com/u2';
}

/**
 * Normalize key into byte buffer (handles hex, base64, or utf8 string)
 */
function normalizeKey(keyString: string): Uint8Array {
  // If 64-char hex string (32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(keyString)) {
    return Buffer.from(keyString, 'hex');
  }
  // If base64 44-char string (32 bytes)
  if (/^[A-Za-z0-9+/=]{44}$/.test(keyString)) {
    return Buffer.from(keyString, 'base64');
  }
  // Otherwise use sha256 hash or utf8 slice to guarantee 256-bit key
  const buf = Buffer.from(keyString, 'utf8');
  if (buf.length === 32) {
    return buf;
  }
  return crypto.createHash('sha256').update(buf).digest();
}

/**
 * Encrypt and sign a JSON payload using Symmetric JOSE (JWE dir+A256GCM wrapped in JWS HS256)
 */
export async function encryptAndSignJose(payload: object, config?: BillDeskNeoConfig): Promise<string> {
  const cfg = config || getBillDeskNeoConfig();
  const encKey = normalizeKey(cfg.encryptionKey);
  const signKey = normalizeKey(cfg.signingKey);

  const payloadString = JSON.stringify(payload);

  // 1. JWE Direct Encryption (A256GCM)
  const jwe = await new jose.CompactEncrypt(new TextEncoder().encode(payloadString))
    .setProtectedHeader({
      alg: 'dir',
      enc: 'A256GCM',
      kid: cfg.keyid,
      clientid: cfg.clientid
    })
    .encrypt(encKey);

  // 2. JWS Signing (HS256)
  const jws = await new jose.CompactSign(new TextEncoder().encode(jwe))
    .setProtectedHeader({
      alg: 'HS256',
      kid: cfg.keyid,
      clientid: cfg.clientid
    })
    .sign(signKey);

  return jws;
}

/**
 * Verify and decrypt a Symmetric JOSE response from BillDesk
 */
export async function verifyAndDecryptJose(jwsToken: string, config?: BillDeskNeoConfig): Promise<any> {
  const cfg = config || getBillDeskNeoConfig();
  const encKey = normalizeKey(cfg.encryptionKey);
  const signKey = normalizeKey(cfg.signingKey);

  const cleanToken = jwsToken.trim();

  // Check if token is JWS (3 dot-separated parts) or raw JWE (5 dot-separated parts)
  const parts = cleanToken.split('.');

  let jweString = cleanToken;
  if (parts.length === 3) {
    // JWS -> verify signature to extract JWE
    try {
      const verified = await jose.compactVerify(cleanToken, signKey);
      jweString = new TextDecoder().decode(verified.payload);
    } catch (jwsErr) {
      console.warn('JWS verification failed, attempting direct decrypt fallback:', jwsErr);
      jweString = cleanToken;
    }
  }

  // JWE -> decrypt payload
  const decrypted = await jose.compactDecrypt(jweString, encKey);
  const jsonString = new TextDecoder().decode(decrypted.plaintext);
  return JSON.parse(jsonString);
}

/**
 * Create an order using BillDesk Neo Create Order API
 */
export async function createBillDeskNeoOrder(params: BillDeskNeoCreateOrderParams): Promise<BillDeskNeoCreateOrderResult> {
  const cfg = getBillDeskNeoConfig();
  if (!isBillDeskNeoConfigured()) {
    return {
      success: false,
      orderId: params.orderId,
      error: 'BillDesk Neo merchant credentials not configured in environment.'
    };
  }

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  // Format order_date: YYYY-MM-DDThh:mm:ss+05:30
  const orderDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}+05:30`;

  const requestPayload = {
    mercid: cfg.mercid,
    orderid: params.orderId,
    amount: params.amount.toFixed(2),
    order_date: orderDate,
    currency: '356', // INR
    ru: params.returnUrl || cfg.returnUrl,
    itemcode: 'DIRECT',
    additional_info: {
      additional_info1: (params.customerName || 'Patron').substring(0, 50),
      additional_info2: (params.customerPhone || '').replace(/\D/g, '').substring(0, 15),
      additional_info3: 'TAASH_BHATTI',
      additional_info4: 'NA',
      additional_info5: 'NA',
      additional_info6: 'NA',
      additional_info7: 'NA'
    },
    device: {
      init_channel: 'internet',
      ip: params.customerIp || '103.21.244.0',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      accept_header: 'text/html'
    }
  };

  try {
    const encryptedBody = await encryptAndSignJose(requestPayload, cfg);
    const traceId = `${cfg.mercid}${Date.now()}`.replace(/[^a-zA-Z0-9]/g, '').substring(0, 35);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const baseUrl = getBillDeskNeoApiBaseUrl();
    const endpointUrl = `${baseUrl}/payments/ve1_2/orders/create`;

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/jose',
        'Accept': 'application/jose',
        'BD-Traceid': traceId,
        'BD-Timestamp': timestamp
      },
      body: encryptedBody
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('BillDesk Neo Create Order HTTP error:', response.status, responseText);
      return {
        success: false,
        orderId: params.orderId,
        error: `BillDesk API error (${response.status}): ${responseText.substring(0, 200)}`
      };
    }

    // Decrypt response
    const orderData = await verifyAndDecryptJose(responseText, cfg);
    console.log('[BillDesk Neo] Order Created:', orderData.orderid, 'BD Order ID:', orderData.bdorderid, 'Status:', orderData.status);

    // Extract redirect details
    const redirectLink = (orderData.links || []).find((l: any) => l.rel === 'redirect' || l.method === 'POST');

    return {
      success: true,
      orderId: orderData.orderid || params.orderId,
      bdorderid: orderData.bdorderid,
      redirectUrl: redirectLink?.href,
      redirectParams: redirectLink?.parameters || {
        mercid: cfg.mercid,
        bdorderid: orderData.bdorderid
      },
      rawResponse: orderData
    };
  } catch (err: any) {
    console.error('Error creating BillDesk Neo order:', err);
    return {
      success: false,
      orderId: params.orderId,
      error: err.message || 'Failed to create BillDesk Neo order'
    };
  }
}

/**
 * Retrieve a transaction's real-time status from BillDesk Neo
 */
export async function retrieveBillDeskNeoTransaction(orderId: string): Promise<BillDeskNeoTransactionResponse | null> {
  const cfg = getBillDeskNeoConfig();
  if (!isBillDeskNeoConfigured()) return null;

  try {
    const requestPayload = {
      mercid: cfg.mercid,
      orderid: orderId
    };

    const encryptedBody = await encryptAndSignJose(requestPayload, cfg);
    const traceId = `Q${cfg.mercid}${Date.now()}`.replace(/[^a-zA-Z0-9]/g, '').substring(0, 35);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const baseUrl = getBillDeskNeoApiBaseUrl();
    const endpointUrl = `${baseUrl}/payments/ve1_2/transactions/get`;

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/jose',
        'Accept': 'application/jose',
        'BD-Traceid': traceId,
        'BD-Timestamp': timestamp
      },
      body: encryptedBody
    });

    if (!response.ok) {
      console.warn('BillDesk Retrieve Transaction HTTP error:', response.status);
      return null;
    }

    const responseText = await response.text();
    const data = await verifyAndDecryptJose(responseText, cfg);
    return {
      objectid: data.objectid,
      mercid: data.mercid,
      transaction_date: data.transaction_date,
      payment_method_type: data.payment_method_type,
      amount: data.amount,
      orderid: data.orderid,
      transaction_error_type: data.transaction_error_type,
      transactionid: data.transactionid,
      auth_status: data.auth_status,
      transaction_error_desc: data.transaction_error_desc,
      bankid: data.bankid,
      bank_ref_no: data.bank_ref_no,
      additional_info: data.additional_info,
      raw: data
    };
  } catch (err) {
    console.error('Error retrieving BillDesk Neo transaction:', err);
    return null;
  }
}
