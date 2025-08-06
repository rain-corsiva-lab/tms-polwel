import express from 'express';
import cors from 'cors';
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
import clientOrganizationsRoutes from './routes/clientOrganizations';

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

// Middleware
app.use(helmet());
app.use(limiter);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
}));
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
app.use('/api/client-organizations', clientOrganizationsRoutes);

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
