# 🚀 POLWEL TMS - Local Development Setup Guide

## ✅ Setup Complete!

Your POLWEL Training Management System is now configured and ready for local development.

---

## 📋 Project Structure

```
polwel/
├── polwel-backend/          # Node.js Express API + Prisma ORM
│   ├── src/                 # TypeScript source code
│   ├── prisma/             # Database schema & migrations
│   └── .env.local          # Backend environment config
├── src/                     # React TypeScript frontend
├── .env.local              # Frontend environment config
└── start-dev.sh            # Quick start script
```

---

## 🔧 Configuration Summary

### Frontend (React + Vite + TypeScript)
- **Port**: 8080
- **API Endpoint**: http://localhost:3001/api
- **Config File**: `.env.local`
- **HMR**: Configured for smooth hot reload

### Backend (Node.js + Express + Prisma + TypeScript)
- **Port**: 3001
- **Database**: MySQL (polwel_local)
- **Config File**: `polwel-backend/.env.local`
- **ORM**: Prisma

### Database (MySQL via Laradock)
- **Host**: mysql (Laradock container)
- **Port**: 3306
- **Database**: polwel_local
- **User**: root
- **Password**: root
- **Migrations**: ✅ All 42 migrations applied successfully

---

## 🚀 Quick Start

### Option 1: Use the automated script (Recommended)
```bash
cd /media/kukuh/7aa48e4a-0345-4928-bb19-a622aa156169/webprojects/polwel
./start-dev.sh
```

This will:
- Check database connection
- Start backend on port 3001
- Start frontend on port 8080
- Handle cleanup on exit

### Option 2: Manual start

**Terminal 1 - Backend:**
```bash
cd /media/kukuh/7aa48e4a-0345-4928-bb19-a622aa156169/webprojects/polwel/polwel-backend
npm run dev:local
```

**Terminal 2 - Frontend:**
```bash
cd /media/kukuh/7aa48e4a-0345-4928-bb19-a622aa156169/webprojects/polwel
npm run dev
```

---

## 🌐 Access URLs

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3001/api
- **Prisma Studio** (Database GUI): 
  ```bash
  cd polwel-backend && npm run db:studio
  ```

---

## 📦 Database Commands

### View Database with Prisma Studio
```bash
cd polwel-backend
npm run db:studio
# Opens at http://localhost:5555
```

### Create New Migration
```bash
cd polwel-backend
npx prisma migrate dev --name your_migration_name
```

### Reset Database (CAREFUL!)
```bash
cd polwel-backend
npm run db:reset
```

### Regenerate Prisma Client
```bash
cd polwel-backend
npm run db:generate
```

---

## 🔑 Environment Variables

### Frontend (`.env.local`)
```bash
VITE_APP_NAME=POLWEL TMS (Local)
VITE_API_URL=http://localhost:3001/api
VITE_NODE_ENV=development
VITE_ENABLE_DEBUG=true
```

### Backend (`polwel-backend/.env.local`)
```bash
NODE_ENV=local
PORT=3001
DATABASE_URL="mysql://root:root@mysql:3306/polwel_local"
JWT_SECRET=33d38deea5c6e6e0402488582ab3447c-local-dev
CORS_ORIGIN=http://localhost:8080
```

---

## 🛠️ Useful Commands

### Frontend
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run build:dev        # Build for development
npm run lint             # Run ESLint
```

### Backend
```bash
npm run dev:local        # Start with local environment
npm run build            # Compile TypeScript to JavaScript
npm run start            # Run compiled code
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill processes on ports
lsof -ti:3001 | xargs kill -9  # Backend
lsof -ti:8080 | xargs kill -9  # Frontend
```

### Database Connection Issues
```bash
# Check if MySQL container is running
docker ps | grep mysql

# Test database connection
docker exec laradock-mysql-1 mysql -uroot -proot -e "USE polwel_local; SHOW TABLES;"
```

### Prisma Client Out of Sync
```bash
cd polwel-backend
npm run db:generate
```

### Clear Node Modules & Reinstall
```bash
# Frontend
cd /path/to/polwel
rm -rf node_modules package-lock.json
npm install

# Backend
cd /path/to/polwel/polwel-backend
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Technology Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Radix UI, React Query, React Hook Form
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: MySQL 8.0
- **Authentication**: JWT, bcrypt
- **Authorization**: CASL (Content Authorization Security Library)
- **Dev Tools**: Nodemon, ESLint, Prettier

---

## 🎯 Next Steps

1. **Access the application**: http://localhost:8080
2. **Create your first user** (if seed script hasn't run)
3. **Explore Prisma Studio**: `cd polwel-backend && npm run db:studio`
4. **Start developing!**

---

## 📝 Notes

- Backend logs are available at `/tmp/polwel-backend.log` when using the start script
- HMR (Hot Module Replacement) is enabled for both frontend and backend
- Database migrations are automatically applied on first run
- CORS is configured to allow localhost:8080 → localhost:3001

---

## ✅ Verification Checklist

- [x] Frontend dependencies installed
- [x] Backend dependencies installed
- [x] Database `polwel_local` created
- [x] All 42 Prisma migrations applied
- [x] Prisma client generated
- [x] Environment files configured
- [x] Vite config optimized for local dev
- [x] Quick start script created

---

## 🚦 Status

**✨ All systems ready for development!**

You can now start building features, fixing bugs, and developing the POLWEL Training Management System locally.

For issues or questions, check the logs or consult the team documentation.

Happy coding! 🎉
