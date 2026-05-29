// Entry point for the Placement CRM backend
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const adminRoutes = require('./routes/adminRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const contactRoutes = require('./routes/contactRoutes');

const app = express();

// Connect to MongoDB
connectDB();

// CORS — browsers send Origin without a trailing slash (e.g. https://www.dreamsakar.com)
const normalizeOrigin = (value) =>
  String(value || '')
    .trim()
    .replace(/\/+$/, '');

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.USER_FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://janvipatidar-adminfrontend.vercel.app',
  'https://www.dreamsakar.com',
  'https://dreamsakar.com'
]
  .map(normalizeOrigin)
  .filter(Boolean);

const isOriginAllowed = (origin) => {
  const normalized = normalizeOrigin(origin);
  return allowedOrigins.includes(normalized);
};

app.use(
  cors({
    origin(origin, callback) {
      // Server-to-server / curl (no Origin header)
      if (!origin) return callback(null, true);

      if (isOriginAllowed(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      console.warn('CORS blocked origin:', origin);
      // Use false (not Error) — Error becomes 500 on OPTIONS preflight
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type']
  })
);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads (resumes, etc.)
app.use('/uploads', express.static('uploads'));

// Health check (Render uses this kind of endpoint to verify deployments)
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'placement-crm-api' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/contact', contactRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
