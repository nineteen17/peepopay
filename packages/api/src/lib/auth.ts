import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, schema } from '../db/index.js';
import { config } from '../config/index.js';
import {
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from './email.js';

export const auth: any = betterAuth({
  baseURL: (process.env.BETTER_AUTH_URL || 'http://localhost:4000') + '/api/auth',
  secret: process.env.BETTER_AUTH_SECRET || 'fallback-secret-please-set-env-var',
  trustedOrigins: [
    process.env.DASHBOARD_URL || 'http://localhost:3000',
    process.env.WIDGET_URL || 'http://localhost:8080',
  ],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      try {
        await sendPasswordResetEmail(user.email, user.name, url);
        console.log(`📧 Password reset email sent to ${user.email}`);
      } catch (error) {
        console.error(`❌ Failed to send password reset email to ${user.email}:`, error);
        // Don't throw - allow the password reset to continue even if email fails
      }
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      try {
        // Update the callback URL to redirect to the dashboard instead of the API
        const urlObj = new URL(url);
        urlObj.searchParams.set('callbackURL', process.env.DASHBOARD_URL || 'http://localhost:3000');
        const modifiedUrl = urlObj.toString();

        await sendVerificationEmail(user.email, user.name, modifiedUrl);
        console.log(`📧 Verification email sent to ${user.email}`);
      } catch (error) {
        console.error(`❌ Failed to send verification email to ${user.email}:`, error);
        // Don't throw - allow signup to continue even if email fails
      }
    },
  },

  socialProviders: {
    google: {
      clientId: config.betterAuth.google.clientId || '',
      clientSecret: config.betterAuth.google.clientSecret || '',
      enabled: !!(config.betterAuth.google.clientId && config.betterAuth.google.clientSecret),
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },

  advanced: {
    cookiePrefix: 'peepopay',
    generateId: () => crypto.randomUUID(), // Use UUID format for all IDs
  },

  // Additional user fields configuration
  user: {
    additionalFields: {
      slug: {
        type: 'string',
        required: false,
      },
      industryVertical: {
        type: 'string',
        required: false,
      },
      industrySubcategory: {
        type: 'string',
        required: false,
      },
    },
  },

  // Hooks for additional email notifications
  hooks: {
    after: [
      {
        matcher: (context) => context.path === '/sign-up/email',
        handler: async (context) => {
          if (context.body?.user) {
            const user = context.body.user;
            try {
              await sendWelcomeEmail(user.email, user.name);
              console.log(`📧 Welcome email sent to ${user.email}`);
            } catch (error) {
              console.error(`❌ Failed to send welcome email to ${user.email}:`, error);
              // Don't throw - allow signup to continue even if email fails
            }
          }
        },
      },
    ],
  },
});

export type Auth = typeof auth;
