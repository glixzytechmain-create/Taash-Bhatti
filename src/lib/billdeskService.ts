/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';

export interface BillDeskConfig {
  merchantId: string;
  securityId: string;
  checksumKey: string;
  clientId?: string;
  env: 'uat' | 'production';
  returnUrl: string;
}

export interface BillDeskOrderInitiateParams {
  orderId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  returnUrl?: string;
}

export interface BillDeskInitiateResult {
  success: boolean;
  pgUrl: string;
  pgPayload: {
    msg: string;
    hidApiKey?: string;
  };
  orderId: string;
  amount: string;
  error?: string;
}

export interface BillDeskParsedResponse {
  isValidChecksum: boolean;
  isSuccess: boolean;
  orderId: string;
  txnReferenceNo: string;
  bankReferenceNo: string;
  amount: number;
  authStatus: string; // "0300" = SUCCESS
  paymentMethod: string;
  bankId?: string;
  errorDescription?: string;
  rawFields: string[];
}

/**
 * Read configuration from environment variables
 */
export function getBillDeskConfig(): BillDeskConfig {
  return {
    merchantId: (process.env.BILLDESK_MERCHANT_ID || '').trim(),
    securityId: (process.env.BILLDESK_SECURITY_ID || '').trim(),
    checksumKey: (process.env.BILLDESK_CHECKSUM_KEY || '').trim(),
    clientId: (process.env.BILLDESK_CLIENT_ID || '').trim(),
    env: (process.env.BILLDESK_ENV === 'uat') ? 'uat' : 'production',
    returnUrl: (process.env.BILLDESK_RETURN_URL || 'https://taashbhatti.com/api/payment/billdesk/callback').trim()
  };
}

/**
 * Check if live credentials have been supplied
 */
export function isBillDeskConfigured(): boolean {
  const config = getBillDeskConfig();
  return Boolean(config.merchantId && config.checksumKey && config.securityId);
}

/**
 * Return official BillDesk hosted gateway URL depending on environment
 */
export function getBillDeskGatewayUrl(): string {
  const config = getBillDeskConfig();
  if (config.env === 'uat') {
    return 'https://uat.billdesk.com/pgidsk/PGIMerchantPayment';
  }
  return 'https://pgi.billdesk.com/pgidsk/PGIMerchantPayment';
}

/**
 * Compute uppercase HMAC-SHA256 signature for BillDesk
 */
export function computeBillDeskChecksum(data: string, secretKey: string): string {
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(data);
  return hmac.digest('hex').toUpperCase();
}

/**
 * Build official BillDesk payment request parameter (`msg`)
 * Format:
 * MerchantID|CustomerID|NA|TxnAmount|NA|NA|NA|Currency|NA|Type|SecurityID|NA|NA|Type|AdditionalInfo1|AdditionalInfo2|AdditionalInfo3|NA|NA|NA|NA|ReturnURL|Checksum
 */
export function buildBillDeskPaymentRequest(params: BillDeskOrderInitiateParams): BillDeskInitiateResult {
  const config = getBillDeskConfig();
  if (!config.merchantId || !config.checksumKey) {
    return {
      success: false,
      pgUrl: '',
      pgPayload: { msg: '' },
      orderId: params.orderId,
      amount: params.amount.toFixed(2),
      error: 'BillDesk Merchant Credentials (BILLDESK_MERCHANT_ID and BILLDESK_CHECKSUM_KEY) are not configured in environment.'
    };
  }

  const formattedAmount = params.amount.toFixed(2);
  const effectiveReturnUrl = params.returnUrl || config.returnUrl;
  const customerId = (params.customerPhone ? params.customerPhone.replace(/\D/g, '') : params.orderId) || 'CUST';
  const cleanCustomerName = (params.customerName || 'Patron').replace(/\|/g, '').substring(0, 50);
  const cleanCustomerPhone = (params.customerPhone || '').replace(/\D/g, '').substring(0, 15);

  // BillDesk Pipe Delimited Request String preceding Checksum
  const messageParts = [
    config.merchantId,                  // 1. MerchantID
    customerId,                         // 2. CustomerID / Unique reference
    'NA',                               // 3. Filler
    formattedAmount,                    // 4. TxnAmount (e.g. 349.00)
    'NA',                               // 5. BankID (NA for multi-option gateway)
    'NA',                               // 6. Filler
    'NA',                               // 7. Filler
    'INR',                              // 8. CurrencyType (INR)
    'NA',                               // 9. ItemCode
    'R',                                // 10. TypeField1 ('R')
    config.securityId || 'NA',          // 11. SecurityID
    'NA',                               // 12. Filler
    'NA',                               // 13. Filler
    'F',                                // 14. TypeField2 ('F')
    cleanCustomerName,                  // 15. AdditionalInfo1 (Customer Name)
    cleanCustomerPhone,                 // 16. AdditionalInfo2 (Customer Phone)
    params.orderId,                     // 17. AdditionalInfo3 (Taash Bhatti Internal Order ID)
    'NA',                               // 18. AdditionalInfo4
    'NA',                               // 19. AdditionalInfo5
    'NA',                               // 20. AdditionalInfo6
    'NA',                               // 21. AdditionalInfo7
    effectiveReturnUrl                  // 22. ReturnURL
  ];

  const preChecksumString = messageParts.join('|');
  const checksum = computeBillDeskChecksum(preChecksumString, config.checksumKey);
  const fullMsg = `${preChecksumString}|${checksum}`;

  return {
    success: true,
    pgUrl: getBillDeskGatewayUrl(),
    pgPayload: {
      msg: fullMsg
    },
    orderId: params.orderId,
    amount: formattedAmount
  };
}

/**
 * Verify BillDesk response payload and parse transaction result
 * BillDesk Response Structure:
 * MerchantID|CustomerID|TxnReferenceNo|BankReferenceNo|TxnAmount|BankID|BIN|TxnType|CurrencyName|ItemCode|SecurityType|SecurityID|SecurityPassword|TxnDate|AuthStatus|SettlementType|AdditionalInfo1|AdditionalInfo2|AdditionalInfo3|AdditionalInfo4|AdditionalInfo5|ErrorStatus|ErrorDescription|Checksum
 */
export function verifyAndParseBillDeskResponse(responseMsg: string): BillDeskParsedResponse {
  const config = getBillDeskConfig();
  if (!responseMsg || typeof responseMsg !== 'string') {
    return {
      isValidChecksum: false,
      isSuccess: false,
      orderId: '',
      txnReferenceNo: '',
      bankReferenceNo: '',
      amount: 0,
      authStatus: '',
      paymentMethod: '',
      errorDescription: 'Empty or invalid response message from BillDesk',
      rawFields: []
    };
  }

  const fields = responseMsg.trim().split('|');
  if (fields.length < 24) {
    return {
      isValidChecksum: false,
      isSuccess: false,
      orderId: fields[16] || fields[1] || '',
      txnReferenceNo: fields[2] || '',
      bankReferenceNo: fields[3] || '',
      amount: parseFloat(fields[4]) || 0,
      authStatus: fields[14] || '',
      paymentMethod: fields[7] || '',
      errorDescription: `Incomplete response fields (${fields.length} of 24 received)`,
      rawFields: fields
    };
  }

  // Extract components
  const receivedChecksum = fields[fields.length - 1];
  const payloadToVerify = fields.slice(0, fields.length - 1).join('|');

  // Verify HMAC-SHA256 signature if checksum key configured
  let isValidChecksum = true;
  if (config.checksumKey) {
    const calculatedChecksum = computeBillDeskChecksum(payloadToVerify, config.checksumKey);
    isValidChecksum = (receivedChecksum.toUpperCase() === calculatedChecksum.toUpperCase());
  }

  const txnReferenceNo = fields[2] || '';
  const bankReferenceNo = fields[3] || '';
  const amount = parseFloat(fields[4]) || 0;
  const bankId = fields[5] || '';
  const txnType = fields[7] || ''; // e.g. 'UPI', 'NB', 'CC', 'DC'
  const authStatus = fields[14] || '';
  const orderId = fields[16] || fields[1] || ''; // AdditionalInfo3 stores orderId, fallback to CustomerID
  const errorStatus = fields[21] || '';
  const errorDescription = fields[22] || (authStatus === '0300' ? 'Success' : 'Transaction Declined');

  // AuthStatus 0300 denotes SUCCESS in BillDesk
  const isSuccess = isValidChecksum && authStatus === '0300';

  return {
    isValidChecksum,
    isSuccess,
    orderId,
    txnReferenceNo,
    bankReferenceNo,
    amount,
    authStatus,
    paymentMethod: txnType || (bankId ? `NetBanking (${bankId})` : 'Online Payment'),
    bankId,
    errorDescription: isSuccess ? 'Transaction Successful' : `${errorStatus} - ${errorDescription}`.trim(),
    rawFields: fields
  };
}
