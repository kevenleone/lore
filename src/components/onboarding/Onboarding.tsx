// `Lore Onboarding.dc.html` — the first-launch sheet. Three states share one
// card: sign in (Apple / Google / email link), the local-vault explainer, and
// the "check your inbox" waiting state. The card floats over a scrim covering
// the whole window, so nothing behind it is reachable until a lane is chosen.
//
// Identity providers and mail delivery are not wired up yet; picking one lands
// in the same place as the local vault, with `auth.mode` recording which lane
// the user took.

import { useEffect, useRef, useState } from 'react';

import { useStore } from '../../store/useStore';
import { LoreMark, WORDMARK_FONT } from '../common/LoreMark';
import { AppleIcon, GoogleIcon, SettingsIcon } from '../common/settingsGlyphs';
import {
    anonCardRow,
    ghostButton,
    primaryButton,
    quietButton,
    socialButton,
} from './Onboarding.css';

const COPY = {
    anon: {
        body: 'Lore will run entirely on this Mac. Nothing leaves the device unless you sign in later.',
        title: 'Local vault',
    },
    magic: {
        body: 'We sent a sign-in link. Open it on this Mac to finish setting up Lore.',
        title: 'Check your inbox',
    },
    signin: {
        body: 'Sign in to sync your knowledge base across every device, or keep it local to this Mac.',
        title: 'Welcome to Lore',
    },
} as const;

/** The three promises the anonymous lane makes, with their own icon colours. */
const ANON_FACTS = [
    {
        body: '~/Library/Application Support/Lore — encrypted with your login keychain.',
        color: '#4d855f',
        icon: 'screen',
        title: 'Stored on this Mac',
    },
    {
        body: 'Summaries and tagging use the local model. Cloud AI stays off until you sign in.',
        color: 'var(--ac)',
        icon: 'spark4',
        title: 'AI runs on-device',
    },
    {
        body: 'Public links, mobile capture, and team collections need an account.',
        color: '#9e7b46',
        icon: 'noSync',
        title: 'No sync, no sharing',
    },
] as const;

const EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

interface SignInProps {
    email: string;
    emailRef: React.RefObject<HTMLInputElement | null>;
    emailValid: boolean;
    onAnonymous: () => void;
    onMagicLink: () => void;
    onProvider: (provider: 'apple' | 'google') => void;
    setEmail: (v: string) => void;
}

export function Onboarding() {
    const step = useStore((s) => s.onboardingStep);
    const setStep = useStore((s) => s.setOnboardingStep);
    const requestMagicLink = useStore((s) => s.requestMagicLink);
    const finish = useStore((s) => s.finishOnboarding);
    const sentTo = useStore((s) => s.auth.email);

    const [email, setEmail] = useState('');
    const emailRef = useRef<HTMLInputElement>(null);
    const emailValid = EMAIL_RE.test(email.trim());

    // The email field is the primary target on the sign-in card.
    useEffect(() => {
        if (step === 'signin') emailRef.current?.focus();
    }, [step]);

    const copy = COPY[step];

    return (
        <div
            style={{
                alignItems: 'center',
                background:
                    'radial-gradient(125% 120% at 72% 8%, #dadce6 0%, #c8cad7 46%, #b9bbcb 100%)',
                display: 'flex',
                inset: 0,
                justifyContent: 'center',
                position: 'absolute',
                zIndex: 100,
            }}
        >
            <div
                aria-label="Set up Lore"
                aria-modal="true"
                role="dialog"
                style={{
                    background: 'var(--surface, #fff)',
                    border: '1px solid rgba(0,0,0,.05)',
                    borderRadius: 16,
                    boxShadow: '0 30px 72px -20px rgba(24,24,48,.42), 0 6px 16px rgba(0,0,0,.07)',
                    color: 'var(--text, #1a1a1f)',
                    maxHeight: 'calc(100% - 60px)',
                    overflowY: 'auto',
                    width: 428,
                }}
            >
                <div style={{ padding: '26px 34px 30px' }}>
                    <div style={{ color: 'var(--ac)', display: 'flex', justifyContent: 'center' }}>
                        <LoreMark size={34} />
                    </div>
                    <h2
                        style={{
                            fontFamily: WORDMARK_FONT,
                            fontSize: 31,
                            fontWeight: 400,
                            letterSpacing: '-.01em',
                            lineHeight: 1.15,
                            margin: '16px 0 0',
                            textAlign: 'center',
                        }}
                    >
                        {copy.title}
                    </h2>
                    <p
                        style={{
                            color: 'var(--text2, #6b6b76)',
                            fontSize: 13.5,
                            lineHeight: 1.55,
                            margin: '9px 0 0',
                            textAlign: 'center',
                            textWrap: 'pretty',
                        }}
                    >
                        {copy.body}
                    </p>

                    {step === 'signin' && (
                        <SignInCard
                            email={email}
                            emailRef={emailRef}
                            emailValid={emailValid}
                            onAnonymous={() => setStep('anon')}
                            onMagicLink={() => requestMagicLink(email.trim())}
                            onProvider={(provider) => finish('account', `${provider}-account`)}
                            setEmail={setEmail}
                        />
                    )}

                    {step === 'anon' && (
                        <AnonymousCard
                            onBack={() => setStep('signin')}
                            onStart={() => finish('anonymous')}
                        />
                    )}

                    {step === 'magic' && (
                        <MagicLinkCard
                            email={sentTo ?? email}
                            onBack={() => setStep('signin')}
                            onResend={() => requestMagicLink(sentTo ?? email)}
                        />
                    )}

                    <p
                        style={{
                            color: 'var(--faint, #a8a8b0)',
                            fontSize: 11.5,
                            lineHeight: 1.5,
                            margin: '18px 0 0',
                            textAlign: 'center',
                            textWrap: 'pretty',
                        }}
                    >
                        By continuing you agree to the <Legal href="#terms">Terms</Legal> and{' '}
                        <Legal href="#privacy">Privacy Policy</Legal>.
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ *
 * State 1 — sign in
 * ------------------------------------------------------------------ */

function AnonymousCard({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
    return (
        <>
            <div
                style={{
                    border: '1px solid var(--border, #ececef)',
                    borderRadius: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    marginTop: 22,
                    overflow: 'hidden',
                }}
            >
                {ANON_FACTS.map((f) => (
                    <div
                        key={f.title}
                        style={{
                            alignItems: 'flex-start',
                            background: 'var(--surface2, #fafafa)',
                            borderBottom: '1px solid var(--border-soft, #f0f0f2)',
                            display: 'flex',
                            gap: 11,
                            padding: '13px 15px',
                        }}
                    >
                        <span style={{ color: f.color, display: 'inline-flex', marginTop: 1 }}>
                            <SettingsIcon name={f.icon} size={17} sw={1.7} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>
                                {f.title}
                            </span>
                            <span
                                style={{
                                    color: 'var(--text3, #8a8a95)',
                                    display: 'block',
                                    fontSize: 12.5,
                                    lineHeight: 1.45,
                                    marginTop: 2,
                                }}
                            >
                                {f.body}
                            </span>
                        </span>
                    </div>
                ))}
            </div>

            <button
                className={primaryButton}
                onClick={onStart}
                style={{ marginTop: 16 }}
                type="button"
            >
                Start a local vault
            </button>
            <button className={quietButton} onClick={onBack} type="button">
                Back to sign in
            </button>
        </>
    );
}

function Divider() {
    return (
        <div style={{ alignItems: 'center', display: 'flex', gap: 12, margin: '18px 0' }}>
            <span style={{ background: 'var(--border, #ececef)', flex: 1, height: 1 }} />
            <span
                style={{
                    color: 'var(--faint, #a8a8b0)',
                    fontSize: 11,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                }}
            >
                or
            </span>
            <span style={{ background: 'var(--border, #ececef)', flex: 1, height: 1 }} />
        </div>
    );
}

function Legal({ children, href }: { children: React.ReactNode; href: string }) {
    return (
        <a href={href} style={{ color: 'var(--text2, #393A4A)', textDecoration: 'none' }}>
            {children}
        </a>
    );
}

/* ------------------------------------------------------------------ *
 * State 2 — anonymous / local vault
 * ------------------------------------------------------------------ */

function MagicLinkCard({
    email,
    onBack,
    onResend,
}: {
    email: string;
    onBack: () => void;
    onResend: () => void;
}) {
    return (
        <>
            <div
                style={{
                    background: 'var(--surface2, #fafafa)',
                    border: '1px solid var(--border, #ececef)',
                    borderRadius: 12,
                    marginTop: 22,
                    padding: 16,
                    textAlign: 'center',
                }}
            >
                <div
                    style={{
                        color: 'var(--text, #2c2c34)',
                        fontFamily: 'ui-monospace,Menlo,monospace',
                        fontSize: 12.5,
                    }}
                >
                    {email}
                </div>
                <div
                    style={{
                        color: 'var(--text3, #8a8a95)',
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        marginTop: 6,
                    }}
                >
                    The link is valid for 15 minutes and signs in this Mac only.
                </div>
            </div>

            <button
                className={ghostButton}
                onClick={onResend}
                style={{ marginTop: 16 }}
                type="button"
            >
                Resend link
            </button>
            <button className={quietButton} onClick={onBack} type="button">
                Use a different method
            </button>
        </>
    );
}

/* ------------------------------------------------------------------ *
 * State 3 — magic link sent
 * ------------------------------------------------------------------ */

function SignInCard({
    email,
    emailRef,
    emailValid,
    onAnonymous,
    onMagicLink,
    onProvider,
    setEmail,
}: SignInProps) {
    const [focused, setFocused] = useState(true);

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 24 }}>
                <button
                    className={socialButton}
                    onClick={() => onProvider('apple')}
                    style={{ background: '#000', border: 'none', color: '#fff', fontWeight: 590 }}
                    type="button"
                >
                    <AppleIcon />
                    Continue with Apple
                </button>
                <button
                    className={socialButton}
                    onClick={() => onProvider('google')}
                    style={{
                        background: 'var(--surface, #fff)',
                        border: '1px solid var(--dash, #d2d2dc)',
                        color: 'var(--text, #2c2c34)',
                        fontWeight: 560,
                    }}
                    type="button"
                >
                    <GoogleIcon />
                    Continue with Google
                </button>
            </div>

            <Divider />

            <label
                style={{
                    alignItems: 'center',
                    border: `1px solid ${focused ? 'var(--ac)' : 'var(--dash, #d2d2dc)'}`,
                    borderRadius: 10,
                    boxShadow: focused ? '0 0 0 3px rgba(57,58,74,.10)' : 'none',
                    cursor: 'text',
                    display: 'flex',
                    gap: 10,
                    height: 42,
                    padding: '0 13px',
                }}
            >
                <span style={{ color: 'var(--text3, #9a9aa5)', display: 'inline-flex' }}>
                    <SettingsIcon name="mail" size={16} sw={1.7} />
                </span>
                <input
                    onBlur={() => setFocused(false)}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && emailValid) onMagicLink();
                    }}
                    placeholder="you@company.com"
                    ref={emailRef}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text, #1a1a1f)',
                        flex: 1,
                        font: 'inherit',
                        fontSize: 14,
                        minWidth: 0,
                        outline: 'none',
                    }}
                    type="email"
                    value={email}
                />
            </label>

            <button
                className={primaryButton}
                disabled={!emailValid}
                onClick={onMagicLink}
                style={{ marginTop: 9 }}
                type="button"
            >
                Email me a sign-in link
            </button>

            <div
                style={{
                    background: 'var(--border-soft, #f0f0f2)',
                    height: 1,
                    margin: '22px 0 18px',
                }}
            />

            <div className={anonCardRow} onClick={onAnonymous}>
                <span
                    style={{ color: 'var(--text2, #6b6b76)', display: 'inline-flex', marginTop: 1 }}
                >
                    <SettingsIcon name="lock" size={17} sw={1.7} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>
                        Continue without an account
                    </span>
                    <span
                        style={{
                            color: 'var(--text3, #8a8a95)',
                            display: 'block',
                            fontSize: 12.5,
                            lineHeight: 1.45,
                            marginTop: 2,
                        }}
                    >
                        Everything stays in a local vault on this Mac. No sync, no email.
                    </span>
                </span>
                <span
                    style={{ color: 'var(--dash, #c4c4cc)', display: 'inline-flex', marginTop: 3 }}
                >
                    <SettingsIcon name="chevronRight" size={15} sw={1.7} />
                </span>
            </div>
        </>
    );
}
