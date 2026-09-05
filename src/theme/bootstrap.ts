// Paints the theme tokens onto :root before React's first render.
//
// `applyTokens` also runs per window from an effect, which is what repaints on a
// theme change — but an effect runs after the first paint. Components reference
// tokens with no hex fallback, so without this the first frame would draw with
// no colours at all, and the focus popover measures itself on that frame.

import { loadPersisted } from '../store/persisted';
import { applyTokens, effectiveTheme, resolveAccent } from './tokens';

const { prefs } = loadPersisted();
const theme = effectiveTheme(prefs.appearance);

applyTokens(document.documentElement, theme);
document.documentElement.style.setProperty('--ac', resolveAccent(prefs.accent, theme));
