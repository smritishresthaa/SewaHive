#!/usr/bin/env node
// scripts/createAdmin.js
// Run: node scripts/createAdmin.js

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function createAdmin() {
  try {
    console.log('🔐 Creating Admin Account...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Admin credentials (you can modify these)
    const adminEmail = 'admin@sewahive.com';
    const adminPassword = 'Admin@1234'; // Change this to your preferred password

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('⚠️  Admin already exists:', adminEmail);
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      process.exit(0);
    }

    // Hash password
    console.log('🔒 Hashing password...');
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    // Create admin user
    const admin = await User.create({
      email: adminEmail,
      passwordHash,
      role: 'admin',
      isVerified: true,
      isBlocked: false,
      isDeleted: false,
      profile: {
        name: 'Admin User',
        avatarUrl: '',
        gender: '',
        bio: '',
        address: {
          country: 'Nepal',
          city: 'Kathmandu',
          postalCode: '44600',
          area: 'Thamel',
        },
      },
      location: {
        type: 'Point',
        coordinates: [85.3240, 27.7172],
      },
    });

    console.log('\n✅ Admin Account Created Successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    ', adminEmail);
    console.log('🔐 Password: ', adminPassword);
    console.log('🔑 Role:     ', admin.role);
    console.log('🆔 ID:       ', admin._id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🌐 Admin Login URL:');
    console.log('   http://localhost:5174/admin/login');
    console.log('\n💡 Important: Change the password after first login!');

    await mongoose.disconnect();
    console.log('\n✅ Done!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createAdmin();
