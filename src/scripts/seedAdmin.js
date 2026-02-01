require('dotenv').config();
const bcrypt = require('bcryptjs');
const {connectDB} = require('../config/db');
const User = require('../models/User');

(async () => {
  await connectDB(process.env.MONGO_URI);

  const email = 'admin@example.com';
  const exists = await User.findOne({email});
  if (exists) {
    console.log('Admin already exists');
    process.exit(0);
  }

  const hashed = await bcrypt.hash('Admin@123', 12);

  await User.create({
    name: 'Admin',
    email,
    password: hashed,
    role: 'ADMIN',
    status: 'ACTIVE',
    invitedAt: new Date(),
  });

  console.log('Seeded admin: admin@example.com / Admin@123');
  process.exit(0);
})();
