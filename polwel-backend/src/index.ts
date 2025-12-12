import express from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file only (best practice)
dotenv.config({ override: true });

const NODE_ENV = process.env.NODE_ENV || 'development';

console.log(`🌍 Environment: ${NODE_ENV}`);
console.log(`📁 Config file: .env`);
console.log(`🔧 CORS_ORIGINS env var:`, process.env.CORS_ORIGINS);
console.log(`🔧 FRONTEND_URL env var:`, process.env.FRONTEND_URL);
console.log(`🔧 DATABASE_URL env var:`, process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@')); // Hide password

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import courseRoutes from './routes/courses';
import courseRunsRoutes from './routes/courseRuns';
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
import trainerDashboardRoutes from './routes/trainerDashboard';
import profileRoutes from './routes/profile';
import billingReportsRoutes from './routes/billingReports';
import waiverRoutes from './routes/waivers';
import { startCourseRunStatusJob, evaluateCourseRunStatusesNow } from './jobs/courseRunStatusJob';
import dashboardRoutes from './routes/dashboard';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { authenticate } from './middleware/auth';
import { apiLogger, errorLogger } from './middleware/logging';

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting - disabled for localhost/development, enabled for production
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || (NODE_ENV === 'development' ? '10000' : '100')), // Very high limit in dev
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and localhost in development
    if (req.path === '/health') return true;
    
    // Skip rate limiting for localhost requests in development
    if (NODE_ENV === 'development') {
      const ip = req.ip || req.socket.remoteAddress || '';
      if (ip.includes('127.0.0.1') || ip.includes('::1') || ip.includes('localhost')) {
        return true;
      }
    }
    
    return false;
  },
});

// CORS configuration8081
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'https://polwel-pdms.customized3.corsivalab.xyz,http://localhost:8080')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

console.log('🔐 CORS configured for origins:', allowedOrigins);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    console.log('🔍 CORS check for origin:', origin);
    console.log('📋 Current allowed origins:', allowedOrigins);
    
    // Allow requests with no origin (like mobile apps, curl, or same-origin requests)
    if (!origin) {
      console.log('✅ Allowing request with no origin');
      return callback(null, true);
    }
    
    // Allow configured origins (exact match)
    if (allowedOrigins.includes(origin)) {
      console.log('✅ Origin found in allowed list (exact match)');
      return callback(null, true);
    }
    
    // Allow both HTTP and HTTPS versions of configured domains
    const originWithoutProtocol = origin.replace(/^https?:\/\//, '');
    const allowedDomains = allowedOrigins.map(o => o.replace(/^https?:\/\//, ''));
    if (allowedDomains.includes(originWithoutProtocol)) {
      console.log('✅ Origin found in allowed list (protocol flexible match)');
      return callback(null, true);
    }
    
    // Allow any localhost origin in dev and staging
    if (origin.startsWith('http://localhost') || origin.startsWith('https://localhost') || 
        origin.startsWith('http://127.0.0.1') || origin.startsWith('https://127.0.0.1')) {
      console.log('✅ Allowing localhost origin');
      return callback(null, true);
    }
    
    // In staging/production, be more permissive with the main domain
    const currentEnv = process.env.NODE_ENV || 'development';
    if (currentEnv !== 'development') {
      // Check if origin matches any part of allowed domains (for subdomains, etc)
      const isAllowedDomain = allowedDomains.some(domain => 
        originWithoutProtocol.includes(domain) || domain.includes(originWithoutProtocol)
      );
      if (isAllowedDomain) {
        console.log('✅ Origin matches allowed domain pattern');
        return callback(null, true);
      }
    }
    
    console.error('❌ CORS blocked origin:', origin);
    console.error('📋 Allowed origins:', allowedOrigins);
    console.error('🌐 Environment:', currentEnv);
    return callback(new Error(`CORS policy violation: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // Cache preflight requests for 24 hours
  optionsSuccessStatus: 200,
};

// Middleware
// Configure Helmet with lenient settings to avoid blocking legitimate requests
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP if causing issues, can be enabled later with proper policy
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  noSniff: true,
  xssFilter: true,
}));
app.use(limiter);

// CORS must be applied before other middleware
app.use(cors(corsOptions));

// Handle preflight requests - don't use app.options('*') as it causes routing errors
// The cors() middleware handles OPTIONS requests automatically

app.use(apiLogger); // Add comprehensive API logging
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

console.log(`📁 Static uploads directory configured: ${uploadsPath}`);

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
app.use('/api/course-runs', courseRunsRoutes);
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
app.use('/api/trainer', trainerDashboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/billing-reports', billingReportsRoutes);
app.use('/api/waivers', waiverRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling middleware
app.use(errorLogger); // Add error logging before error handlers
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = () => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 POLWEL API Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`⚠️  Database connection will be established after Prisma setup`);

    evaluateCourseRunStatusesNow().catch((error) => {
      console.error('Immediate course run status evaluation failed on startup:', error);
    });

    startCourseRunStatusJob();
  });

  // Configure server timeouts to prevent connection drops
  // Keep-alive timeout should be longer than the client's timeout
  server.keepAliveTimeout = 65000; // 65 seconds
  server.headersTimeout = 66000; // 66 seconds (must be longer than keepAliveTimeout)
  
  console.log('⏱️  Server timeouts configured: keepAlive=65s, headers=66s');
};

startServer();

export default app;
