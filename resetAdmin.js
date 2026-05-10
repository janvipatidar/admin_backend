// Resets the default admin's password (or creates the admin if missing).
// Usage: node resetAdmin.js
require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const Admin = require('./models/Admin');

const run = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('MONGO_URI is not set. Aborting.');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to:', process.env.MONGO_URI);

    const email = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com')
      .toLowerCase()
      .trim();
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@12345';
    const hashed = await bcrypt.hash(password, 10);

    const result = await Admin.findOneAndUpdate(
      { email },
      { email, password: hashed, role: 'super_admin' },
      { upsert: true, new: true }
    );

    console.log('Admin ready:');
    console.log('  email:    ', result.email);
    console.log('  password: ', password);
    process.exit(0);
  } catch (err) {
    console.error('Reset failed:', err);
    process.exit(1);
  }
};

run();
