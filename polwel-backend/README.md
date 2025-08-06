# POLWEL Backend Setup Guide

## Prerequisites
- Node.js 18+ installed
- PostgreSQL 13+ installed
- Git

## Installation Steps

### 1. PostgreSQL Installation

**Option A: Via Laragon (Recommended)**
1. Open Laragon
2. Right-click on Laragon tray icon → Tools → Quick add → PostgreSQL
3. Install and start PostgreSQL
4. Default credentials: postgres/password

**Option B: Standalone Installation**
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Install with default settings
3. Remember the password you set for the postgres user
4. Ensure PostgreSQL service is running

**Option C: Docker**
```bash
cd polwel-backend
docker-compose up -d
```

### 2. Database Setup

1. Create the database:
```sql
CREATE DATABASE polwel_training;
```

2. Update the `.env` file with your PostgreSQL credentials:
```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/polwel_training?schema=public"
```

### 3. Run Database Migrations

```bash
# Generate Prisma client
npm run db:generate

# Run migrations to create tables
npm run db:migrate

# Seed the database with sample data
npm run db:seed
```

### 4. Start the Development Server

```bash
npm run dev
```

The API will be available at: http://localhost:3001

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user profile

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Courses
- `GET /api/courses` - Get all courses
- `POST /api/courses` - Create new course
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

### Venues
- `GET /api/venues` - Get all venues
- `POST /api/venues` - Create new venue
- `PUT /api/venues/:id` - Update venue
- `DELETE /api/venues/:id` - Delete venue

### Bookings
- `GET /api/bookings` - Get all bookings
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Delete booking

### Organizations
- `GET /api/organizations` - Get all organizations
- `POST /api/organizations` - Create new organization
- `PUT /api/organizations/:id` - Update organization
- `DELETE /api/organizations/:id` - Delete organization

## Database Schema

The database includes the following main tables:
- **users** - All system users (POLWEL, trainers, coordinators, learners)
- **organizations** - Client organizations and divisions
- **courses** - Training courses
- **course_runs** - Specific instances of courses with dates/venues
- **venues** - Training venues
- **bookings** - Course bookings
- **trainer_blockouts** - Trainer unavailable dates
- **audit_logs** - System audit trail
- **permissions** - User permissions
- **system_settings** - Application configuration

## Sample Login Credentials

After running the seed script, you can use these credentials:

- **Admin**: john.tan@polwel.org / password123
- **Training Coordinator**: mary.lim@spf.gov.sg / password123
- **Trainer**: david.chen@training.com / password123
- **Learner**: raj.kumar@spf.gov.sg / password123

## Development Commands

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run db:generate   # Generate Prisma client
npm run db:migrate    # Run database migrations
npm run db:seed       # Seed database with sample data
npm run db:reset      # Reset database (careful!)
npm run db:studio     # Open Prisma Studio (database GUI)
```

## Environment Variables

Create a `.env` file with these variables:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/polwel_training?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-jwt-key-change-this-in-production"

# Server
PORT=3001
NODE_ENV=development

# CORS
FRONTEND_URL="http://localhost:8080"

# File Upload
UPLOAD_DIR="uploads"
MAX_FILE_SIZE=5242880

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Troubleshooting

### Database Connection Issues
1. Ensure PostgreSQL is running
2. Check credentials in `.env` file
3. Verify database exists
4. Check firewall settings

### Port Already in Use
```bash
# Find process using port 3001
netstat -ano | findstr :3001
# Kill the process
taskkill /PID <process_id> /F
```

### Prisma Issues
```bash
# Reset and regenerate
npm run db:reset
npm run db:generate
npm run db:migrate
npm run db:seed
```
