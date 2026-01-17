# PostgreSQL to MySQL Migration Guide

This guide will help you migrate your Polwel Training System from PostgreSQL to MySQL.

## Prerequisites

1. **MySQL Server**: Install MySQL 8.0 or higher
2. **Backup**: Create a full backup of your PostgreSQL database
3. **Node.js**: Ensure Node.js 18+ is installed

## Migration Steps

### 1. Install MySQL Dependencies

```bash
# Install/update dependencies (mysql2 driver already added to package.json)
npm install
```

### 2. Setup MySQL Databases

Connect to your MySQL server and create the required databases:

```sql
-- For Development
CREATE DATABASE polwel_training CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- For Staging
CREATE DATABASE polwel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- For Production
CREATE DATABASE polwel_production_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Create MySQL Users (if needed)

```sql
-- For Development (using root in development is acceptable)
-- No additional user creation needed if using root

-- For Staging
CREATE USER 'polwel'@'localhost' IDENTIFIED BY 'rzEDMEnpimechG24';
GRANT ALL PRIVILEGES ON polwel.* TO 'polwel'@'localhost';

-- For Production
CREATE USER 'prod_user'@'localhost' IDENTIFIED BY 'prod_password';
GRANT ALL PRIVILEGES ON polwel_production_db.* TO 'prod_user'@'localhost';

FLUSH PRIVILEGES;
```

### 4. Environment Configuration

Environment files have been updated with MySQL connection strings:

- **Development**: `mysql://root:password@localhost:3306/polwel_training`
- **Staging**: `mysql://polwel:rzEDMEnpimechG24@localhost:3306/polwel`
- **Production**: `mysql://prod_user:prod_password@localhost:3306/polwel_production_db`

**Important**: Update the passwords in your environment files to match your actual MySQL setup.

### 5. Database Schema Migration

#### Generate and Apply Initial Migration

```bash
# Generate Prisma client with new MySQL schema
npx prisma generate

# Create initial migration
npx prisma migrate dev --name init_mysql_migration

# If migration fails, reset and try again
npx prisma migrate reset --force
npx prisma migrate dev --name init_mysql_migration
```

### 6. Data Migration (from PostgreSQL)

Since we're changing database engines, you'll need to export and import your data:

#### Export from PostgreSQL

```bash
# Export data (adjust connection details as needed)
pg_dump -h localhost -U your_postgres_user -d polwel_training --data-only --inserts > polwel_data.sql
```

#### Prepare Data for MySQL

The exported SQL may need adjustments for MySQL compatibility:

1. **Boolean values**: PostgreSQL `true`/`false` → MySQL `1`/`0`
2. **Array fields**: Now stored as JSON in MySQL
3. **Date formats**: May need conversion

#### Import to MySQL

```bash
# Import data to MySQL (after schema is created)
mysql -u root -p polwel_training < polwel_data_modified.sql
```

### 7. Schema Changes Summary

The following changes were made for MySQL compatibility:

#### User Model
- `additionalEmails: String[]` → `additionalEmails: Json`
- `specializations: String[]` → `specializations: Json`
- `certifications: String[]` → `certifications: Json`

#### Course Model
- `objectives: String[]` → `objectives: Json`
- `prerequisites: String[]` → `prerequisites: Json`
- `materials: String[]` → `materials: Json`
- `trainers: String[]` → `trainers: Json`

#### Venue Model
- `facilities: String[]` → `facilities: Json`
- `contacts: Json[]` → `contacts: Json`

### 8. Code Updates Required

Update your backend code to handle JSON fields properly:

```typescript
// Before (PostgreSQL arrays)
const user = await prisma.user.create({
  data: {
    email: 'test@example.com',
    additionalEmails: ['email1@example.com', 'email2@example.com']
  }
});

// After (MySQL JSON)
const user = await prisma.user.create({
  data: {
    email: 'test@example.com',
    additionalEmails: ['email1@example.com', 'email2@example.com'] // Prisma handles JSON conversion
  }
});

// When querying JSON fields
const users = await prisma.user.findMany({
  where: {
    additionalEmails: {
      array_contains: 'specific@email.com' // Use appropriate JSON operators
    }
  }
});
```

### 9. Testing Migration

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Verify Database Connection**: Check console for successful connection
3. **Test API Endpoints**: Ensure all CRUD operations work
4. **Check JSON Fields**: Verify array data is properly stored as JSON

### 10. Staging Deployment

1. **Setup MySQL on staging server**
2. **Update environment variables**
3. **Run migrations**:
   ```bash
   npx prisma migrate deploy
   ```
4. **Import data if needed**
5. **Test staging environment**

### 11. Production Deployment

1. **Setup MySQL on production server**
2. **Update environment variables**
3. **Run migrations**:
   ```bash
   npx prisma migrate deploy
   ```
4. **Import production data**
5. **Test production environment**

## Troubleshooting

### Common Issues

1. **Connection Errors**: 
   - Verify MySQL is running
   - Check connection strings in .env files
   - Ensure user permissions are correct

2. **Migration Errors**:
   - Use `npx prisma migrate reset --force` to start fresh
   - Check for syntax errors in schema.prisma

3. **JSON Field Issues**:
   - Ensure proper JSON format when inserting data
   - Use appropriate Prisma JSON operators for queries

4. **Character Set Issues**:
   - Use utf8mb4 character set for full Unicode support
   - Update connection string if needed: `?charset=utf8mb4`

### Rollback Plan

If migration fails, you can rollback by:

1. Restore PostgreSQL database from backup
2. Revert schema.prisma to PostgreSQL provider
3. Update environment files back to PostgreSQL URLs
4. Run `npx prisma generate` and `npma install`

## Best Practices

1. **Always backup** before migration
2. **Test thoroughly** in development first
3. **Use transactions** when possible during data migration
4. **Monitor performance** after migration (MySQL vs PostgreSQL differences)
5. **Update documentation** to reflect new database structure

## Support

If you encounter issues during migration:

1. Check Prisma documentation for MySQL-specific features
2. Verify MySQL version compatibility
3. Review error logs for specific issues
4. Test each step in isolation

Remember to update any external tools or services that connect to your database with the new MySQL connection details.
