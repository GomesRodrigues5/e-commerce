const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const productsRoutes = require('./routes/products');
const categoriesRoutes = require('./routes/categories');
const ordersRoutes = require('./routes/orders');
const reviewsRoutes = require('./routes/reviews');
const contactRoutes = require('./routes/contact');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const customerRoutes = require('./routes/customers');
const advertisementRoutes = require('./routes/advertisements');
const uploadRoutes = require('./routes/uploads');
const errorHandler = require('./middleware/errorHandler');
const { handleEmisWebhook } = require('./payments/emisWebhook');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5500,http://127.0.0.1:5500,http://localhost,http://127.0.0.1')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

function isDevelopmentOrigin(origin) {
  if (process.env.NODE_ENV === 'production') return false;
  try {
    const { hostname, protocol } = new URL(origin);
    return ['http:', 'https:'].includes(protocol) &&
      ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
  } catch {
    return false;
  }
}

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || isDevelopmentOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origem não permitida pela política CORS'));
  },
  credentials: true
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api/payments/webhooks/emis', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'apexfit-api' }));
app.use('/api/products', apiLimiter, productsRoutes);
app.use('/api/categories', apiLimiter, categoriesRoutes);
app.use('/api/orders', apiLimiter, ordersRoutes);
app.use('/api/reviews', apiLimiter, reviewsRoutes);
app.use('/api/contact', apiLimiter, contactRoutes);
app.use('/api/dashboard', apiLimiter, dashboardRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/customers', apiLimiter, customerRoutes);
app.use('/api/advertisements', apiLimiter, advertisementRoutes);
app.use('/api/admin/uploads', apiLimiter, uploadRoutes);
app.use('/uploads', express.static(require('node:path').join(__dirname, '..', 'public', 'uploads'), {
  dotfiles: 'deny',
  index: false,
  maxAge: '7d'
}));
app.post('/api/payments/webhooks/emis', handleEmisWebhook);

app.use((_req, res) => res.status(404).json({ message: 'Rota não encontrada' }));
app.use(errorHandler);

module.exports = app;
