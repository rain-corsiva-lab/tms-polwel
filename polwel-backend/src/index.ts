import express from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:8080,http://localhost:8081')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl)
    if (!origin) return callback(null, true);
    // Allow configured origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any localhost origin in dev to avoid port mismatch during Vite port switching
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

// Middleware
app.use(helmet());
app.use(limiter);
app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
