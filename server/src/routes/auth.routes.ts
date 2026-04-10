import { Router } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../lib/async-handler';
import { HttpError } from '../lib/http-error';
import { csrfProtect, clearCsrfCookie, issueCsrfToken } from '../middleware/csrf-protect';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  changePasswordSchema,
  forgotPasswordConfirmSchema,
  forgotPasswordRequestSchema,
  loginSchema,
  registerSchema
} from '../schemas/auth.schemas';
import { attachSessionCookie, maskEmail, serializeUser } from '../services/auth.service';
import { hashPassword, verifyPassword } from '../lib/password';
import { writeAuditLog } from '../lib/audit';
import { getClearSessionCookieOptions, SESSION_COOKIE_NAME } from '../lib/cookies';
import { config } from '../config/env';
import { verifyRecaptchaToken } from '../lib/recaptcha';
import { sendPasswordResetCodeEmail } from '../lib/mailer';

const router = Router();

const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please try again later.'
  }
});

const registrationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many registration attempts. Please try again later.'
  }
});

const passwordResetRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many password reset attempts. Please try again later.'
  }
});

function isIpv4Host(hostname: string): boolean {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

function hashResetCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

router.get(
  '/csrf-token',
  asyncHandler(async (request, response) => {
    const csrfToken = issueCsrfToken(response);

    await writeAuditLog({
      action: 'AUTH_CSRF_ISSUED',
      success: true,
      request,
      actorUserId: request.user?.id
    });

    response.json({ csrfToken });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (request, response) => {
    response.json({
      user: serializeUser(request.user!)
    });
  })
);

router.post(
  '/register',
  registrationRateLimit,
  csrfProtect,
  validate(registerSchema),
  asyncHandler(async (request, response) => {
    const { email, fullName, password } = request.body as {
      email: string;
      fullName: string;
      password: string;
    };

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      await writeAuditLog({
        action: 'AUTH_REGISTER_FAILURE',
        success: false,
        request,
        details: {
          email: maskEmail(email),
          reason: 'duplicate_email'
        }
      });

      throw new HttpError(409, 'A user with this email already exists.');
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true
      }
    });

    await attachSessionCookie(response, request, user.id);
    const csrfToken = issueCsrfToken(response);

    await writeAuditLog({
      action: 'AUTH_REGISTER_SUCCESS',
      success: true,
      request,
      actorUserId: user.id,
      details: {
        email: maskEmail(user.email)
      }
    });

    response.status(201).json({
      user: serializeUser(user),
      csrfToken
    });
  })
);

router.post(
  '/login',
  authRateLimit,
  csrfProtect,
  validate(loginSchema),
  asyncHandler(async (request, response) => {
    const { email, password, recaptchaToken } = request.body as {
      email: string;
      password: string;
      recaptchaToken?: string;
    };

    const recaptchaBypassedForIpHost = isIpv4Host(request.hostname);

    if (!recaptchaBypassedForIpHost) {
      const recaptchaResult = await verifyRecaptchaToken(recaptchaToken ?? '', config.RECAPTCHA_LOGIN_ACTION);
      if (!recaptchaResult.success) {
        await writeAuditLog({
          action: 'AUTH_LOGIN_FAILURE',
          success: false,
          request,
          details: {
            email: maskEmail(email),
            reason: 'recaptcha_failed',
            recaptchaScore: recaptchaResult.score,
            recaptchaFailureReason: recaptchaResult.reason
          }
        });

        throw new HttpError(403, 'Login blocked by reCAPTCHA verification.');
      }
    } else {
      await writeAuditLog({
        action: 'AUTH_LOGIN_RECAPTCHA_BYPASSED_IP_HOST',
        success: true,
        request,
        details: {
          email: maskEmail(email),
          host: request.hostname
        }
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        passwordHash: true
      }
    });

    if (!user || !(await verifyPassword(user.passwordHash, password))) {
      await writeAuditLog({
        action: 'AUTH_LOGIN_FAILURE',
        success: false,
        request,
        details: {
          email: maskEmail(email),
          reason: 'invalid_credentials'
        }
      });

      throw new HttpError(401, 'Invalid email or password.');
    }

    await attachSessionCookie(response, request, user.id);
    const csrfToken = issueCsrfToken(response);

    await writeAuditLog({
      action: 'AUTH_LOGIN_SUCCESS',
      success: true,
      request,
      actorUserId: user.id
    });

    response.json({
      user: serializeUser(user),
      csrfToken
    });
  })
);

router.post(
  '/forgot-password/request',
  passwordResetRateLimit,
  validate(forgotPasswordRequestSchema),
  asyncHandler(async (request, response) => {
    const { email } = request.body as { email: string };

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const codeHash = hashResetCode(code);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.passwordResetCode.create({
        data: {
          email,
          codeHash,
          expiresAt
        }
      });

      await sendPasswordResetCodeEmail(email, code);
    }

    response.json({
      message: 'Jesli konto istnieje, kod jednorazowy zostal wyslany na e-mail.'
    });
  })
);

router.post(
  '/forgot-password/confirm',
  passwordResetRateLimit,
  validate(forgotPasswordConfirmSchema),
  asyncHandler(async (request, response) => {
    const { email, code, newPassword } = request.body as {
      email: string;
      code: string;
      newPassword: string;
    };

    const codeHash = hashResetCode(code);

    const resetCode = await prisma.passwordResetCode.findFirst({
      where: {
        email,
        codeHash,
        usedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!resetCode) {
      throw new HttpError(400, 'Nieprawidlowy lub wygasniety kod resetu hasla.');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new HttpError(404, 'Uzytkownik nie istnieje.');
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash }
      }),
      prisma.passwordResetCode.update({
        where: { id: resetCode.id },
        data: { usedAt: new Date() }
      }),
      prisma.session.deleteMany({
        where: { userId: user.id }
      })
    ]);

    await writeAuditLog({
      action: 'AUTH_PASSWORD_RESET_CODE',
      success: true,
      request,
      actorUserId: user.id,
      details: { method: 'email_otp' }
    });

    response.json({
      message: 'Haslo zostalo zresetowane. Mozesz sie zalogowac nowym haslem.'
    });
  })
);

router.post(
  '/logout',
  authenticate,
  csrfProtect,
  asyncHandler(async (request, response) => {
    await prisma.session.deleteMany({
      where: {
        id: request.session!.id
      }
    });

    response.clearCookie(SESSION_COOKIE_NAME, getClearSessionCookieOptions());
    clearCsrfCookie(response);
    const csrfToken = issueCsrfToken(response);

    await writeAuditLog({
      action: 'AUTH_LOGOUT',
      success: true,
      request,
      actorUserId: request.user!.id
    });

    response.json({
      message: 'Logged out successfully.',
      csrfToken
    });
  })
);

router.post(
  '/change-password',
  authRateLimit,
  authenticate,
  csrfProtect,
  validate(changePasswordSchema),
  asyncHandler(async (request, response) => {
    const { currentPassword, newPassword } = request.body as {
      currentPassword: string;
      newPassword: string;
    };

    const user = await prisma.user.findUnique({
      where: {
        id: request.user!.id
      }
    });

    if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
      await writeAuditLog({
        action: 'AUTH_PASSWORD_CHANGE',
        success: false,
        request,
        actorUserId: request.user!.id,
        details: {
          reason: 'invalid_current_password'
        }
      });

      throw new HttpError(401, 'Current password is invalid.');
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: user.id
        },
        data: {
          passwordHash: newPasswordHash
        }
      }),
      // All sessions are revoked after password rotation to reduce account takeover persistence.
      prisma.session.deleteMany({
        where: {
          userId: user.id
        }
      })
    ]);

    response.clearCookie(SESSION_COOKIE_NAME, getClearSessionCookieOptions());
    clearCsrfCookie(response);
    const csrfToken = issueCsrfToken(response);

    await writeAuditLog({
      action: 'AUTH_PASSWORD_CHANGE',
      success: true,
      request,
      actorUserId: user.id
    });

    response.json({
      message: 'Password changed successfully. Please log in again.',
      csrfToken
    });
  })
);

export { router as authRouter };
