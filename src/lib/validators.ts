// Simple email validator used across the app
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const trimmed = String(email).trim();
  // Basic RFC-like validation: local@domain.tld (no spaces)
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(trimmed);
}

export default isValidEmail;
