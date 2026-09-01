// The ten settings panes from `Lore Settings.dc.html`. Controls backed by real
// app state (accent, appearance, density, AI location, the switch set) write
// through the store and persist; the rest render the design's copy against
// placeholder figures until there is a backend to read them from.

import { useStore } from "../../store/useStore";
import { LoreMark } from "../common/LoreMark";
import { SettingsIcon, type SettingsIconName } from "../common/settingsGlyphs";
import type { Appearance } from "../../theme/tokens";
import {
  ACCENT_NAMES,
  ACCENTS,
  type Accent,
  type AiMode,
  type Density,
  type NotificationStyle,
  type Switches,
  type WeekStart,
} from "../../store/types";
import {
  Chooser,
  KeyCap,
  PillButton,
  Row,
  SectionLabel,
  Segmented,
  Toggle,
} from "./controls";
import { aboutLink, choiceCard, pillButton } from "./SettingsModal.css";

/** Binds a switch key to the store so panes stay declarative. */
function useSwitch(key: keyof Switches) {
  const on = useStore((s) => s.prefs.switches[key]);
  const toggle = useStore((s) => s.toggleSwitch);
  return { on, onChange: () => toggle(key) };
}

function SwitchRow({
  name,
  title,
  desc,
  last,
}: {
  name: keyof Switches;
  title: string;
  desc?: string;
  last?: boolean;
}) {
  const sw = useSwitch(name);
  return (
    <Row title={title} desc={desc} last={last}>
      <Toggle on={sw.on} onChange={sw.onChange} label={title} />
    </Row>
  );
}

/* ------------------------------------------------------------------ *
 * General
 * ------------------------------------------------------------------ */

export function GeneralPane() {
  const collections = useStore((s) => s.collections);
  const clip = useSwitch("clip");

  // "File new captures into" offers Inbox plus every real collection.
  const targets = ["Inbox", ...collections.map((c) => c.name)];

  return (
    <>
      <SectionLabel first>Startup</SectionLabel>
      <SwitchRow
        name="launch"
        title="Launch at login"
        desc="Lore starts quietly in the menu bar when you sign in."
      />
      <SwitchRow
        name="menubar"
        title="Show icon in the menu bar"
        desc="Hiding it leaves ⌥Space as the only way in."
      />
      <SwitchRow name="dock" title="Show icon in the Dock" last />

      <SectionLabel>Defaults</SectionLabel>
      <Row
        title="File new captures into"
        desc="Used when the AI can't confidently pick a collection."
      >
        <Chooser value={targets[0]} options={targets} />
      </Row>
      <Row title="Default capture type">
        <Chooser
          value="Detect automatically"
          options={["Detect automatically", "Link", "Note", "Task", "Code"]}
        />
      </Row>
      <Row
        title="Keep the clipboard after capture"
        desc="Lore reads a copied link to prefill the field."
        last
      >
        <Toggle on={clip.on} onChange={clip.onChange} label="Keep the clipboard after capture" />
      </Row>

      <SectionLabel>Storage</SectionLabel>
      <StorageMeter />
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <PillButton>Reveal library in Finder</PillButton>
        <PillButton>Clear snapshot cache</PillButton>
      </div>
    </>
  );
}

const STORAGE_SEGMENTS = [
  { label: "Files", size: "940 MB", share: 0.51, color: "var(--ac)" },
  { label: "Page snapshots", size: "560 MB", share: 0.3, color: "#8a92b8" },
  { label: "Search index", size: "340 MB", share: 0.19, color: "#c9c9d2" },
];

function StorageMeter() {
  return (
    <div
      style={{
        border: "1px solid var(--border, #e4e4ea)",
        borderRadius: 12,
        padding: "14px 16px",
        marginTop: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Local library</span>
        <span style={{ fontSize: 12.5, color: "var(--text3, #9a9aa5)" }}>1.84 GB of 5 GB</span>
      </div>
      <div
        style={{
          display: "flex",
          gap: 2,
          height: 8,
          borderRadius: 5,
          overflow: "hidden",
          background: "var(--surface3, #f1f1f3)",
          margin: "10px 0",
        }}
      >
        {STORAGE_SEGMENTS.map((s) => (
          <span key={s.label} style={{ flex: s.share, background: s.color }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {STORAGE_SEGMENTS.map((s) => (
          <span
            key={s.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--text3, #9a9aa5)",
            }}
          >
            <span
              style={{ width: 8, height: 8, borderRadius: 3, background: s.color, flex: "none" }}
            />
            {s.label} {s.size}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Account
 * ------------------------------------------------------------------ */

export function AccountPane() {
  const auth = useStore((s) => s.auth);
  const signOut = useStore((s) => s.signOut);
  const setStep = useStore((s) => s.setOnboardingStep);
  const touchid = useSwitch("touchid");

  // Anonymous installs get the upgrade path instead of an account card.
  if (auth.mode !== "account") {
    return (
      <>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 13,
            border: "1px dashed var(--dash, #d2d2dc)",
            borderRadius: 12,
            padding: "16px 18px",
          }}
        >
          <span style={{ display: "inline-flex", color: "var(--text2, #6b6b76)", marginTop: 2 }}>
            <SettingsIcon name="lock" size={18} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Local vault — no account</div>
            <div
              style={{
                fontSize: 12.5,
                lineHeight: 1.5,
                color: "var(--text3, #9a9aa5)",
                marginTop: 3,
              }}
            >
              Signing in uploads this vault once. Nothing is re-entered, and everything you have
              captured so far comes with you.
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <PillButton
            onClick={() => {
              // Send the user back through the onboarding sheet's sign-in lane.
              setStep("signin");
              useStore.setState({ onboarded: false, settingsOpen: false });
            }}
            style={{ background: "var(--ac)", color: "#fff", borderColor: "var(--ac)" }}
          >
            Sign in and sync this vault
          </PillButton>
        </div>

        <SectionLabel>Security</SectionLabel>
        <Row title="Require Touch ID to open Lore" desc="Applies after five minutes of inactivity.">
          <Toggle on={touchid.on} onChange={touchid.onChange} label="Require Touch ID" />
        </Row>

        <SectionLabel>Your data</SectionLabel>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <PillButton>Export everything as Markdown</PillButton>
          <PillButton tone="danger">Delete local vault</PillButton>
        </div>
      </>
    );
  }

  const email = auth.email ?? "rowan@shaw.studio";
  const name = auth.name ?? "Rowan Shaw";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          border: "1px solid var(--border, #e4e4ea)",
          borderRadius: 12,
          padding: "14px 16px",
        }}
      >
        <span
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: "var(--ac)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            fontWeight: 640,
            flex: "none",
          }}
        >
          {initials}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 640 }}>{name}</div>
          <div style={{ fontSize: 12.5, color: "var(--text3, #9a9aa5)", marginTop: 1 }}>{email}</div>
        </div>
        <PillButton onClick={signOut}>Sign out</PillButton>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          border: "1px solid var(--border, #e4e4ea)",
          borderRadius: 12,
          padding: "14px 16px",
          marginTop: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 640 }}>Lore Pro</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#4d855f",
                background: "#e8f2ec",
                borderRadius: 6,
                padding: "2px 7px",
              }}
            >
              Active
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text3, #9a9aa5)", marginTop: 3 }}>
            $8/month · renews 14 October 2026 · unlimited AI summaries, 5 devices
          </div>
        </div>
        <PillButton>Change plan</PillButton>
      </div>

      <SectionLabel>Security</SectionLabel>
      <Row title="Require Touch ID to open Lore" desc="Applies after five minutes of inactivity.">
        <Toggle on={touchid.on} onChange={touchid.onChange} label="Require Touch ID" />
      </Row>
      <Row title="Two-factor authentication" last>
        <PillButton>
          <SettingsIcon name="check" size={13} sw={2.4} />
          On · authenticator app
        </PillButton>
      </Row>

      <SectionLabel>Your data</SectionLabel>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <PillButton>Export everything as Markdown</PillButton>
        <PillButton tone="danger">Delete account</PillButton>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Look & Feel
 * ------------------------------------------------------------------ */

const APPEARANCES: { id: Appearance; label: string; swatch: string }[] = [
  { id: "light", label: "Light", swatch: "#f4f4f6" },
  { id: "dark", label: "Dark", swatch: "#26262d" },
  { id: "auto", label: "Auto", swatch: "linear-gradient(135deg,#f4f4f6 50%,#26262d 50%)" },
];

export function LookPane() {
  const appearance = useStore((s) => s.prefs.appearance);
  const setAppearance = useStore((s) => s.setAppearance);
  const accent = useStore((s) => s.prefs.accent);
  const setAccent = useStore((s) => s.setAccent);
  const density = useStore((s) => s.prefs.density);
  const textSize = useStore((s) => s.prefs.textSize);
  const setPref = useStore((s) => s.setPref);
  const counts = useSwitch("counts");
  const motion = useSwitch("motion");

  return (
    <>
      <SectionLabel first>Appearance</SectionLabel>
      <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
        {APPEARANCES.map((a) => {
          const active = appearance === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setAppearance(a.id)}
              aria-pressed={active}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 9,
                padding: 11,
                borderRadius: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                color: "inherit",
                border: `1.5px solid ${active ? "var(--ac)" : "var(--border, #e4e4ea)"}`,
                background: active ? "var(--ac-tint, #eeeef2)" : "transparent",
              }}
            >
              <span
                style={{
                  height: 52,
                  borderRadius: 8,
                  background: a.swatch,
                  border: "1px solid rgba(0,0,0,.07)",
                }}
              />
              <span style={{ fontSize: 12.5, fontWeight: active ? 600 : 500 }}>{a.label}</span>
            </button>
          );
        })}
      </div>

      <SectionLabel>Accent</SectionLabel>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        {ACCENTS.map((hex) => {
          const active = accent === hex;
          return (
            <button
              key={hex}
              type="button"
              onClick={() => setAccent(hex as Accent)}
              aria-label={ACCENT_NAMES[hex]}
              aria-pressed={active}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flex: "none",
                padding: 0,
                background: "transparent",
                border: `1.5px solid ${active ? hex : "transparent"}`,
                boxShadow: "inset 0 0 0 2px var(--surface, #fff)",
              }}
            >
              <span style={{ width: 20, height: 20, borderRadius: "50%", background: hex }} />
            </button>
          );
        })}
        <span style={{ fontSize: 12.5, color: "var(--text3, #9a9aa5)", marginLeft: 4 }}>
          {ACCENT_NAMES[accent]}
        </span>
      </div>

      <SectionLabel>Density &amp; text</SectionLabel>
      <Row title="List density" desc="Compact hides the tag row until hover.">
        <Segmented<Density>
          options={["Cozy", "Compact", "Roomy"]}
          value={density}
          onChange={(v) => setPref("density", v)}
        />
      </Row>
      <Row title="Text size">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
          <span style={{ fontSize: 11, color: "var(--text3, #9a9aa5)" }}>A</span>
          <input
            type="range"
            min={0.9}
            max={1.2}
            step={0.05}
            value={textSize}
            onChange={(e) => setPref("textSize", Number(e.target.value))}
            aria-label="Text size"
            style={{ width: 120, accentColor: "var(--ac)" }}
          />
          <span style={{ fontSize: 16, color: "var(--text3, #9a9aa5)" }}>A</span>
        </div>
      </Row>
      <Row title="Show counts in the sidebar">
        <Toggle on={counts.on} onChange={counts.onChange} label="Show counts in the sidebar" />
      </Row>
      <Row
        title="Reduce motion"
        desc="The capture balloon appears without the spring."
        last
      >
        <Toggle on={motion.on} onChange={motion.onChange} label="Reduce motion" />
      </Row>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Keyboard shortcuts
 * ------------------------------------------------------------------ */

const SHORTCUT_GROUPS = [
  {
    name: "Global",
    rows: [
      { label: "Quick capture", keys: ["⌥", "Space"] },
      { label: "Capture the current browser tab", keys: ["⌥", "⇧", "C"] },
      { label: "Capture selected text", keys: ["⌥", "⇧", "S"] },
      { label: "Start or pause a focus session", keys: ["⌥", "⇧", "F"] },
      { label: "Open the knowledge base", keys: ["⌥", "⇧", "L"] },
    ],
  },
  {
    name: "Capture window",
    rows: [
      { label: "Save", keys: ["⏎"] },
      { label: "Save and keep going", keys: ["⌘", "⏎"] },
      { label: "Cycle capture type", keys: ["⇥"] },
      { label: "Add a tag", keys: ["#"] },
      { label: "Pick a collection", keys: ["⌘", "L"] },
      { label: "Dismiss", keys: ["esc"] },
    ],
  },
  {
    name: "Knowledge base",
    rows: [
      { label: "Search everything", keys: ["⌘", "K"] },
      { label: "Ask Lore", keys: ["⌘", "J"] },
      { label: "Toggle the sidebar", keys: ["⌘", "⌥", "S"] },
      { label: "Flag item", keys: ["⌘", "D"] },
      { label: "Share", keys: ["⌘", "⇧", "C"] },
      { label: "Next / previous item", keys: ["↑", "↓"] },
      { label: "Calendar view", keys: ["⌘", "3"] },
    ],
  },
];

export function KeysPane() {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
            background: "var(--surface3, #f1f1f3)",
            borderRadius: 8,
            padding: "7px 10px",
            color: "var(--text3, #9a9aa5)",
            fontSize: 12.5,
          }}
        >
          <SettingsIcon name="search" size={14} sw={1.9} />
          <span>Filter shortcuts</span>
        </div>
        <PillButton>Restore defaults</PillButton>
      </div>

      {SHORTCUT_GROUPS.map((g) => (
        <div key={g.name} style={{ marginBottom: 22 }}>
          <SectionLabel first>{g.name}</SectionLabel>
          {g.rows.map((r, i) => (
            <div
              key={r.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "9px 0",
                borderBottom:
                  i === g.rows.length - 1 ? "none" : "1px solid var(--border-soft, #f0f0f2)",
              }}
            >
              <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{r.label}</span>
              <span style={{ display: "flex", gap: 4, flex: "none" }}>
                {r.keys.map((k, ki) => (
                  <KeyCap key={ki}>{k}</KeyCap>
                ))}
              </span>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Notifications
 * ------------------------------------------------------------------ */

export function NotifPane() {
  const digest = useSwitch("digest");
  const notifStyle = useStore((s) => s.prefs.notifStyle);
  const setPref = useStore((s) => s.setPref);
  const sounds = useSwitch("sounds");

  return (
    <>
      <SectionLabel first>Send me</SectionLabel>
      <Row title="Weekly digest" desc="Three things worth revisiting, chosen by the AI.">
        <Chooser value="Mondays, 08:00" options={["Mondays, 08:00"]} />
        <Toggle on={digest.on} onChange={digest.onChange} label="Weekly digest" />
      </Row>
      <SwitchRow name="dueTasks" title="Task reminders" desc="Due-date alerts for captured tasks." />
      <SwitchRow name="focusEnd" title="Focus session end" />
      <SwitchRow
        name="syncErr"
        title="Sync problems"
        desc="Only when something needs your attention."
        last
      />

      <SectionLabel>Delivery</SectionLabel>
      <Row title="Style">
        <Segmented<NotificationStyle>
          options={["Banner", "Alert"]}
          value={notifStyle}
          onChange={(v) => setPref("notifStyle", v)}
        />
      </Row>
      <Row title="Play a sound">
        <Toggle on={sounds.on} onChange={sounds.onChange} label="Play a sound" />
      </Row>
      <SwitchRow
        name="quiet"
        title="Quiet hours"
        desc="22:00 – 07:30 · nothing but sync problems gets through."
        last
      />
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Capture & AI
 * ------------------------------------------------------------------ */

const AI_MODES: { id: AiMode; label: string; desc: string }[] = [
  {
    id: "cloud",
    label: "Lore Cloud",
    desc: "Fastest and most accurate. Text is sent for processing and never retained.",
  },
  {
    id: "local",
    label: "On this Mac",
    desc: "Runs a small local model. Slower, works offline, nothing leaves the machine.",
  },
];

export function CapturePane() {
  const aiMode = useStore((s) => s.prefs.aiMode);
  const setPref = useStore((s) => s.setPref);

  return (
    <>
      <SectionLabel first>Automatic work</SectionLabel>
      <SwitchRow
        name="autoSum"
        title="Summarize what I save"
        desc="A short abstract plus key points, written after the item lands."
      />
      <SwitchRow
        name="autoTag"
        title="Suggest tags"
        desc="Suggestions stay dashed until you accept them."
      />
      <SwitchRow name="preview" title="Fetch link previews and snapshots" />
      <SwitchRow name="dupe" title="Warn me about duplicates" last />

      <SectionLabel>Where the AI runs</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {AI_MODES.map((m) => {
          const active = aiMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              className={choiceCard}
              onClick={() => setPref("aiMode", m.id)}
              aria-pressed={active}
              style={{
                alignItems: "flex-start",
                border: `1.5px solid ${active ? "var(--ac)" : "var(--border, #e4e4ea)"}`,
                background: active ? "var(--ac-tint, #eeeef2)" : "transparent",
                color: "inherit",
              }}
            >
              <span
                style={{
                  width: 17,
                  height: 17,
                  borderRadius: "50%",
                  flex: "none",
                  marginTop: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1.5px solid ${active ? "var(--ac)" : "var(--dash, #d2d2dc)"}`,
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: active ? "var(--ac)" : "transparent",
                  }}
                />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 600 }}>{m.label}</span>
                <span
                  style={{
                    display: "block",
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    color: "var(--text3, #9a9aa5)",
                    marginTop: 2,
                  }}
                >
                  {m.desc}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 8 }}>
        <Row title="Summaries used this month" desc="Unlimited on Pro." last>
          <span style={{ fontSize: 13.5, fontWeight: 640, fontVariantNumeric: "tabular-nums" }}>
            412
          </span>
        </Row>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Sync
 * ------------------------------------------------------------------ */

const DEVICES: { name: string; meta: string; icon: SettingsIconName; tag: string; on: boolean }[] = [
  {
    name: "Rowan’s MacBook Pro",
    meta: "This Mac · macOS 15.4 · synced just now",
    icon: "laptop",
    tag: "Current",
    on: true,
  },
  {
    name: "iPhone 16 Pro",
    meta: "Lore 2.4.1 · synced 12 minutes ago",
    icon: "phone",
    tag: "Active",
    on: false,
  },
  {
    name: "lore.app on Safari",
    meta: "Web session · signed in 3 days ago",
    icon: "globe",
    tag: "Sign out",
    on: false,
  },
];

export function SyncPane() {
  const items = useStore((s) => s.items);
  const anonymous = useStore((s) => s.auth.mode !== "account");
  const e2e = useSwitch("e2e");
  const wifi = useSwitch("wifi");

  if (anonymous) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 13,
          border: "1px dashed var(--dash, #d2d2dc)",
          borderRadius: 12,
          padding: "16px 18px",
        }}
      >
        <span style={{ display: "inline-flex", color: "var(--text2, #6b6b76)", marginTop: 2 }}>
          <SettingsIcon name="noSync" size={18} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Sync is off</div>
          <div
            style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text3, #9a9aa5)", marginTop: 3 }}
          >
            This vault lives only on this Mac. Sign in from the Account pane to sync it to web and
            mobile — the {items.length} item{items.length === 1 ? "" : "s"} you already have upload
            once and nothing is re-entered.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 13,
          border: "1px solid var(--border, #e4e4ea)",
          borderRadius: 12,
          padding: "14px 16px",
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#e8f2ec",
            color: "#4d855f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
          }}
        >
          <SettingsIcon name="check" size={16} sw={2.2} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 640 }}>Everything is synced</div>
          <div style={{ fontSize: 12.5, color: "var(--text3, #9a9aa5)", marginTop: 1 }}>
            Last checked 40 seconds ago · {items.length} items
          </div>
        </div>
        <PillButton>Sync now</PillButton>
      </div>

      <SectionLabel>Devices</SectionLabel>
      {DEVICES.map((d) => (
        <div
          key={d.name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "11px 0",
            borderBottom: "1px solid var(--border-soft, #f0f0f2)",
          }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "var(--surface3, #f1f1f3)",
              color: "var(--text2, #6b6b76)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "none",
            }}
          >
            <SettingsIcon name={d.icon} size={16} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
            <div style={{ fontSize: 12, color: "var(--text3, #9a9aa5)", marginTop: 1 }}>
              {d.meta}
            </div>
          </div>
          <span
            style={{
              fontSize: 12,
              borderRadius: 7,
              padding: "3px 9px",
              flex: "none",
              ...(d.on
                ? { color: "#4d855f", background: "#e8f2ec" }
                : { color: "var(--text3, #9a9aa5)", background: "var(--surface3, #f1f1f3)" }),
            }}
          >
            {d.tag}
          </span>
        </div>
      ))}

      <SectionLabel>Options</SectionLabel>
      <Row
        title="End-to-end encryption"
        desc="Summaries are generated before upload, so search still works."
      >
        <Toggle on={e2e.on} onChange={e2e.onChange} label="End-to-end encryption" />
      </Row>
      <Row title="Sync files on Wi-Fi only" last>
        <Toggle on={wifi.on} onChange={wifi.onChange} label="Sync files on Wi-Fi only" />
      </Row>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Focus & Timer
 * ------------------------------------------------------------------ */

const DURATION_LABELS = [
  { key: "focus", label: "Focus" },
  { key: "short", label: "Short break" },
  { key: "long", label: "Long break" },
] as const;

export function FocusPane() {
  const durations = useStore((s) => s.prefs.durations);
  const bump = useStore((s) => s.bumpDuration);
  const longBreakAfter = useStore((s) => s.prefs.longBreakAfter);
  const setPref = useStore((s) => s.setPref);

  return (
    <>
      <p
        style={{
          margin: "0 0 16px",
          fontSize: 12.5,
          lineHeight: 1.5,
          color: "var(--text3, #9a9aa5)",
        }}
      >
        The timer itself lives in the menu bar. These are its defaults.
      </p>

      <div style={{ display: "flex", gap: 10 }}>
        {DURATION_LABELS.map((d) => (
          <div
            key={d.key}
            style={{
              flex: 1,
              border: "1px solid var(--border, #e4e4ea)",
              borderRadius: 12,
              padding: "13px 14px",
            }}
          >
            <div style={{ fontSize: 12.5, color: "var(--text3, #9a9aa5)" }}>{d.label}</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 6,
              }}
            >
              <span style={{ fontSize: 24, fontWeight: 620, fontVariantNumeric: "tabular-nums" }}>
                {durations[d.key]}
                <span
                  style={{ fontSize: 12, fontWeight: 500, color: "var(--text3, #9a9aa5)", marginLeft: 4 }}
                >
                  min
                </span>
              </span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <StepButton label={`Increase ${d.label}`} onClick={() => bump(d.key, 1)} up />
                <StepButton label={`Decrease ${d.label}`} onClick={() => bump(d.key, -1)} />
              </span>
            </div>
          </div>
        ))}
      </div>

      <SectionLabel>During a session</SectionLabel>
      <SwitchRow
        name="dnd"
        title="Turn on Do Not Disturb"
        desc="Quick capture still works — nothing interrupts you."
      />
      <SwitchRow name="autoBreak" title="Start breaks automatically" />
      <SwitchRow name="chime" title="Chime at the end of each interval" />
      <Row title="Long break after">
        <Chooser
          value={`${longBreakAfter} sessions`}
          options={["2 sessions", "3 sessions", "4 sessions", "5 sessions"]}
          onChange={(v) => setPref("longBreakAfter", parseInt(String(v), 10))}
        />
      </Row>
      <SwitchRow
        name="logFocus"
        title="Log sessions to my knowledge base"
        desc="One note a day, with what you worked on and what you captured."
        last
      />
    </>
  );
}

function StepButton({ onClick, up, label }: { onClick: () => void; up?: boolean; label: string }) {
  return (
    <button
      type="button"
      className={pillButton}
      onClick={onClick}
      aria-label={label}
      style={{ padding: "2px 6px" }}
    >
      <SettingsIcon name={up ? "chevronUp" : "chevronDown"} size={11} sw={2.6} />
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Calendar
 * ------------------------------------------------------------------ */

const CALENDAR_ACCOUNTS: { key: keyof Switches; name: string; meta: string; color: string }[] = [
  { key: "calWork", name: "Work — Google", meta: "rowan@shaw.studio · 4 calendars", color: "#8a92b8" },
  { key: "calPersonal", name: "Personal — iCloud", meta: "rowan@icloud.com · 2 calendars", color: "#a88f6e" },
  { key: "calShared", name: "Studio shared", meta: "Read-only invite", color: "#82a896" },
];

export function CalendarPane() {
  const switches = useStore((s) => s.prefs.switches);
  const toggle = useStore((s) => s.toggleSwitch);
  const weekStart = useStore((s) => s.prefs.weekStart);
  const setPref = useStore((s) => s.setPref);

  return (
    <>
      <SectionLabel first>Connected calendars</SectionLabel>
      {CALENDAR_ACCOUNTS.map((c) => (
        <div
          key={c.key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "11px 0",
            borderBottom: "1px solid var(--border-soft, #f0f0f2)",
          }}
        >
          <span
            style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flex: "none" }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
            <div style={{ fontSize: 12, color: "var(--text3, #9a9aa5)", marginTop: 1 }}>{c.meta}</div>
          </div>
          <Toggle on={switches[c.key]} onChange={() => toggle(c.key)} label={c.name} />
        </div>
      ))}
      <div style={{ marginTop: 12 }}>
        <PillButton>
          <SettingsIcon name="plus" size={13} sw={2.2} />
          Add a calendar account
        </PillButton>
      </div>

      <SectionLabel>In the calendar view</SectionLabel>
      <SwitchRow
        name="showTasks"
        title="Show captured tasks alongside events"
        desc="Tasks with due dates appear as all-day chips."
      />
      <SwitchRow name="showFocus" title="Show focus sessions" />
      <Row title="Week starts on">
        <Chooser<WeekStart>
          value={weekStart}
          options={["Monday", "Sunday"]}
          onChange={(v) => setPref("weekStart", v)}
        />
      </Row>
      <SwitchRow
        name="attachNotes"
        title="Attach meeting notes automatically"
        desc="Notes captured during an event get filed to it."
        last
      />
    </>
  );
}

/* ------------------------------------------------------------------ *
 * About
 * ------------------------------------------------------------------ */

const ABOUT_LINKS = [
  "Release notes",
  "Keyboard cheat sheet",
  "Privacy policy",
  "Contact support",
  "Acknowledgements",
];

export function AboutPane() {
  const items = useStore((s) => s.items);
  const auth = useStore((s) => s.auth);
  const aiMode = useStore((s) => s.prefs.aiMode);

  const meta = [
    { k: "Library", v: `~/Library/Lore · ${items.length} items` },
    { k: "Sync account", v: auth.mode === "account" ? auth.email ?? "—" : "Local vault (no account)" },
    { k: "Local model", v: aiMode === "local" ? "lore-summarize-3b (1.9 GB)" : "Not downloaded" },
    { k: "Licence", v: auth.mode === "account" ? "Pro · seat 1 of 1" : "Free · local only" },
  ];

  return (
    <>
      <div style={{ textAlign: "center", padding: "8px 0 22px" }}>
        <span style={{ display: "inline-flex", color: "var(--text, #1a1a1f)" }}>
          <LoreMark size={58} />
        </span>
        <div style={{ fontSize: 17, fontWeight: 660, marginTop: 12 }}>Lore</div>
        <div style={{ fontSize: 12.5, color: "var(--text3, #9a9aa5)", marginTop: 3 }}>
          Version 2.4.1 (build 2418) · Apple silicon
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 10,
            fontSize: 12.5,
            color: "#4d855f",
            background: "#e8f2ec",
            borderRadius: 8,
            padding: "4px 10px",
          }}
        >
          <SettingsIcon name="check" size={13} sw={2.4} />
          You&rsquo;re up to date
        </div>
        <p
          style={{
            margin: "16px auto 0",
            maxWidth: 420,
            fontSize: 12.5,
            lineHeight: 1.6,
            color: "var(--text2, #6b6b76)",
          }}
        >
          Lore is made by a team of four in Lisbon and Copenhagen. It keeps your library on your own
          machine and syncs it encrypted.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
          paddingBottom: 22,
          borderBottom: "1px solid var(--border-soft, #f0f0f2)",
        }}
      >
        {ABOUT_LINKS.map((l) => (
          <button key={l} type="button" className={aboutLink}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ paddingTop: 8 }}>
        {meta.map((m) => (
          <div
            key={m.k}
            style={{
              display: "flex",
              gap: 16,
              padding: "9px 0",
              fontSize: 12.5,
              borderBottom: "1px solid var(--border-soft, #f0f0f2)",
            }}
          >
            <span style={{ flex: "none", width: 130, color: "var(--text3, #9a9aa5)" }}>{m.k}</span>
            <span style={{ flex: 1, minWidth: 0 }}>{m.v}</span>
          </div>
        ))}
      </div>
    </>
  );
}
