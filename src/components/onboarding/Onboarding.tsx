// `Lore Onboarding.dc.html` — the first-launch sheet. Three states share one
// card: sign in (Apple / Google / email link), the local-vault explainer, and
// the "check your inbox" waiting state. The card floats over a scrim covering
// the whole window, so nothing behind it is reachable until a lane is chosen.
//
// Identity providers and mail delivery are not wired up yet; picking one lands
// in the same place as the local vault, with `auth.mode` recording which lane
// the user took.

import { useEffect, useRef, useState } from "react";
import { useStore } from "../../store/useStore";
import { LoreMark, WORDMARK_FONT } from "../common/LoreMark";
import { AppleIcon, GoogleIcon, SettingsIcon } from "../common/settingsGlyphs";
import {
  anonCardRow,
  ghostButton,
  primaryButton,
  quietButton,
  socialButton,
} from "./Onboarding.css";

const COPY = {
  signin: {
    title: "Welcome to Lore",
    body: "Sign in to sync your knowledge base across every device, or keep it local to this Mac.",
  },
  anon: {
    title: "Local vault",
    body: "Lore will run entirely on this Mac. Nothing leaves the device unless you sign in later.",
  },
  magic: {
    title: "Check your inbox",
    body: "We sent a sign-in link. Open it on this Mac to finish setting up Lore.",
  },
} as const;

/** The three promises the anonymous lane makes, with their own icon colours. */
const ANON_FACTS = [
  {
    title: "Stored on this Mac",
    body: "~/Library/Application Support/Lore — encrypted with your login keychain.",
    color: "#4d855f",
    icon: "screen",
  },
  {
    title: "AI runs on-device",
    body: "Summaries and tagging use the local model. Cloud AI stays off until you sign in.",
    color: "var(--ac)",
    icon: "spark4",
  },
  {
    title: "No sync, no sharing",
    body: "Public links, mobile capture, and team collections need an account.",
    color: "#9e7b46",
    icon: "noSync",
  },
] as const;

const EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

export function Onboarding() {
  const step = useStore((s) => s.onboardingStep);
  const setStep = useStore((s) => s.setOnboardingStep);
  const requestMagicLink = useStore((s) => s.requestMagicLink);
  const finish = useStore((s) => s.finishOnboarding);
  const sentTo = useStore((s) => s.auth.email);

  const [email, setEmail] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const emailValid = EMAIL_RE.test(email.trim());

  // The email field is the primary target on the sign-in card.
  useEffect(() => {
    if (step === "signin") emailRef.current?.focus();
  }, [step]);

  const copy = COPY[step];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(125% 120% at 72% 8%, #dadce6 0%, #c8cad7 46%, #b9bbcb 100%)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Set up Lore"
        style={{
          width: 428,
          maxHeight: "calc(100% - 60px)",
          overflowY: "auto",
          background: "var(--surface, #fff)",
          color: "var(--text, #1a1a1f)",
          borderRadius: 16,
          boxShadow: "0 30px 72px -20px rgba(24,24,48,.42), 0 6px 16px rgba(0,0,0,.07)",
          border: "1px solid rgba(0,0,0,.05)",
        }}
      >
        <div style={{ padding: "26px 34px 30px" }}>
          <div style={{ display: "flex", justifyContent: "center", color: "var(--ac)" }}>
            <LoreMark size={34} />
          </div>
          <h2
            style={{
              margin: "16px 0 0",
              fontFamily: WORDMARK_FONT,
              fontSize: 31,
              fontWeight: 400,
              letterSpacing: "-.01em",
              lineHeight: 1.15,
              textAlign: "center",
            }}
          >
            {copy.title}
          </h2>
          <p
            style={{
              margin: "9px 0 0",
              fontSize: 13.5,
              lineHeight: 1.55,
              color: "var(--text2, #6b6b76)",
              textAlign: "center",
              textWrap: "pretty",
            }}
          >
            {copy.body}
          </p>

          {step === "signin" && (
            <SignInCard
              email={email}
              setEmail={setEmail}
              emailRef={emailRef}
              emailValid={emailValid}
              onMagicLink={() => requestMagicLink(email.trim())}
              onProvider={(provider) => finish("account", `${provider}-account`)}
              onAnonymous={() => setStep("anon")}
            />
          )}

          {step === "anon" && (
            <AnonymousCard
              onStart={() => finish("anonymous")}
              onBack={() => setStep("signin")}
            />
          )}

          {step === "magic" && (
            <MagicLinkCard
              email={sentTo ?? email}
              onResend={() => requestMagicLink(sentTo ?? email)}
              onBack={() => setStep("signin")}
            />
          )}

          <p
            style={{
              margin: "18px 0 0",
              fontSize: 11.5,
              lineHeight: 1.5,
              color: "var(--faint, #a8a8b0)",
              textAlign: "center",
              textWrap: "pretty",
            }}
          >
            By continuing you agree to the <Legal href="#terms">Terms</Legal> and{" "}
            <Legal href="#privacy">Privacy Policy</Legal>.
          </p>
        </div>
      </div>
    </div>
  );
}

function Legal({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} style={{ color: "var(--text2, #393A4A)", textDecoration: "none" }}>
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------ *
 * State 1 — sign in
 * ------------------------------------------------------------------ */

interface SignInProps {
  email: string;
  setEmail: (v: string) => void;
  emailRef: React.RefObject<HTMLInputElement | null>;
  emailValid: boolean;
  onMagicLink: () => void;
  onProvider: (provider: "apple" | "google") => void;
  onAnonymous: () => void;
}

function SignInCard({
  email,
  setEmail,
  emailRef,
  emailValid,
  onMagicLink,
  onProvider,
  onAnonymous,
}: SignInProps) {
  const [focused, setFocused] = useState(true);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 24 }}>
        <button
          type="button"
          className={socialButton}
          onClick={() => onProvider("apple")}
          style={{ background: "#000", color: "#fff", border: "none", fontWeight: 590 }}
        >
          <AppleIcon />
          Continue with Apple
        </button>
        <button
          type="button"
          className={socialButton}
          onClick={() => onProvider("google")}
          style={{
            background: "var(--surface, #fff)",
            border: "1px solid var(--dash, #d2d2dc)",
            color: "var(--text, #2c2c34)",
            fontWeight: 560,
          }}
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </div>

      <Divider />

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          height: 42,
          border: `1px solid ${focused ? "var(--ac)" : "var(--dash, #d2d2dc)"}`,
          borderRadius: 10,
          padding: "0 13px",
          boxShadow: focused ? "0 0 0 3px rgba(57,58,74,.10)" : "none",
          cursor: "text",
        }}
      >
        <span style={{ display: "inline-flex", color: "var(--text3, #9a9aa5)" }}>
          <SettingsIcon name="mail" size={16} sw={1.7} />
        </span>
        <input
          ref={emailRef}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && emailValid) onMagicLink();
          }}
          placeholder="you@company.com"
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            font: "inherit",
            fontSize: 14,
            color: "var(--text, #1a1a1f)",
          }}
        />
      </label>

      <button
        type="button"
        className={primaryButton}
        disabled={!emailValid}
        onClick={onMagicLink}
        style={{ marginTop: 9 }}
      >
        Email me a sign-in link
      </button>

      <div style={{ height: 1, background: "var(--border-soft, #f0f0f2)", margin: "22px 0 18px" }} />

      <div className={anonCardRow} onClick={onAnonymous}>
        <span style={{ display: "inline-flex", color: "var(--text2, #6b6b76)", marginTop: 1 }}>
          <SettingsIcon name="lock" size={17} sw={1.7} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>
            Continue without an account
          </span>
          <span
            style={{
              display: "block",
              fontSize: 12.5,
              color: "var(--text3, #8a8a95)",
              marginTop: 2,
              lineHeight: 1.45,
            }}
          >
            Everything stays in a local vault on this Mac. No sync, no email.
          </span>
        </span>
        <span style={{ display: "inline-flex", color: "var(--dash, #c4c4cc)", marginTop: 3 }}>
          <SettingsIcon name="chevronRight" size={15} sw={1.7} />
        </span>
      </div>
    </>
  );
}

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
      <span style={{ height: 1, flex: 1, background: "var(--border, #ececef)" }} />
      <span
        style={{
          fontSize: 11,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--faint, #a8a8b0)",
        }}
      >
        or
      </span>
      <span style={{ height: 1, flex: 1, background: "var(--border, #ececef)" }} />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * State 2 — anonymous / local vault
 * ------------------------------------------------------------------ */

function AnonymousCard({ onStart, onBack }: { onStart: () => void; onBack: () => void }) {
  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          marginTop: 22,
          border: "1px solid var(--border, #ececef)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {ANON_FACTS.map((f) => (
          <div
            key={f.title}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 11,
              padding: "13px 15px",
              background: "var(--surface2, #fafafa)",
              borderBottom: "1px solid var(--border-soft, #f0f0f2)",
            }}
          >
            <span style={{ display: "inline-flex", color: f.color, marginTop: 1 }}>
              <SettingsIcon name={f.icon} size={17} sw={1.7} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{f.title}</span>
              <span
                style={{
                  display: "block",
                  fontSize: 12.5,
                  color: "var(--text3, #8a8a95)",
                  marginTop: 2,
                  lineHeight: 1.45,
                }}
              >
                {f.body}
              </span>
            </span>
          </div>
        ))}
      </div>

      <button type="button" className={primaryButton} onClick={onStart} style={{ marginTop: 16 }}>
        Start a local vault
      </button>
      <button type="button" className={quietButton} onClick={onBack}>
        Back to sign in
      </button>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * State 3 — magic link sent
 * ------------------------------------------------------------------ */

function MagicLinkCard({
  email,
  onResend,
  onBack,
}: {
  email: string;
  onResend: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <div
        style={{
          marginTop: 22,
          border: "1px solid var(--border, #ececef)",
          borderRadius: 12,
          padding: 16,
          background: "var(--surface2, #fafafa)",
          textAlign: "center",
        }}
      >
        <div style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12.5, color: "var(--text, #2c2c34)" }}>
          {email}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: "var(--text3, #8a8a95)",
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          The link is valid for 15 minutes and signs in this Mac only.
        </div>
      </div>

      <button type="button" className={ghostButton} onClick={onResend} style={{ marginTop: 16 }}>
        Resend link
      </button>
      <button type="button" className={quietButton} onClick={onBack}>
        Use a different method
      </button>
    </>
  );
}
