require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDatabase } = require('../config/db');
const User = require('../models/User');

async function seedAdminUser() {
  await connectDatabase(process.env.MONGO_URI);

  const email = 'admin@example.com';
  const exists = await User.findOne({email});
  if (exists) {
    console.log('Admin already exists');
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash('Admin@123', 12);

  await User.create({
    name: 'Admin',
    email,
    password: hashedPassword,
    role: 'ADMIN',
    status: 'ACTIVE',
    invitedAt: new Date(),
  });

  console.log('Seeded admin: admin@example.com / Admin@123');
  process.exit(0);
}

seedAdminUser().catch((error) => {
  console.error('Failed to seed admin user', error);
  process.exit(1);
});
