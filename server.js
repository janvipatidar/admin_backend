// Entry point for the Placement CRM backend
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const adminRoutes = require('./routes/adminRoutes');
const candidateRoutes = require('./routes/candidateRoutes');

const app = express();

// Connect to MongoDB
connectDB();

// CORS - allow the configured client + common dev origins
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://janvipatidar-adminfrontend.vercel.app'
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow non-browser requests (no origin) and any whitelisted origin.
      // In production you may want to be stricter here.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    // Expose binary download headers so the browser passes them through to JS
    exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type']
  })
);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

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
