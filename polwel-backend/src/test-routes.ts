import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables from .env file only (best practice)
dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';

console.log(`🌍 Environment: ${NODE_ENV}`);
console.log(`📁 Config file: .env`);

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Try importing one route at a time to isolate the issue
try {
  console.log('Testing route imports...');
  
  // Test auth routes
  console.log('Importing auth routes...');
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes.default || authRoutes);
  console.log('✅ Auth routes imported successfully');
  
} catch (error) {
  console.error('❌ Error importing routes:', error);
}

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
});
