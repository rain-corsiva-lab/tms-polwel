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
import uploadsRoutes from './routes/uploads';
import { startCourseRunStatusJob, evaluateCourseRunStatusesNow } from './jobs/courseRunStatusJob';
import dashboardRoutes from './routes/dashboard';
import resourceLibraryRoutes from './routes/resourceLibrary';
import reportingRoutes from './routes/reporting';

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
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || (NODE_ENV === 'development' ? '10000' : '10000')), // Very high limit in dev
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

// Extract allowed domains (hostname only) for subdomain matching
const allowedDomains = allowedOrigins.map(o => {
  try {
    const url = new URL(o);
    return url.hostname;
  } catch {
    return null;
  }
}).filter(Boolean) as string[];

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    // SECURITY: Reject if origin contains spaces (prevents "https://tms.polwel.org.sg http://evil.com/")
    if (origin.includes(' ') || origin.includes('\t') || origin.includes('\n')) {
      return callback(new Error(`CORS policy violation: Invalid origin format`));
    }

    // 1. Exact match check (Recommended)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // 2. Check for localhost (should only be allowed in development)
    const isLocalhost = origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/);
    if (isLocalhost) {
      return callback(null, true);
    }

    // 3. To safely support subdomains (e.g., *.polwel.org.sg)
    // Instead of using .includes(), use regex to ensure the domain ends exactly as expected
    const isSubdomain = allowedDomains.some(domain => {
      // Escape dots to avoid regex errors, then match domain at the end of the string
      const escapedDomain = domain.replace(/\./g, '\\.');
      const regex = new RegExp(`^https?://([^/]+\\.)?${escapedDomain}$`);
      return regex.test(origin);
    });

    if (isSubdomain) {
      return callback(null, true);
    }

    return callback(new Error(`CORS policy violation`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // Cache preflight requests for 24 hours
  optionsSuccessStatus: 200,
};

// Middleware
// Configure Helmet with security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow inline scripts for React/Vite
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
      imgSrc: ["'self'", "data:", "https:"], // Allow images from self, data URIs, and HTTPS
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https:"], // Allow API calls to same origin and HTTPS
      frameSrc: ["'none'"], // Disable iframes
      objectSrc: ["'none'"], // Disable plugins
      upgradeInsecureRequests: [], // Upgrade HTTP to HTTPS
    },
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  noSniff: true,
  xssFilter: true,
}));

// Set Permissions-Policy header (not directly supported by Helmet v8)
app.use((req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), fullscreen=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()'
  );
  next();
});
app.use(limiter);

// CORS middleware - validation is done inside corsOptions
app.use(cors(corsOptions));

// Handle preflight requests - don't use app.options('*') as it causes routing errors
// The cors() middleware handles OPTIONS requests automatically

app.use(apiLogger); // Add comprehensive API logging
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timeout middleware - prevent hanging connections
app.use((req, res, next) => {
  // Set timeout to 30 seconds for all requests except file uploads
  const timeout = req.path.includes('/uploads') ? 120000 : 30000; // 2 min for uploads, 30s for others
  
  req.setTimeout(timeout, () => {
    console.error(`⏱️ Request timeout on ${req.method} ${req.path} after ${timeout}ms`);
    if (!res.headersSent) {
      res.status(408).json({
        error: 'Request timeout',
        message: 'The server took too long to respond. Please try again.',
        code: 'REQUEST_TIMEOUT'
      });
    }
  });
  
  res.setTimeout(timeout, () => {
    console.error(`⏱️ Response timeout on ${req.method} ${req.path} after ${timeout}ms`);
    if (!res.headersSent) {
      res.status(504).json({
        error: 'Gateway timeout',
        message: 'The server took too long to process your request. Please try again.',
        code: 'GATEWAY_TIMEOUT'
      });
    }
  });
  
  next();
});

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
app.use('/api/uploads', uploadsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/resource-library', resourceLibraryRoutes);
app.use('/api/reporting', reportingRoutes);

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
  
  // Handle server errors
  server.on('error', (error: any) => {
    console.error('🔴 Server error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
      process.exit(1);
    }
  });
};

// Global error handlers for uncaught errors
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('🔴 Unhandled Rejection at:', promise);
  console.error('🔴 Reason:', reason);
  // Don't exit process - log and continue
});

process.on('uncaughtException', (error: Error) => {
  console.error('🔴 Uncaught Exception:', error);
  console.error('🔴 Stack:', error.stack);
  // Log but don't exit - let PM2 handle restart if needed
});

startServer();

export default app;
