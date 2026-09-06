// `Lore Onboarding.dc.html` — the first-launch sheet. Three states share one
// card: sign in (Apple / Google / email link), the local-vault explainer, and
// the "check your inbox" waiting state. The card floats over a scrim covering
// the whole window, so nothing behind it is reachable until a lane is chosen.
//
// Identity providers and mail delivery are not wired up yet; picking one lands
// in the same place as the local vault, with `auth.mode` recording which lane
// the user took.

import { useEffect, useRef, useState } from 'react';

import { cn } from '../../lib/cn';
import { useStore } from '../../store/useStore';
import { LoreMark, WORDMARK_FONT } from '../common/LoreMark';
import { AppleIcon, GoogleIcon, SettingsIcon } from '../common/settingsGlyphs';

const BUTTON_BASE =
    'text-title flex h-[42px] w-full cursor-pointer items-center justify-center gap-[9px] rounded-10 font-[inherit]';

/** Apple / Google rows — the design brightens them on hover. */
const SOCIAL_BUTTON = cn(BUTTON_BASE, 'hover:brightness-[1.35]');

/** Accent-filled call to action. */
const PRIMARY_BUTTON = cn(
    BUTTON_BASE,
    'gap-2 border-none bg-accent font-semibold text-white not-disabled:hover:brightness-[1.18] disabled:cursor-not-allowed disabled:opacity-45',
);

/** Outlined secondary action (Resend link). */
const GHOST_BUTTON = cn(
    BUTTON_BASE,
    'gap-2 border border-dash bg-surface font-[560] text-text hover:bg-surface2',
);

/** Text-only "back" affordance under the primary action. */
const QUIET_BUTTON =
    'text-subhead mt-[6px] flex h-[38px] w-full cursor-pointer items-center justify-center rounded-10 border-none bg-transparent font-[inherit] text-text2 hover:bg-sel hover:text-text';

/** The dashed "continue without an account" card. */
const ANON_CARD_ROW =
    'flex cursor-pointer items-start gap-[11px] rounded-11 border border-dashed border-dash px-[13px] py-3 hover:border-accent hover:bg-surface2';

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
        <div className="absolute inset-0 z-100 flex items-center justify-center bg-[radial-gradient(125%_120%_at_72%_8%,#dadce6_0%,#c8cad7_46%,#b9bbcb_100%)]">
            <div
                aria-label="Set up Lore"
                aria-modal="true"
                className="max-h-[calc(100%-60px)] w-[428px] overflow-y-auto rounded-2xl border border-border bg-surface text-text shadow-float"
                role="dialog"
            >
                <div className="px-[34px] pt-[26px] pb-[30px]">
                    <div className="flex justify-center text-accent">
                        <LoreMark size={34} />
                    </div>
                    <h2
                        className="mt-4 mb-0 text-center text-[31px] leading-[1.15] font-normal tracking-[-.01em]"
                        // The wordmark's face is the mark's own, not the UI font.
                        style={{ fontFamily: WORDMARK_FONT }}
                    >
                        {copy.title}
                    </h2>
                    <p className="mt-[9px] mb-0 text-center text-subhead leading-[1.55] text-pretty text-text2">
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

                    <p className="mt-[18px] mb-0 text-center text-label leading-[1.5] text-pretty text-faint">
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
            <div className="mt-[22px] flex flex-col gap-px overflow-hidden rounded-xl border border-border">
                {ANON_FACTS.map((f) => (
                    <div
                        className="flex items-start gap-[11px] border-b border-border-soft bg-surface2 px-[15px] py-[13px]"
                        key={f.title}
                    >
                        <span
                            className="mt-px inline-flex"
                            // Each fact carries its own accent colour.
                            style={{ color: f.color }}
                        >
                            <SettingsIcon name={f.icon} size={17} sw={1.7} />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-body-lg font-semibold">{f.title}</span>
                            <span className="mt-[2px] block text-body leading-[1.45] text-text3">
                                {f.body}
                            </span>
                        </span>
                    </div>
                ))}
            </div>

            <button className={cn(PRIMARY_BUTTON, 'mt-4')} onClick={onStart} type="button">
                Start a local vault
            </button>
            <button className={QUIET_BUTTON} onClick={onBack} type="button">
                Back to sign in
            </button>
        </>
    );
}

function Divider() {
    return (
        <div className="my-[18px] flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-caption tracking-[.08em] text-faint uppercase">or</span>
            <span className="h-px flex-1 bg-border" />
        </div>
    );
}

function Legal({ children, href }: { children: React.ReactNode; href: string }) {
    return (
        <a className="text-text2 no-underline" href={href}>
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
            <div className="mt-[22px] rounded-xl border border-border bg-surface2 p-4 text-center">
                <div className="font-mono text-body text-text">{email}</div>
                <div className="mt-[6px] text-body leading-[1.5] text-text3">
                    The link is valid for 15 minutes and signs in this Mac only.
                </div>
            </div>

            <button className={cn(GHOST_BUTTON, 'mt-4')} onClick={onResend} type="button">
                Resend link
            </button>
            <button className={QUIET_BUTTON} onClick={onBack} type="button">
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
            <div className="mt-6 flex flex-col gap-[9px]">
                <button
                    className={cn(SOCIAL_BUTTON, 'border-none bg-black font-[590] text-white')}
                    onClick={() => onProvider('apple')}
                    type="button"
                >
                    <AppleIcon />
                    Continue with Apple
                </button>
                <button
                    className={cn(
                        SOCIAL_BUTTON,
                        'border border-dash bg-surface font-[560] text-text',
                    )}
                    onClick={() => onProvider('google')}
                    type="button"
                >
                    <GoogleIcon />
                    Continue with Google
                </button>
            </div>

            <Divider />

            <label
                className={cn(
                    'flex h-[42px] cursor-text items-center gap-[10px] rounded-10 border px-[13px]',
                    focused
                        ? 'border-accent shadow-[0_0_0_3px_rgba(57,58,74,.10)]'
                        : 'border-dash shadow-none',
                )}
            >
                <span className="inline-flex text-text3">
                    <SettingsIcon name="mail" size={16} sw={1.7} />
                </span>
                <input
                    className="min-w-0 flex-1 border-none bg-transparent font-[inherit] text-title text-text outline-none"
                    onBlur={() => setFocused(false)}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && emailValid) onMagicLink();
                    }}
                    placeholder="you@company.com"
                    ref={emailRef}
                    type="email"
                    value={email}
                />
            </label>

            <button
                className={cn(PRIMARY_BUTTON, 'mt-[9px]')}
                disabled={!emailValid}
                onClick={onMagicLink}
                type="button"
            >
                Email me a sign-in link
            </button>

            <div className="mt-[22px] mb-[18px] h-px bg-border-soft" />

            <div className={ANON_CARD_ROW} onClick={onAnonymous}>
                <span className="mt-px inline-flex text-text2">
                    <SettingsIcon name="lock" size={17} sw={1.7} />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-subhead font-semibold">
                        Continue without an account
                    </span>
                    <span className="mt-[2px] block text-body leading-[1.45] text-text3">
                        Everything stays in a local vault on this Mac. No sync, no email.
                    </span>
                </span>
                <span className="mt-[3px] inline-flex text-dash">
                    <SettingsIcon name="chevronRight" size={15} sw={1.7} />
                </span>
            </div>
        </>
    );
}
