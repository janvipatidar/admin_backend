// Run this script once to create the initial admin user.
// Usage: node seedAdmin.js
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

    const email = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com')
      .toLowerCase()
      .trim();
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@12345';

    const existing = await Admin.findOne({ email });
    if (existing) {
      console.log(`Admin already exists: ${email}`);
      process.exit(0);
    }

    const hashed = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      email,
      password: hashed,
      role: 'super_admin'
    });

    console.log('Admin created:');
    console.log('  email:   ', admin.email);
    console.log('  password:', password);
    console.log('Change the password from the database or via your own UI.');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
};

run();
