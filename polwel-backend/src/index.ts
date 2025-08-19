import express from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = `.env.${NODE_ENV}`;

// Try to load environment-specific file first, then fallback to .env
dotenv.config({ path: path.resolve(process.cwd(), envFile) });
dotenv.config(); // Fallback to .env

console.log(`🌍 Environment: ${NODE_ENV}`);
console.log(`📁 Config file: ${envFile}`);

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import courseRoutes from './routes/courses';
import venueRoutes from './routes/venues';
import bookingRoutes from './routes/bookings';
import organizationRoutes from './routes/organizations';
import polwelUsersRoutes from './routes/polwelUsers';
import trainersRoutes from './routes/trainers';
import partnersRoutes from './routes/partners';
import clientOrganizationsRoutes from './routes/clientOrganizations';
import passwordResetRoutes from './routes/passwordReset';
import userSetupRoutes from './routes/userSetup';
import referencesRoutes from './routes/references';
import trainerBlockoutsRoutes from './routes/trainerBlockouts';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { authenticate } from './middleware/auth';
// import { apiLogger, errorLogger } from './middleware/logging'; // Temporarily disabled due to module resolution issue

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'https://polwel-pdms.customized3.corsivalab.xyz,http://localhost:8080,http://localhost:8081')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

console.log('🔐 CORS configured for origins:', allowedOrigins);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or same-origin requests)
    if (!origin) return callback(null, true);
    
    // Allow configured origins (exact match)
    if (allowedOrigins.includes(origin)) return callback(null, true);
    
    // Allow both HTTP and HTTPS versions of configured domains
    const originWithoutProtocol = origin.replace(/^https?:\/\//, '');
    const allowedDomains = allowedOrigins.map(o => o.replace(/^https?:\/\//, ''));
    if (allowedDomains.includes(originWithoutProtocol)) return callback(null, true);
    
    // Allow any localhost origin in dev
    if (origin.startsWith('http://localhost') || origin.startsWith('https://localhost') || 
        origin.startsWith('http://127.0.0.1') || origin.startsWith('https://127.0.0.1')) {
      return callback(null, true);
    }
    
    console.error('❌ CORS blocked origin:', origin);
    console.error('📋 Allowed origins:', allowedOrigins);
    return callback(new Error(`CORS policy violation: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200, // Changed from 204 to 200 for better compatibility
};

// Middleware
app.use(helmet());
app.use(limiter);
app.use(cors(corsOptions));
// app.use(apiLogger); // Add comprehensive API logging - Temporarily disabled
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Handle preflight OPTIONS requests globally
// app.options('*', (req, res) => {
//   res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
//   res.header('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
//   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
//   res.header('Access-Control-Allow-Credentials', 'true');
//   res.sendStatus(200);
// });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'POLWEL Training Management System API',
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/courses', authenticate, courseRoutes);
app.use('/api/venues', authenticate, venueRoutes);
app.use('/api/bookings', authenticate, bookingRoutes);
app.use('/api/organizations', authenticate, organizationRoutes);
app.use('/api/polwel-users', polwelUsersRoutes);
app.use('/api/trainers', trainersRoutes);
app.use('/api/partners', partnersRoutes);
app.use('/api/client-organizations', clientOrganizationsRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/user-setup', userSetupRoutes);
app.use('/api/references', authenticate, referencesRoutes);
app.use('/api/trainer-blockouts', trainerBlockoutsRoutes);

// Error handling middleware
// app.use(errorLogger); // Add error logging before error handlers - Temporarily disabled
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = () => {
  app.listen(PORT, () => {
    console.log(`🚀 POLWEL API Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`⚠️  Database connection will be established after Prisma setup`);
  });
};

startServer();

export default app;
