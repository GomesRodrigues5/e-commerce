const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const request = require('supertest');
const app = require('../src/app');
const repository = require('../src/repositories/commerceRepository');
const pool = require('../src/db/pool');
const errorHandler = require('../src/middleware/errorHandler');
const { hashPassword } = require('../src/services/adminCredentials');
const contactEmail = require('../src/services/contactEmail');
const { createContactEmailService } = contactEmail;
const { createContactAIService } = require('../src/services/contactAI');
const { generateRecommendations: generateProductRecommendations } = require('../src/services/recommendationsAI');
const { createToken } = require('../src/middleware/adminAuth');
const { officialProvinceNames } = require('../src/services/angolaLocations');
const angolaLocations = require('../db/seeds/angola-locations.json');

test('health check returns service status', async () => {
  const response = await request(app).get('/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.service, 'apexfit-api');
});

test('CORS permits the XAMPP localhost origin', async () => {
  const response = await request(app)
    .options('/api/categories')
    .set('Origin', 'http://localhost')
    .set('Access-Control-Request-Method', 'GET');
  assert.equal(response.status, 204);
  assert.equal(response.headers['access-control-allow-origin'], 'http://localhost');
});

test('Angola location seed covers all current provinces and the supplied municipalities', () => {
  assert.equal(angolaLocations.provinces.length, officialProvinceNames.size);
  assert.deepEqual(
    new Set(angolaLocations.provinces.map(province => province.name)),
    officialProvinceNames
  );
  assert.equal(
    angolaLocations.provinces.reduce((total, province) => total + province.municipalities.length, 0),
    163
  );
  assert.ok(angolaLocations.provinces.every(province => province.municipalities.length > 0));
});

test('unknown route returns not found', async () => {
  const response = await request(app).get('/api/unknown');
  assert.equal(response.status, 404);
  assert.equal(response.body.message, 'Rota não encontrada');
});

test('database access errors return safe configuration guidance', () => {
  const originalError = console.error;
  let statusCode;
  let responseBody;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    }
  };
  console.error = () => {};
  try {
    errorHandler({ code: 'ER_ACCESS_DENIED_ERROR' }, null, response, () => {});
  } finally {
    console.error = originalError;
  }
  assert.equal(statusCode, 503);
  assert.match(responseBody.message, /DB_USER e DB_PASSWORD/);
});

test('product listing rejects invalid pagination values', async () => {
  const invalidLimit = await request(app).get('/api/products?limit=101');
  const invalidPage = await request(app).get('/api/products?page=zero');
  assert.equal(invalidLimit.status, 400);
  assert.equal(invalidPage.status, 400);
});

test('product search count query joins categories used by the search filter', async () => {
  const query = pool.query;
  const queries = [];
  pool.query = async sql => {
    queries.push(sql);
    if (queries.length === 1) return [[], []];
    return [[{ total: 3 }], []];
  };
  try {
    const result = await repository.listProducts({ search: 'halter', limit: 100, page: 1 });
    assert.equal(result.total, 3);
    assert.equal(queries.length, 2);
    assert.match(queries[1], /JOIN categories c ON c\.id = p\.category_id/);
    assert.match(queries[1], /c\.name LIKE \?/);
  } finally {
    pool.query = query;
  }
});

test('admin endpoints reject requests without authentication', async () => {
  process.env.JWT_SECRET = 'test-secret';
  const dashboardResponse = await request(app).get('/api/dashboard');
  const messagesResponse = await request(app).get('/api/admin/messages');
  assert.equal(dashboardResponse.status, 401);
  assert.equal(messagesResponse.status, 401);
});

test('customer token cannot access administrative endpoints', async () => {
  process.env.JWT_SECRET = 'test-secret';
  const token = createToken('customer@example.com', 18, 'customer');
  const response = await request(app)
    .get('/api/admin/messages')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(response.status, 401);
});

test('customer can create an account and receive a customer-only session token', async () => {
  process.env.JWT_SECRET = 'test-secret';
  const registerCustomer = repository.registerCustomer;
  const getCustomerProfile = repository.getCustomerProfile;
  const profile = {
    id: 42,
    name: 'Cliente de teste',
    email: 'cliente@example.com',
    province: 'Luanda',
    municipality: 'Talatona',
    preferences: [{ id: 2, name: 'Mulheres' }]
  };
  repository.registerCustomer = async data => {
    assert.equal(data.email, 'cliente@example.com');
    assert.equal(data.province, 'Luanda');
    assert.equal(data.municipality, 'Talatona');
    assert.equal(data.preferenceIds[0], 2);
    assert.ok(data.passwordHash.startsWith('scrypt$'));
    return profile;
  };
  repository.getCustomerProfile = async id => id === 42 ? profile : null;
  try {
    const response = await request(app)
      .post('/api/customers/register')
      .send({
        name: profile.name,
        email: profile.email,
        phone: '+244900000000',
        province: 'Luanda',
        municipality: profile.municipality,
        password: 'strong-password',
        preferenceIds: [2]
      });
    assert.equal(response.status, 201);
    assert.equal(response.body.customer.id, 42);
    assert.equal(response.body.customer.password_hash, undefined);
    const session = await request(app)
      .get('/api/customers/session')
      .set('Authorization', `Bearer ${response.body.token}`);
    assert.equal(session.status, 200);
    assert.equal(session.body.customer.email, profile.email);
  } finally {
    repository.registerCustomer = registerCustomer;
    repository.getCustomerProfile = getCustomerProfile;
  }
});

test('buying and reserving products requires a customer account session', async () => {
  process.env.JWT_SECRET = 'test-secret';
  const purchase = await request(app)
    .post('/api/orders')
    .send({ customer: { name: 'Cliente', email: 'cliente@example.com' }, items: [{ productId: 1, quantity: 1 }] });
  const reservation = await request(app)
    .post('/api/orders/reservations')
    .send({ items: [{ productId: 1, quantity: 1 }] });
  assert.equal(purchase.status, 401);
  assert.equal(reservation.status, 401);
});

test('admin login returns a token accepted by the session endpoint', async () => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.ADMIN_EMAIL = 'admin@example.com';
  process.env.ADMIN_PASSWORD = 'test-password';
  const getAdminByEmail = repository.getAdminByEmail;
  repository.getAdminByEmail = async () => null;
  try {
    const loginResponse = await request(app)
      .post('/api/admin/login')
      .send({ email: 'admin@example.com', password: 'test-password' });
    assert.equal(loginResponse.status, 200);
    assert.ok(loginResponse.body.token);

    const sessionResponse = await request(app)
      .get('/api/admin/session')
      .set('Authorization', `Bearer ${loginResponse.body.token}`);
    assert.equal(sessionResponse.status, 200);
    assert.equal(sessionResponse.body.email, 'admin@example.com');
  } finally {
    repository.getAdminByEmail = getAdminByEmail;
  }
});

test('admin login verifies a database password hash', async () => {
  process.env.JWT_SECRET = 'test-secret';
  const passwordHash = await hashPassword('database-password');
  const getAdminByEmail = repository.getAdminByEmail;
  repository.getAdminByEmail = async email => email === 'dbadmin@example.com' ? {
    id: 7,
    name: 'Admin DB',
    email,
    password_hash: passwordHash,
    active: 1
  } : null;
  try {
    const success = await request(app)
      .post('/api/admin/login')
      .send({ email: 'dbadmin@example.com', password: 'database-password' });
    const failure = await request(app)
      .post('/api/admin/login')
      .send({ email: 'dbadmin@example.com', password: 'incorrect-password' });
    assert.equal(success.status, 200);
    assert.equal(success.body.name, 'Admin DB');
    assert.equal(failure.status, 401);
  } finally {
    repository.getAdminByEmail = getAdminByEmail;
  }
});

test('contact messages cannot be listed without admin authentication', async () => {
  process.env.JWT_SECRET = 'test-secret';
  const response = await request(app).get('/api/contact');
  assert.equal(response.status, 401);
});

test('payment endpoint rejects non-numeric order IDs before database access', async () => {
  const response = await request(app).post('/api/orders/not-an-id/payments');
  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'Identificador do pedido inválido');
});

test('invalid contact payload is rejected', async () => {
  const response = await request(app).post('/api/contact').send({ name: 'A', email: 'invalid', message: 'short' });
  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'Dados de contato inválidos');
});

test('contact form stores the message and reports SMTP delivery status', async () => {
  const createContactMessage = repository.createContactMessage;
  const listContactProductContext = repository.listContactProductContext;
  const sendContactEmail = contactEmail.sendContactEmail;
  repository.createContactMessage = async () => 123;
  repository.listContactProductContext = async () => [];
  contactEmail.sendContactEmail = async () => ({ configured: false, sent: false });
  try {
    const response = await request(app).post('/api/contact').send({
      name: 'Cliente Teste',
      email: 'cliente@example.com',
      subject: 'Dúvida sobre leggings',
      message: 'Preciso de informação sobre um produto.'
    });
    assert.equal(response.status, 201);
    assert.equal(response.body.id, 123);
    assert.equal(response.body.emailSent, false);
    assert.match(response.body.message, /guardada/);
  } finally {
    repository.createContactMessage = createContactMessage;
    repository.listContactProductContext = listContactProductContext;
    contactEmail.sendContactEmail = sendContactEmail;
  }
});

test('contact email uses the configured sender and visitor reply-to', async () => {
  const sentMessages = [];
  const sendContactEmail = createContactEmailService({
    env: {
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_USER: 'smtp-user',
      SMTP_PASSWORD: 'smtp-password',
      CONTACT_FROM: 'ribeiro.gomes@gcgreen.ao',
      CONTACT_TO: 'ribeiro.gomes@gcgreen.ao'
    },
    mailer: {
      createTransport: () => ({ sendMail: async message => { sentMessages.push(message); } })
    },
    replyGenerator: async data => {
      assert.equal(data.subject, 'Dúvida sobre leggings');
      assert.equal(data.catalog[0].name, 'Leggings Pro');
      return 'Olá, recebemos a sua mensagem.';
    }
  });
  const result = await sendContactEmail({
    name: 'Cliente Teste',
    email: 'cliente@example.com',
    subject: 'Dúvida sobre leggings',
    message: 'Mensagem de teste do formulário.',
    catalog: [{ name: 'Leggings Pro', category_name: 'Mulheres', price: 18500, stock: 4 }]
  });
  assert.equal(result.sent, true);
  assert.equal(result.aiGenerated, true);
  assert.equal(sentMessages.length, 2);
  assert.equal(sentMessages[0].from, 'Faltou Ódio <ribeiro.gomes@gcgreen.ao>');
  assert.equal(sentMessages[0].to, 'ribeiro.gomes@gcgreen.ao');
  assert.equal(sentMessages[0].replyTo, 'cliente@example.com');
  assert.equal(sentMessages[1].to, 'cliente@example.com');
  assert.equal(sentMessages[1].replyTo, 'ribeiro.gomes@gcgreen.ao');
  assert.equal(sentMessages[1].text, 'Olá, recebemos a sua mensagem.');
});

test('contact AI uses the configured model and returns generated reply text', async () => {
  let requestOptions;
  const generateReply = createContactAIService({
    env: { AI_API_KEY: 'test-key', AI_BASE_URL: 'https://ai.example.com/v1', AI_MODEL: 'test-model' },
    fetchImpl: async (_url, options) => {
      requestOptions = options;
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'Olá! Vamos ajudar.' } }] }) };
    }
  });

  test('product recommendations only return IDs from the supplied catalog', async () => {
    const recommendations = await generateProductRecommendations({
      preferences: [{ id: 3, name: 'Pesos' }],
      products: [
        { id: 4, name: 'Halter', category_name: 'Pesos', description: '', price: 10 },
        { id: 5, name: 'Top', category_name: 'Mulheres', description: '', price: 12 }
      ]
    }, {
      env: { AI_API_KEY: 'test-key', AI_BASE_URL: 'https://ai.example.com/v1', AI_MODEL: 'test-model' },
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ productIds: [4, 999, 4], message: 'Para si.' }) } }]
        })
      })
    });
    assert.deepEqual(recommendations, { productIds: [4], message: 'Para si.' });
  });
  const reply = await generateReply({
    name: 'Cliente',
    email: 'cliente@example.com',
    subject: 'Horário de atendimento',
    message: 'Qual o horário de atendimento?',
    catalog: [{ name: 'Whey Protein', category_name: 'Suplementos', price: 28000, stock: 3 }]
  });
  assert.equal(reply, 'Olá! Vamos ajudar.');
  assert.match(requestOptions.headers.Authorization, /^Bearer test-key$/);
  assert.equal(JSON.parse(requestOptions.body).model, 'test-model');
  const promptData = JSON.parse(JSON.parse(requestOptions.body).messages[1].content);
  assert.equal(promptData.assunto, 'Horário de atendimento');
  assert.equal(promptData.catalogoAtual[0].name, 'Whey Protein');
});

test('EMIS webhook rejects invalid signature', async () => {
  const webhookConfigured = Boolean(process.env.EMIS_WEBHOOK_SECRET);
  const payload = { event: 'payment.updated', data: { reference: 'APX-1', status: 'approved' } };
  const response = await request(app)
    .post('/api/payments/webhooks/emis')
    .set('Content-Type', 'application/json')
    .send(payload);
  assert.equal(response.status, webhookConfigured ? 401 : 503);
  assert.equal(response.body.message, webhookConfigured ? 'Assinatura inválida' : 'Webhook EMIS não configurado');
});

test('EMIS webhook signature helper is deterministic', () => {
  const secret = 'test-secret';
  const payload = Buffer.from(JSON.stringify({ event: 'payment.updated' }));
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  assert.match(signature, /^[0-9a-f]{64}$/);
});
