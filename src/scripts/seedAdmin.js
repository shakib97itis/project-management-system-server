require('dotenv').config();
const bcrypt = require('bcryptjs');
const {connectDatabase} = require('../config/db');
const User = require('../models/User');

function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--email' && args[i + 1]) {
      options.email = args[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--email=')) {
      options.email = arg.split('=').slice(1).join('=');
      continue;
    }
    if (arg === '--password' && args[i + 1]) {
      options.password = args[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--password=')) {
      options.password = arg.split('=').slice(1).join('=');
      continue;
    }
    if (arg === '--name' && args[i + 1]) {
      options.name = args[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--name=')) {
      options.name = arg.split('=').slice(1).join('=');
      continue;
    }
  }
  return options;
}

async function seedAdminUser() {
  await connectDatabase(process.env.MONGO_URI);

  const defaults = {
    email: 'admin@example.com',
    password: 'Admin@123',
    name: 'Admin',
  };
  const options = parseArgs(process.argv.slice(2));
  const email = (options.email || defaults.email).toLowerCase();
  const name = options.name || defaults.name;
  const password = options.password || null;

  const existingUser = await User.findOne({email});
  if (existingUser) {
    if (options.name) {
      existingUser.name = options.name;
    }
    existingUser.role = 'ADMIN';
    existingUser.status = 'ACTIVE';
    if (password) {
      existingUser.password = await bcrypt.hash(password, 12);
    }
    await existingUser.save();
    console.log(`Recovered admin: ${email}`);
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(
    password || defaults.password,
    12,
  );

  await User.create({
    name,
    email,
    password: hashedPassword,
    role: 'ADMIN',
    status: 'ACTIVE',
    invitedAt: new Date(),
  });

  const seedPassword = password || defaults.password;
  console.log(`Seeded admin: ${email} / ${seedPassword}`);
  process.exit(0);
}

seedAdminUser().catch((error) => {
  console.error('Failed to seed admin user', error);
  process.exit(1);
});
