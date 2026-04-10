import nodemailer from 'nodemailer';
import { logger } from '../config/logger';
import { getEffectiveSmtpSettings } from './smtp-settings';

const transporters = new Map<string, nodemailer.Transporter>();

function transporterCacheKey(settings: {
  host: string;
  port: number;
  user: string;
  pass: string;
}): string {
  return `${settings.host}:${settings.port}:${settings.user}:${settings.pass}`;
}

async function getTransporter(): Promise<{ transporter: nodemailer.Transporter; from: string } | null> {
  const effective = await getEffectiveSmtpSettings();
  if (!effective.settings) {
    logger.warn('SMTP is not fully configured, skipping email send');
    return null;
  }

  const key = transporterCacheKey(effective.settings);
  let transporter = transporters.get(key);

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: effective.settings.host,
      port: effective.settings.port,
      secure: Number(effective.settings.port) === 465,
      auth: {
        user: effective.settings.user,
        pass: effective.settings.pass
      }
    });

    transporters.set(key, transporter);
  }

  return {
    transporter,
    from: effective.settings.from
  };
}

export async function sendMail(options: { to: string; subject: string; text: string; html?: string }): Promise<void> {
  const activeTransporter = await getTransporter();
  if (!activeTransporter) {
    return;
  }

  await activeTransporter.transporter.sendMail({
    from: activeTransporter.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html
  });
}

export async function sendSmtpTestEmail(to: string): Promise<void> {
  await sendMail({
    to,
    subject: 'Test SMTP - Projekt',
    text: 'To jest testowa wiadomosc SMTP z panelu administratora.',
    html: '<p>To jest <strong>testowa</strong> wiadomosc SMTP z panelu administratora.</p>'
  });
}

export async function sendPasswordResetCodeEmail(email: string, code: string): Promise<void> {
  await sendMail({
    to: email,
    subject: 'Kod jednorazowy do resetu hasla',
    text: `Twoj kod jednorazowy: ${code}. Kod wygasa za 10 minut.`,
    html: `<p>Twoj kod jednorazowy: <strong>${code}</strong></p><p>Kod wygasa za 10 minut.</p>`
  });
}

export async function sendOrderCreatedEmail(params: {
  email: string;
  orderGroupId: string;
  totalPrice: number;
  promotionName?: string | null;
}): Promise<void> {
  await sendMail({
    to: params.email,
    subject: 'Potwierdzenie zakupu',
    text: `Dziekujemy za zakup. Numer transakcji: ${params.orderGroupId}. Kwota: ${params.totalPrice.toFixed(2)} PLN.${params.promotionName ? ` Promocja: ${params.promotionName}.` : ''}`,
    html: `<p>Dziekujemy za zakup.</p><p>Numer transakcji: <strong>${params.orderGroupId}</strong></p><p>Kwota: <strong>${params.totalPrice.toFixed(2)} PLN</strong></p>${params.promotionName ? `<p>Promocja: <strong>${params.promotionName}</strong></p>` : ''}`
  });
}

export async function sendOrderStatusChangedEmail(params: {
  email: string;
  orderId: string;
  status: string;
  gameTitle?: string;
}): Promise<void> {
  await sendMail({
    to: params.email,
    subject: 'Aktualizacja statusu zamowienia',
    text: `Status zamowienia ${params.orderId} (${params.gameTitle ?? 'gra'}) zmienil sie na: ${params.status}.`,
    html: `<p>Status zamowienia <strong>${params.orderId}</strong>${params.gameTitle ? ` (${params.gameTitle})` : ''} zmienil sie na: <strong>${params.status}</strong>.</p>`
  });
}
