/**
 * EmailService: reenvía backups cifrados. NUNCA descifra ni persiste la clave.
 * Provider pluggable: en dev usa consola; en prod, un provider real detrás de env.
 * Ver ADR-007 (wallet no-custodial + backup cifrado).
 */
export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface EmailProvider {
  send(msg: EmailMessage): Promise<void>;
}

export class ConsoleEmailProvider implements EmailProvider {
  async send(msg: EmailMessage): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[email:mock] to=${msg.to} subject="${msg.subject}" bytes=${msg.body.length}`);
  }
}

export function getEmailProvider(): EmailProvider {
  // Sprint 03: solo consola. Real (Resend/nodemailer) se enchufa acá vía env.
  return new ConsoleEmailProvider();
}
