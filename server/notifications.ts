import nodemailer from "nodemailer";

// 1. Comprobamos qué servicios están configurados
const isEmailConfigured = Boolean(
  process.env.SMTP_USER && process.env.SMTP_PASS,
);
const isTelegramConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN);

// 2. Inicializamos Email
const transporter = isEmailConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendAlertNotifications(
  contacts: any[],
  title: string,
  description: string,
) {
  const activeContacts = contacts.filter((c) => c.active);

  for (const contact of activeContacts) {
    // --- LÓGICA DE EMAIL ---
    if (contact.email) {
      if (isEmailConfigured && transporter) {
        try {
          await transporter.sendMail({
            from: `"Fábrica Piensos" <${process.env.SMTP_USER}>`,
            to: contact.email,
            subject: `⚠️ ALERTA: ${title}`,
            text: description,
          });
          console.log(`[NOTIFICACIÓN] Email real enviado a ${contact.email}`);
        } catch (error) {
          console.error(`[ERROR] Falló el email a ${contact.email}:`, error);
        }
      } else {
        console.log(`[SIMULACRO] Se enviaría un email a ${contact.email}`);
      }
    }

    // --- LÓGICA DE TELEGRAM ---
    if (contact.telegramId) {
      if (isTelegramConfigured && TELEGRAM_BOT_TOKEN) {
        try {
          const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
          const text = `⚠️ *ALERTA EN FÁBRICA*\n\n*${title}*\n${description}`;

          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: contact.telegramId,
              text: text,
              parse_mode: "Markdown",
            }),
          });

          if (!response.ok) {
            throw new Error(
              `Error de Telegram: ${response.status} ${response.statusText}`,
            );
          }
          console.log(
            `[NOTIFICACIÓN] Telegram real enviado a ${contact.telegramId}`,
          );
        } catch (error) {
          console.error(
            `[ERROR] Falló el Telegram a ${contact.telegramId}:`,
            error,
          );
        }
      } else {
        console.log(
          `[SIMULACRO] Se enviaría un Telegram a ${contact.telegramId}`,
        );
      }
    }
  }
}
