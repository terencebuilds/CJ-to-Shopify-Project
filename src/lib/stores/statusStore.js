// Simple client storage for the llm api connection status, and theme.

// Svelte stores and subscriptions for reactivity
import { writable } from "svelte/store";
export const LLM_CONNECTED = writable(null);
export const THEME = writable("light");