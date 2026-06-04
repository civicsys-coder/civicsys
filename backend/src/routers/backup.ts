import { z } from "zod";
import { initTRPC } from "@trpc/server";
import type { Context } from "../context/trpc.context.js";
import { getEmailProvider } from "../services/email.service.js";

const t = initTRPC.context<Context>().create();

const BackupEmailInput = z.object({
  to: z.string().email("email inválido"),
  encryptedKeystore: z.string().min(1, "keystore requerido"),
});

export const backupRouter = t.router({
  // Reenvía el respaldo CIFRADO por email. El backend NUNCA descifra ni persiste
  // la clave: solo es un relay del blob (inútil sin la contraseña del ciudadano).
  email: t.procedure.input(BackupEmailInput).mutation(async ({ input }) => {
    const provider = getEmailProvider();
    await provider.send({
      to: input.to,
      subject: "Tu respaldo cifrado de Cédula Cívica",
      body:
        "Adjuntamos tu respaldo cifrado. Solo tu contraseña puede abrirlo.\n\n" +
        input.encryptedKeystore,
    });
    return { ok: true };
  }),
});
