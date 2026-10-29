import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import config from "@/lineup.config";
import { t } from "@/lib/i18n";
import { parseProfile } from "@/lib/profile/schema";
import rawProfile from "@/profile.json";

const profile = parseProfile(rawProfile);

export function generateMetadata(): Metadata {
  const title = profile.name ? `${profile.name} | ${config.appName}` : config.appName;
  return { title, description: profile.concept || config.about || undefined };
}

/** The public card: who you are, what you build and your resume. Nothing private is read here. */
export default function Home() {
  if (!config.profile.enabled) redirect("/dashboard");
  const lang = config.lang;
  const { resume } = profile;
  const hasResume = Boolean(resume.summary || resume.items.length || resume.downloadUrl);

  return (
    <main className="shell">
      <section className="card" aria-labelledby="who">
        <div className="hero">
          {profile.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="avatar" src={profile.avatar} alt="" width={88} height={88} />
          ) : null}
          <div>
            <h1 className="name" id="who">
              {profile.name || config.name || config.appName}
            </h1>
            {profile.headline ? <p className="headline">{profile.headline}</p> : null}
            {profile.location ? <p className="muted">{profile.location}</p> : null}
          </div>
        </div>
        {profile.concept ? (
          <>
            <span className="eyebrow">{t(lang, "Concepto")}</span>
            <p className="concept">{profile.concept}</p>
          </>
        ) : null}
        {profile.links.length ? (
          <ul className="links" aria-label={t(lang, "Enlaces")}>
            {profile.links.map((link) => (
              <li key={link.url}>
                <a href={link.url} rel="noopener noreferrer" target={link.url.startsWith("mailto:") ? undefined : "_blank"}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {hasResume ? (
        <section className="card" aria-labelledby="resume">
          <span className="eyebrow" id="resume">
            {t(lang, "Currículum")}
          </span>
          {resume.summary ? <p>{resume.summary}</p> : null}
          {resume.items.length ? (
            <ul className="timeline">
              {resume.items.map((item) => (
                <li key={`${item.title}-${item.period}`}>
                  <b>{item.url ? <a href={item.url} rel="noopener noreferrer" target="_blank">{item.title}</a> : item.title}</b>
                  <span className="muted">{[item.org, item.period].filter(Boolean).join(" · ")}</span>
                  {item.note ? <span>{item.note}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
          {resume.downloadUrl ? (
            <p>
              <a className="button primary" href={resume.downloadUrl} rel="noopener noreferrer" target="_blank">
                {t(lang, "Descargar currículum")}
              </a>
            </p>
          ) : null}
        </section>
      ) : null}

      <footer className="footer">
        <span>{t(lang, "Hecho con Lineup")}</span>
        <Link href="/dashboard">{t(lang, "Panel privado")}</Link>
      </footer>
    </main>
  );
}
