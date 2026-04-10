import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import { HttpError } from '../lib/http-error';
import { prisma } from '../lib/prisma';
import { writeAuditLog } from '../lib/audit';
import { authenticate } from '../middleware/authenticate';
import { csrfProtect } from '../middleware/csrf-protect';
import { requireRole } from '../middleware/require-role';
import { validate } from '../middleware/validate';
import {
  updateUserParamsSchema,
  updateUserSchema,
  createAdminUserSchema,
  smtpConfigSchema,
  smtpTestSchema
} from '../schemas/admin.schemas';
import { hashPassword } from '../lib/password';
import { serializeUser } from '../services/auth.service';
import { getEffectiveSmtpSettings, saveSmtpSettings } from '../lib/smtp-settings';
import { sendSmtpTestEmail } from '../lib/mailer';

const router = Router();

// All admin routes enforce ADMIN role at middleware level.
// Frontend role checks are UX-only — this is the authoritative access control (OWASP A01).
router.use(authenticate, requireRole(['ADMIN']));

// GET /api/admin/overview — full platform view: users, games, audit logs
router.get(
  '/overview',
  asyncHandler(async (_request, response) => {
    const [users, games, auditLogs] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.game.findMany({
        select: {
          id: true,
          title: true,
          genre: true,
          price: true,
          stock: true,
          isActive: true
        },
        orderBy: { title: 'asc' }
      }),
      prisma.auditLog.findMany({
        include: {
          actorUser: { select: { id: true, fullName: true, email: true } },
          targetUser: { select: { id: true, fullName: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    ]);

    response.json({
      users: users.map(serializeUser),
      games,
      auditLogs
    });
  })
);

// PATCH /api/admin/users/:userId — change a user's role
// Every role change is persisted to AuditLog with actor, target, before/after values
router.patch(
  '/users/:userId',
  csrfProtect,
  validate(updateUserParamsSchema, 'params'),
  validate(updateUserSchema),
  asyncHandler(async (request, response) => {
    const { userId } = request.params as { userId: string };
    const { role } = request.body as { role: 'ADMIN' | 'MANAGER' | 'USER' };

    // Self-demotion guard: an admin cannot remove their own admin role
    // Prevents accidental platform lockout
    if (request.user!.id === userId && role !== 'ADMIN') {
      throw new HttpError(400, 'You cannot remove your own admin role.');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, role: true }
    });

    if (!targetUser) {
      throw new HttpError(404, 'Target user not found.');
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: { role },
      select: { id: true, email: true, fullName: true, role: true }
    });

    await writeAuditLog({
      action: 'ADMIN_USER_UPDATED',
      success: true,
      request,
      actorUserId: request.user!.id,
      targetUserId: updatedUser.id,
      details: {
        previousRole: targetUser.role,
        newRole: updatedUser.role
      }
    });

    response.json({ user: serializeUser(updatedUser) });
  })
);

// POST /api/admin/users — admin creates a new user account with a specific role
// Does NOT create a session for the new user — admin stays logged in
router.post(
  '/users',
  csrfProtect,
  validate(createAdminUserSchema),
  asyncHandler(async (request, response) => {
    const { fullName, email, password, role } = request.body as {
      fullName: string;
      email: string;
      password: string;
      role: 'ADMIN' | 'MANAGER' | 'USER';
    };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new HttpError(400, 'Konto z tym adresem e-mail już istnieje.');
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { fullName, email, passwordHash, role },
      select: { id: true, fullName: true, email: true, role: true }
    });

    await writeAuditLog({
      action: 'ADMIN_USER_CREATED',
      success: true,
      request,
      actorUserId: request.user!.id,
      targetUserId: user.id,
      details: { role, email }
    });

    response.status(201).json({ user: serializeUser(user) });
  })
);

router.get(
  '/smtp-config',
  asyncHandler(async (_request, response) => {
    const effective = await getEffectiveSmtpSettings();

    response.json({
      host: effective.settings?.host ?? 'smtp.gmail.com',
      port: effective.settings?.port ?? 587,
      user: effective.settings?.user ?? '',
      from: effective.settings?.from ?? '',
      hasPassword: Boolean(effective.settings?.pass),
      source: effective.source
    });
  })
);

router.post(
  '/smtp-config',
  csrfProtect,
  validate(smtpConfigSchema),
  asyncHandler(async (request, response) => {
    const { host, port, user, pass, from } = request.body as {
      host: string;
      port: number;
      user: string;
      pass?: string;
      from: string;
    };

    try {
      await saveSmtpSettings({ host, port, user, pass, from });
    } catch (error) {
      throw new HttpError(400, error instanceof Error ? error.message : 'Nie udalo sie zapisac konfiguracji SMTP.');
    }

    await writeAuditLog({
      action: 'ADMIN_SMTP_CONFIG_UPDATED',
      success: true,
      request,
      actorUserId: request.user!.id,
      details: {
        host,
        port,
        user,
        from,
        passwordUpdated: Boolean(pass && pass.length > 0)
      }
    });

    response.json({ success: true });
  })
);

router.post(
  '/smtp-config/test',
  csrfProtect,
  validate(smtpTestSchema),
  asyncHandler(async (request, response) => {
    const { to } = request.body as { to: string };

    const effective = await getEffectiveSmtpSettings();
    if (!effective.settings) {
      throw new HttpError(400, 'SMTP nie jest skonfigurowane. Ustaw host, port, login, haslo i adres nadawcy.');
    }

    await sendSmtpTestEmail(to);

    await writeAuditLog({
      action: 'ADMIN_SMTP_TEST_SENT',
      success: true,
      request,
      actorUserId: request.user!.id,
      details: { to }
    });

    response.json({ success: true, message: 'Wiadomosc testowa zostala wyslana.' });
  })
);

export { router as adminRouter };
