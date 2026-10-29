"use client";

import { useActionState } from "react";
import { requestMagicLink, type LoginState } from "@/app/login/actions";

const INITIAL: LoginState = { sent: false };

/** The text comes from the server page, already in the language of lineup.config.ts. */
export interface LoginText {
  sentTitle: string;
  sentBody: string;
  sentHint: string;
  emailLabel: string;
  invalid: string;
  send: string;
  sending: string;
}

export default function LoginForm({ text }: { text: LoginText }) {
  const [state, action, pending] = useActionState(requestMagicLink, INITIAL);

  if (state.sent) {
    return (
      <div role="status" className="notice ok">
        <p>
          <b>{text.sentTitle}</b>
        </p>
        <p>{text.sentBody}</p>
        <p className="muted">{text.sentHint}</p>
      </div>
    );
  }

  return (
    <form action={action} className="card">
      <label className="field" htmlFor="email">
        {text.emailLabel}
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoCapitalize="none"
          aria-invalid={state.invalid ? true : undefined}
          aria-describedby={state.invalid ? "email-error" : undefined}
          placeholder="tu@correo.com"
        />
      </label>
      {state.invalid ? (
        <p id="email-error" className="notice">
          {text.invalid}
        </p>
      ) : null}
      <button type="submit" className="submit" disabled={pending}>
        {pending ? text.sending : text.send}
      </button>
    </form>
  );
}
