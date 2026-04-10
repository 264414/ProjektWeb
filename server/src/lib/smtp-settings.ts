import { config } from '../config/env';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

const SMTP_CONFIG_KEY = 'smtp_config';

export interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

interface StoredSmtpSettings {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
}

function isCompleteSmtpSettings(value: Partial<SmtpSettings> | null | undefined): value is SmtpSettings {
  return Boolean(
    value?.host &&
      value?.port &&
      value?.user &&
      value?.pass &&
      value?.from
  );
}

function fromEnv(): SmtpSettings | null {
  const envSettings: Partial<SmtpSettings> = {
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
    from: config.SMTP_FROM
  };

  return isCompleteSmtpSettings(envSettings) ? envSettings : null;
}

export async function getStoredSmtpSettings(): Promise<SmtpSettings | null> {
  const row = await prisma.systemSetting.findUnique({ where: { key: SMTP_CONFIG_KEY } });
  if (!row) {
    return null;
  }

  const stored = row.value as StoredSmtpSettings;

  const candidate: Partial<SmtpSettings> = {
    host: stored.host,
    port: typeof stored.port === 'number' ? stored.port : Number(stored.port),
    user: stored.user,
    pass: stored.pass,
    from: stored.from
  };

  return isCompleteSmtpSettings(candidate) ? candidate : null;
}

export async function getEffectiveSmtpSettings(): Promise<{ settings: SmtpSettings | null; source: 'database' | 'environment' | 'none' }> {
  const stored = await getStoredSmtpSettings();
  if (stored) {
    return { settings: stored, source: 'database' };
  }

  const env = fromEnv();
  if (env) {
    return { settings: env, source: 'environment' };
  }

  return { settings: null, source: 'none' };
}

export async function saveSmtpSettings(input: {
  host: string;
  port: number;
  user: string;
  pass?: string;
  from: string;
}): Promise<void> {
  const existing = await prisma.systemSetting.findUnique({ where: { key: SMTP_CONFIG_KEY } });
  const existingValue = (existing?.value as StoredSmtpSettings | undefined) ?? {};

  const nextPass = input.pass && input.pass.length > 0 ? input.pass : existingValue.pass;

  if (!nextPass || nextPass.length === 0) {
    throw new Error('SMTP password is required on first configuration.');
  }

  const value: SmtpSettings = {
    host: input.host,
    port: input.port,
    user: input.user,
    pass: nextPass ?? '',
    from: input.from
  };

  await prisma.systemSetting.upsert({
    where: { key: SMTP_CONFIG_KEY },
    create: {
      key: SMTP_CONFIG_KEY,
      value: value as unknown as Prisma.InputJsonValue
    },
    update: {
      value: value as unknown as Prisma.InputJsonValue
    }
  });
}
