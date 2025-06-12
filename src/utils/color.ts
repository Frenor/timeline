/**
 * Turn any string into a reproducible HSL color that
 * adjusts for light- or dark-mode.
 */
export function stringToColor(
    str: string = 'unknown',
    // if unspecified, auto-detect via media query
    isDark: boolean = localStorage.getItem('theme') === 'dark'
): { bg: string; border: string; text: string } {
    // simple hash → 0–360
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = ((hash % 360) + 360) % 360;

    const sat = isDark ? 60 : 40;
    const lightBg   = isDark ? 30 : 90;   // softer fill
    const lightBorder = isDark ? 50 : 60; // stronger outline

    const bg     = `hsl(${hue}, ${sat}%, ${lightBg}%)`;
    const border = `hsl(${hue}, ${sat}%, ${lightBorder}%)`;
    const text   = border; // good contrast

    return { bg, border, text };
}
