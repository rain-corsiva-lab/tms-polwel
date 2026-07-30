import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .min(1, 'Email cannot be empty')
    .email('Invalid email address format')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty'),
  rememberMe: z.boolean().optional().default(false),
});

export const mfaVerifySchema = z.object({
  challengeId: z
    .string({ required_error: 'Challenge ID is required' })
    .trim()
    .min(1, 'Challenge ID is required'),
  code: z
    .string({ required_error: 'Verification code is required' })
    .trim()
    .min(1, 'Verification code is required'),
  rememberMe: z.boolean().optional().default(false),
});

export const mfaResendSchema = z.object({
  challengeId: z
    .string({ required_error: 'Challenge ID is required' })
    .trim()
    .min(1, 'Challenge ID is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ required_error: 'Refresh token is required' })
    .trim()
    .min(1, 'Refresh token is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().trim().optional(),
  userId: z.string().trim().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .min(1, 'Email cannot be empty')
    .email('Invalid email address format')
    .toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z
    .string({ required_error: 'Reset token is required' })
    .trim()
    .min(1, 'Reset token is required'),
  newPassword: z
    .string({ required_error: 'New password is required' })
    .min(8, 'Password must be at least 8 characters long'),
});

export const onboardingSchema = z.object({
  token: z
    .string({ required_error: 'Setup token is required' })
    .trim()
    .min(1, 'Setup token is required'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(12, 'Password must be at least 12 characters long'),
  termsAccepted: z
    .boolean({ required_error: 'Terms acceptance is required' })
    .refine((val) => val === true, 'You must accept Terms & Conditions'),
  privacyAccepted: z
    .boolean({ required_error: 'Privacy policy acceptance is required' })
    .refine((val) => val === true, 'You must accept Privacy Policy'),
});
