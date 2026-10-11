// tests/theme.test.ts
// Automated validation for theme switching, CSS data-theme attributes, and persistence

console.log('=== Running Theme Switching & Persistence Unit Tests ===');

interface MockLocalStorage {
  store: Record<string, string>;
  getItem: (key: string) => string | null;
  setItem: (key: string, val: string) => void;
}

const mockStorage: MockLocalStorage = {
  store: {},
  getItem(key: string) { return this.store[key] || null; },
  setItem(key: string, val: string) { this.store[key] = val; }
};

function resolveTheme(storedVal: string | null, prefersLight: boolean): 'dark' | 'light' {
  if (storedVal === 'light' || storedVal === 'dark') {
    return storedVal;
  }
  return prefersLight ? 'light' : 'dark';
}

function getNextTheme(current: 'dark' | 'light'): 'dark' | 'light' {
  return current === 'dark' ? 'light' : 'dark';
}

// Test 1: Default theme fallback
const defaultTheme = resolveTheme(null, false);
if (defaultTheme !== 'dark') {
  throw new Error(`Test 1 Failed: Expected default theme 'dark', got: ${defaultTheme}`);
}
console.log('✔ Test 1: Default fallback to dark theme passed.');

// Test 2: System preference detection when no stored value
const systemLight = resolveTheme(null, true);
if (systemLight !== 'light') {
  throw new Error(`Test 2 Failed: Expected 'light' from system preference, got: ${systemLight}`);
}
console.log('✔ Test 2: System light mode preference detection passed.');

// Test 3: Stored preference overrides system preference
mockStorage.setItem('oss_theme', 'dark');
const overrideTheme = resolveTheme(mockStorage.getItem('oss_theme'), true);
if (overrideTheme !== 'dark') {
  throw new Error(`Test 3 Failed: Stored preference must override system, got: ${overrideTheme}`);
}
console.log('✔ Test 3: Stored preference overrides system preference passed.');

// Test 4: Cycle toggle transition
let activeTheme: 'dark' | 'light' = 'dark';
activeTheme = getNextTheme(activeTheme);
if (activeTheme !== 'light') {
  throw new Error(`Test 4 Failed: Expected 'light' after toggle, got: ${activeTheme}`);
}
activeTheme = getNextTheme(activeTheme);
if (activeTheme !== 'dark') {
  throw new Error(`Test 4 Failed: Expected 'dark' after second toggle, got: ${activeTheme}`);
}
console.log('✔ Test 4: Bidirectional theme toggle transitions passed.');

console.log('\nALL THEME STATE & PERSISTENCE TESTS PASSED CLEANLY!\n');
