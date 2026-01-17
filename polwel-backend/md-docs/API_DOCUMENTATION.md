# POLWEL Training Management System - Backend API Documentation

## 🎯 Overview

Complete backend implementation for POLWEL Training Management System with comprehensive user management, trainer management, and client organization management.

## 🔐 Authentication

All endpoints (except `/api/auth/*`) require Bearer token authentication:
```
Authorization: Bearer <jwt_token>
```

## 📋 API Endpoints

### 🔒 Authentication Routes (`/api/auth`)

#### POST `/api/auth/login`
Login user and get access token
```json
{
  "email": "john.tan@polwel.org",
  "password": "admin123",
  "rememberMe": false
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "jwt_token_here",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "user_id",
    "email": "john.tan@polwel.org",
    "name": "John Tan",
    "role": "POLWEL",
    "status": "ACTIVE"
  },
  "expiresIn": "15m"
}
```

#### POST `/api/auth/refresh`
Refresh access token
```json
{
  "refreshToken": "refresh_token_here"
}
```

#### POST `/api/auth/logout`
Logout user (requires authentication)

---

### 👥 POLWEL Users Management (`/api/polwel-users`)
*Requires POLWEL role*

#### GET `/api/polwel-users`
Get all POLWEL users with pagination and filtering

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search by name, email, or department
- `status` (string): Filter by status (ACTIVE, INACTIVE, PENDING, LOCKED)
- `department` (string): Filter by department

**Response:**
```json
{
  "users": [
    {
      "id": "user_id",
      "name": "John Tan",
      "email": "john.tan@polwel.org",
      "role": "POLWEL",
      "status": "ACTIVE",
      "lastLogin": "2024-01-15T09:30:00Z",
      "mfaEnabled": true,
      "passwordExpiry": "2024-04-15T00:00:00Z",
      "failedLoginAttempts": 0,
      "permissionLevel": "Administrator",
      "department": "System Administration",
      "createdAt": "2023-06-01T00:00:00Z",
      "createdBy": "System",
      "lastModified": "2024-01-15T00:00:00Z",
      "modifiedBy": "john.tan@polwel.org",
      "auditTrail": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

#### GET `/api/polwel-users/:id`
Get POLWEL user by ID

#### POST `/api/polwel-users`
Create new POLWEL user
```json
{
  "name": "Jane Smith",
  "email": "jane.smith@polwel.org",
  "status": "ACTIVE",
  "permissions": {
    "user-management-polwel": {
      "view": true,
      "create": true,
      "edit": true,
      "delete": false
    }
  }
}
```

**Response:**
```json
{
  "user": {
    "id": "new_user_id",
    "name": "Jane Smith",
    "email": "jane.smith@polwel.org",
    "role": "POLWEL",
    "status": "ACTIVE",
    "createdAt": "2024-01-20T10:30:00Z"
  },
  "tempPassword": "abc123def"
}
```

#### PUT `/api/polwel-users/:id`
Update POLWEL user

#### DELETE `/api/polwel-users/:id`
Soft delete POLWEL user (sets status to INACTIVE)

#### POST `/api/polwel-users/:id/reset-password`
Reset user password (generates temporary password)

#### POST `/api/polwel-users/:id/toggle-mfa`
Enable/disable MFA for user
```json
{
  "enabled": true
}
```

---

### 🎓 Trainers Management (`/api/trainers`)
*Requires POLWEL or TRAINING_COORDINATOR role*

#### GET `/api/trainers`
Get all trainers with pagination and filtering

#### GET `/api/trainers/:id`
Get trainer by ID with detailed information

#### POST `/api/trainers`
Create new trainer *(POLWEL only)*

#### PUT `/api/trainers/:id`
Update trainer *(POLWEL only)*

#### DELETE `/api/trainers/:id`
Soft delete trainer *(POLWEL only)*

#### GET `/api/trainers/partner-organizations`
Get list of all partner organizations

#### GET `/api/trainers/:id/blockouts`
Get trainer blockouts with optional date filtering

#### POST `/api/trainers/:id/blockouts`
Create trainer blockout

#### DELETE `/api/trainers/:id/blockouts/:blockoutId`
Delete trainer blockout

---

### 🏢 Client Organizations Management (`/api/client-organizations`)

#### GET `/api/client-organizations/stats`
Get organization statistics *(POLWEL only)*

#### GET `/api/client-organizations/industries`
Get list of all industries

#### GET `/api/client-organizations`
Get all client organizations with pagination and filtering

#### GET `/api/client-organizations/:id`
Get client organization by ID with detailed information

#### POST `/api/client-organizations`
Create new client organization *(POLWEL only)*

#### PUT `/api/client-organizations/:id`
Update client organization *(POLWEL only)*

#### DELETE `/api/client-organizations/:id`
Soft delete client organization *(POLWEL only)*

---

## 🔒 Role-Based Access Control

### POLWEL Users
- **Full Access**: All endpoints and operations
- **Can**: Create, read, update, delete all users, trainers, organizations

### Training Coordinators
- **Limited Access**: Read-only access to trainers and organizations
- **Can**: View trainer profiles, availability, organization details

### Trainers
- **Restricted Access**: Own profile management only
- **Can**: View/update own profile, manage own blockouts

### Learners
- **Basic Access**: Own profile and course enrollment
- **Can**: View own courses, update personal profile

---

## 🚀 Backend Features Summary

### ✅ Implemented Features
- **Complete User Management**: POLWEL users with permissions, trainers with specializations, client organizations
- **Authentication & Authorization**: JWT-based with role-based access control
- **Audit Logging**: Complete audit trail for all operations
- **Security**: Rate limiting, input validation, SQL injection protection
- **API Design**: RESTful endpoints with proper HTTP status codes
- **Database Integration**: Prisma ORM with PostgreSQL
- **Error Handling**: Centralized error handling with proper error responses
- **Validation**: Input validation for all endpoints
- **Pagination**: Efficient pagination for large datasets
- **Search & Filtering**: Advanced search capabilities

### 🔧 Technical Implementation
- **Backend Framework**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens
- **Security**: Helmet, CORS, rate limiting
- **Validation**: Input sanitization and validation
- **Error Handling**: Centralized error middleware
- **Logging**: Request/response logging
- **Environment Config**: Environment-based configuration

### 📊 Database Schema
- **User Management**: Complete user lifecycle with roles and permissions
- **Organization Management**: Client organizations with contact details
- **Trainer Management**: Trainer profiles with specializations and availability
- **Audit Trail**: Complete audit logging for compliance
- **Relationships**: Proper foreign key relationships between entities

This backend provides a complete foundation for the POLWEL Training Management System with all necessary CRUD operations for user management, trainer management, and client organization management, fully integrated with the frontend authentication system.
