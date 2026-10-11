/**
 * Which language the interface speaks, and where that choice lives.
 *
 * Paraglide decides the locale the first time a message renders, which is before
 * any request to the server can come back. So the choice is mirrored into
 * localStorage and read from there synchronously at startup; the database row is
 * the source of truth and catches up a moment later, the same arrangement the
 * theme uses.
 *
 * Paraglide's own `cookie` and `localStorage` strategies cannot be used for this:
 * its `getLocale()` writes the resolved locale back through `setLocale()` on first
 * read, so merely opening the page would freeze whatever the browser negotiated
 * and the browser's own language setting would stop having any effect.
 */
import { locales, baseLocale } from '$lib/paraglide/runtime';

export const LOCALE_STORAGE_KEY = 'dockhand-language';

/**
 * The picker's value for "no choice". Never stored - choosing it REMOVES the key,
 * because an absent choice is what lets Accept-Language keep deciding.
 */
export const FOLLOW_BROWSER = 'browser';

export type Locale = (typeof locales)[number];

/** The locale if it is one this build carries, otherwise undefined. */
export function asLocale(value: unknown): Locale | undefined {
	return typeof value === 'string' && (locales as readonly string[]).includes(value)
		? (value as Locale)
		: undefined;
}

/** What the browser asks for, narrowed to a locale this build carries. */
export function fromNavigator(languages: readonly string[]): Locale | undefined {
	for (const tag of languages) {
		// An exact match wins (zh-CN over zh), then the bare language (de-AT -> de).
		const exact = asLocale(tag);
		if (exact) return exact;
		const bare = asLocale(tag.split('-')[0]);
		if (bare) return bare;
	}
	return undefined;
}

/**
 * The locale to render with: the stored choice, else the browser's preference,
 * else the base locale. `stored` is undefined when nobody has chosen yet - that
 * is what keeps the browser setting live until somebody does.
 */
export function resolveLocale(stored: unknown, languages: readonly string[]): Locale {
	return asLocale(stored) ?? fromNavigator(languages) ?? (baseLocale as Locale);
}

/**
 * The locale getter paraglide renders with, resolved ONCE: the value must not
 * change under a rendered page, and the picker reloads after storing a new one.
 * Reading the store is injected so a blocked one (private mode) degrades to the
 * browser's preference rather than throwing out of the first render.
 */
export function makeLocaleGetter(
	readStored: () => string | null,
	languages: () => readonly string[]
): () => Locale {
	let resolved: Locale | undefined;
	return () => {
		if (!resolved) {
			let stored: string | null = null;
			try {
				stored = readStored();
			} catch {
				// A blocked store says nothing about the language; the browser still does.
			}
			resolved = resolveLocale(stored, languages());
		}
		return resolved;
	};
}
