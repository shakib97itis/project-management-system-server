require('dotenv').config();
const app = require('./app');
const { connectDatabase } = require('./config/db');

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  await connectDatabase(process.env.MONGO_URI);
  app.listen(PORT, () => console.log(`Server running on :${PORT}`));
}

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
