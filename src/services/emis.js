const https = require('node:https');
const http = require('node:http');
const { URL } = require('node:url');

class EmisPaymentError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'EmisPaymentError';
    this.statusCode = statusCode;
  }
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    const request = client.request({
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || undefined,
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.EMIS_API_KEY || ''}`,
        'X-Merchant-ID': process.env.EMIS_MERCHANT_ID || '',
        ...options.headers
      }
    }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        let parsed;
        try {
          parsed = body ? JSON.parse(body) : null;
        } catch {
          parsed = { raw: body };
        }
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(parsed);
          return;
        }
        reject(new EmisPaymentError(
          parsed?.message || parsed?.error || `EMIS respondeu com ${response.statusCode}`,
          response.statusCode
        ));
      });
    });
    request.setTimeout(15000, () => request.destroy(new EmisPaymentError('Tempo limite ao contactar o EMIS')));
    request.on('error', reject);
    if (options.body) request.write(JSON.stringify(options.body));
    request.end();
  });
}

class EmisService {
  constructor() {
    this.baseUrl = (process.env.EMIS_BASE_URL || 'https://api.emis.com.ao').replace(/\/$/, '');
    this.apiKey = process.env.EMIS_API_KEY || '';
    this.merchantId = process.env.EMIS_MERCHANT_ID || '';
  }

  async createPayment(order) {
    if (!this.apiKey || !this.merchantId) {
      throw new EmisPaymentError('EMIS não está configurada', 503);
    }

    const payload = {
      merchant_id: this.merchantId,
      reference: order.order_number,
      amount: Number(order.total),
      currency: 'AOA',
      description: `Pedido ${order.order_number}`,
      customer: {
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone
      },
      redirect_url: process.env.APP_URL || '',
      callback_url: process.env.EMIS_WEBHOOK_URL || `${process.env.APP_URL || 'http://localhost:3000'}${process.env.EMIS_WEBHOOK_PATH || '/api/payments/webhooks/emis'}`
    };

    const response = await requestJson(`${this.baseUrl}/api/v1/payments`, {
      method: 'POST',
      body: payload
    });
    const providerStatus = String(response.status || 'PENDING').toUpperCase();
    const status = ['APPROVED', 'PAID', 'SUCCESSFUL', 'COMPLETED'].includes(providerStatus) ? 'APPROVED'
      : ['FAILED', 'REFUNDED', 'CANCELLED'].includes(providerStatus) ? providerStatus : 'PENDING';

    return {
      transactionId: response.transaction_id || response.id || response.reference,
      reference: response.reference || response.transaction_id || response.id,
      redirectUrl: response.redirect_url || response.checkout_url || response.url,
      status,
      response
    };
  }

  async getPayment(transactionId) {
    const response = await requestJson(`${this.baseUrl}/api/v1/payments/${encodeURIComponent(transactionId)}`);
    return response;
  }
}

module.exports = { EmisService, EmisPaymentError };
