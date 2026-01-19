/**
 * CASL Permission System - Type Definitions
 * 
 * Defines all subjects (resources) and actions for the permission system
 */

// All possible actions in the system
export type Action = 
  | 'view' 
  | 'create' 
  | 'edit' 
  | 'update'  // alias for edit
  | 'delete' 
  | 'approve'
  | 'manage'; // special action: grants all permissions on a subject

// All possible subjects (resources) in the system
export type Subject = 
  | 'User'              // POLWEL users
  | 'Trainer'           // Trainers & Partners
  | 'Client'            // Client Organisations
  | 'CourseVenue'       // Courses & Venues combined
  | 'CourseRun'         // Course Runs
  | 'PostCourseRun'     // Post Course Run artefacts
  | 'Report'            // Billing & Reports
  | 'Waiver'            // Waiver Requests
  | 'ResourceLibrary'   // Resource Library
  | 'Calendar'          // Training calendar
  | 'all';              // special subject: applies to all resources

// Permission tuple format [action, subject]
export type Permission = [Action, Subject];

// Raw permission from database (dot notation: "module.action")
export interface RawPermission {
  permissionName: string;
  granted?: boolean;
}

// Module mapping: database permission prefix → CASL subject
export const MODULE_TO_SUBJECT: Record<string, Subject> = {
  'users': 'User',
  'trainers': 'Trainer',
  'clients': 'Client',
  'course-venue': 'CourseVenue',
  'course-run': 'CourseRun',
  'post-course-run': 'PostCourseRun',
  'reports': 'Report',
  'waiver': 'Waiver',
  'resource-library': 'ResourceLibrary',
  'calendar': 'Calendar',
};

// Reverse mapping: CASL subject → database permission prefix
export const SUBJECT_TO_MODULE: Record<Subject, string> = {
  'User': 'users',
  'Trainer': 'trainers',
  'Client': 'clients',
  'CourseVenue': 'course-venue',
  'CourseRun': 'course-run',
  'PostCourseRun': 'post-course-run',
  'Report': 'reports',
  'Waiver': 'waiver',
  'Calendar': 'calendar',
  'all': 'all',
};

/**
 * Parse database permission string to CASL permission tuple
 * e.g., "users.view" → ["view", "User"]
 * Also handles malformed "post.course.run.view" → "post-course-run.view"
 */
export function parsePermission(permissionName: string): Permission | null {
  if (!permissionName || typeof permissionName !== 'string') return null;
  
  let normalized = permissionName.toLowerCase().trim();
  
  // Fix common malformed patterns from database:
  // "post.course.run.view" → "post-course-run.view"
  normalized = normalized.replace(/^post\.course\.run\./i, 'post-course-run.');
  
  const parts = normalized.split('.');
  if (parts.length !== 2) {
    console.warn('[CASL] Invalid permission format:', permissionName, '- expected "module.action"');
    return null;
  }
  
  const [module, action] = parts;
  const subject = MODULE_TO_SUBJECT[module];
  
  if (!subject) {
    console.warn('[CASL] Unknown module:', module, 'in permission:', permissionName);
    return null;
  }
  
  if (!isValidAction(action)) {
    console.warn('[CASL] Invalid action:', action, 'in permission:', permissionName);
    return null;
  }
  
  return [action as Action, subject];
}

/**
 * Convert CASL permission to database permission string
 * e.g., ["view", "User"] → "users.view"
 */
export function formatPermission(action: Action, subject: Subject): string {
  const module = SUBJECT_TO_MODULE[subject];
  return `${module}.${action}`;
}

function isValidAction(action: string): action is Action {
  return ['view', 'create', 'edit', 'update', 'delete', 'approve', 'manage'].includes(action);
}
