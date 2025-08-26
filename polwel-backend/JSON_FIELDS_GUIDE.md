# MySQL JSON Fields Handling Guide

## Overview
After migrating from PostgreSQL to MySQL, array fields are now stored as JSON. This guide explains how to handle them properly in your application.

## Schema Changes Made

### User Model
- `additionalEmails: String[]` → `additionalEmails: Json`
- `specializations: String[]` → `specializations: Json`
- `certifications: String[]` → `certifications: Json`

### Course Model
- `objectives: String[]` → `objectives: Json`
- `prerequisites: String[]` → `prerequisites: Json`
- `materials: String[]` → `materials: Json`
- `trainers: String[]` → `trainers: Json`

### Venue Model
- `facilities: String[]` → `facilities: Json`
- `contacts: Json[]` → `contacts: Json`

## Updated Validation Schemas

### Courses Controller ✅ UPDATED
The CourseCreateSchema now accepts both arrays and JSON for MySQL compatibility:

```typescript
objectives: z.union([z.array(z.string()), z.any()]).default([]),
prerequisites: z.union([z.array(z.string()), z.any()]).default([]),
materials: z.union([z.array(z.string()), z.any()]).default([]),
trainers: z.union([z.array(z.string()), z.any()]).default([]),
```

## How Prisma Handles JSON Fields

### ✅ Good News: Minimal Code Changes Required
Prisma automatically handles JSON serialization/deserialization:

```typescript
// This still works exactly the same!
const course = await prisma.course.create({
  data: {
    title: 'New Course',
    objectives: ['Learn basics', 'Apply knowledge'], // Array input
    prerequisites: ['Prior experience'], // Array input
    materials: ['Textbook', 'Laptop'] // Array input
  }
});

// Data is automatically stored as JSON in MySQL
// When retrieved, it's automatically converted back to arrays
```

### Querying JSON Fields

#### Before (PostgreSQL arrays):
```typescript
// Find courses with specific objective
const courses = await prisma.course.findMany({
  where: {
    objectives: {
      has: 'Learn basics'
    }
  }
});
```

#### After (MySQL JSON):
```typescript
// Find courses with specific objective
const courses = await prisma.course.findMany({
  where: {
    objectives: {
      array_contains: 'Learn basics'
    }
  }
});

// Or using path for complex queries
const courses = await prisma.course.findMany({
  where: {
    objectives: {
      path: '$[*]',
      equals: 'Learn basics'
    }
  }
});
```

## Frontend Compatibility

### ✅ No Changes Required
Your frontend code continues to work unchanged:

```typescript
// Still works exactly the same
const courseData = {
  title: 'Advanced Training',
  objectives: ['Objective 1', 'Objective 2'],
  prerequisites: ['Prerequisite 1'],
  materials: ['Material 1', 'Material 2'],
  trainers: ['trainer-id-1', 'trainer-id-2']
};

// POST to /api/courses
fetch('/api/courses', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(courseData)
});
```

## Best Practices

### 1. Input Validation
Always validate arrays before saving:

```typescript
// Ensure arrays are properly formatted
const sanitizeArrayField = (field: any): string[] => {
  if (Array.isArray(field)) return field;
  if (typeof field === 'string') return [field];
  return [];
};

const objectives = sanitizeArrayField(req.body.objectives);
```

### 2. Error Handling
Handle JSON parsing errors gracefully:

```typescript
try {
  const course = await prisma.course.findUnique({
    where: { id: courseId }
  });
  
  // Ensure objectives is always an array
  const objectives = Array.isArray(course.objectives) 
    ? course.objectives 
    : [];
    
} catch (error) {
  console.error('Error handling JSON field:', error);
}
```

### 3. Database Queries
Use appropriate JSON operators:

```typescript
// Search within JSON arrays
const searchCourses = await prisma.course.findMany({
  where: {
    OR: [
      {
        objectives: {
          array_contains: searchTerm
        }
      },
      {
        materials: {
          array_contains: searchTerm
        }
      }
    ]
  }
});
```

## Migration Testing Checklist

### ✅ Completed
- [x] Schema updated to use JSON fields
- [x] Validation schemas updated for MySQL compatibility
- [x] Package.json scripts verified (no changes needed)

### 🔧 Test These Areas

1. **Course Management**
   ```bash
   # Test creating courses with array fields
   curl -X POST http://localhost:3001/api/courses \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "title": "Test Course",
       "objectives": ["Test objective"],
       "prerequisites": ["Test prereq"],
       "materials": ["Test material"],
       "trainers": ["trainer-id"]
     }'
   ```

2. **User Management**
   ```bash
   # Test updating user with additional emails
   curl -X PATCH http://localhost:3001/api/users/USER_ID \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "additionalEmails": ["test@example.com"],
       "specializations": ["Training"],
       "certifications": ["Cert1"]
     }'
   ```

3. **Venue Management**
   ```bash
   # Test creating venues with facilities
   curl -X POST http://localhost:3001/api/venues \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "name": "Test Venue",
       "facilities": ["WiFi", "Projector"],
       "contacts": [{"name": "Contact", "email": "contact@example.com"}]
     }'
   ```

## Monitoring and Debugging

### Check JSON Field Storage
```sql
-- Verify data is stored correctly as JSON
SELECT id, title, JSON_EXTRACT(objectives, '$') as objectives_json 
FROM Course 
LIMIT 5;
```

### Common Issues and Solutions

1. **"Invalid JSON" errors**
   - Ensure data is properly serialized before saving
   - Use Prisma's built-in JSON handling

2. **Array operations not working**
   - Use MySQL JSON functions instead of PostgreSQL array operators
   - Update queries to use `array_contains` instead of `has`

3. **Frontend receiving strings instead of arrays**
   - Check that Prisma is properly deserializing JSON
   - Ensure controllers return data without additional JSON.parse()

## Performance Considerations

### Indexing JSON Fields
```sql
-- Create indexes on frequently queried JSON fields
CREATE INDEX idx_course_objectives ON Course ((CAST(objectives AS JSON)));
CREATE INDEX idx_user_specializations ON User ((CAST(specializations AS JSON)));
```

### Query Optimization
- Use specific JSON path queries for better performance
- Consider denormalizing frequently queried JSON fields if performance becomes an issue

## Rollback Plan

If issues arise, you can quickly rollback:

1. Restore database backup
2. Revert schema.prisma to PostgreSQL
3. Update environment files back to PostgreSQL URLs
4. Run `npx prisma generate && npm install`

## Support

For MySQL-specific JSON operations, refer to:
- [MySQL JSON Functions](https://dev.mysql.com/doc/refman/8.0/en/json-functions.html)
- [Prisma JSON Fields](https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#json-fields)

Remember: Your application logic remains unchanged - only the underlying storage mechanism has changed from PostgreSQL arrays to MySQL JSON.
