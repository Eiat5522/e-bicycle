// React Native's bundled URL declarations omit these standard members.
// The URL polyfill is installed by src/lib/supabase.ts at runtime.
interface URL {
  readonly hash: string;
  readonly search: string;
}

interface URLSearchParams {
  get(name: string): string | null;
  set(name: string, value: string): void;
}
