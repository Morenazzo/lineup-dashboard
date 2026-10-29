import { redirect } from "next/navigation";
import LoginForm from "@/app/login/LoginForm";
import config from "@/lineup.config";
import { getAdminSession } from "@/lib/db/auth";
import { supabaseAuthConfigured } from "@/lib/db/env";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata = { robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: Props) {
  if (await getAdminSession()) redirect("/dashboard");

  const lang = config.lang;
  const notices: Record<string, string> = {
    link: t(lang, "Ese enlace no funcionó. Puede haber vencido o ya se usó. Pide uno nuevo."),
    not_admin: t(lang, "Esa cuenta no tiene permiso para entrar."),
    config: t(lang, "Falta configurar Supabase: faltan las variables de entorno (revisa .env.local)."),
  };
  const raw = (await searchParams).error;
  const error = Array.isArray(raw) ? raw[0] : raw;
  const notice = error ? notices[error] : undefined;
  const configured = supabaseAuthConfigured();

  return (
    <main className="shell narrow">
      <div>
        <h1 className="name">{t(lang, "Entrar")}</h1>
        <p className="muted">{t(lang, "Solo las personas autorizadas pueden ver el panel.")}</p>
      </div>

      {notice ? (
        <p role="alert" className="notice">
          {notice}
        </p>
      ) : null}

      {configured ? (
        <LoginForm
          text={{
            sentTitle: t(lang, "Revisa tu correo."),
            sentBody: t(lang, "Si esa dirección puede entrar, el enlace va en camino. Funciona una vez y vence pronto. Ábrelo en este navegador."),
            sentHint: t(lang, "¿Nada después de dos minutos? Revisa el spam y que la dirección esté en ADMIN_EMAILS."),
            emailLabel: t(lang, "Correo"),
            invalid: t(lang, "Escribe un correo válido."),
            send: t(lang, "Envíame un enlace para entrar"),
            sending: t(lang, "Enviando..."),
          }}
        />
      ) : (
        !notice && <p className="muted">{notices.config}</p>
      )}
    </main>
  );
}
