// tests/routing.test.ts
// Automated validation for URL view routing and state synchronization

const VALID_VIEWS = ['stream', 'analytics', 'repos', 'settings', 'security', 'about'] as const;
type ViewMode = typeof VALID_VIEWS[number];

function resolveViewFromUrl(queryString: string): ViewMode {
  const params = new URLSearchParams(queryString);
  const raw = params.get('view')?.toLowerCase() as ViewMode;
  return VALID_VIEWS.includes(raw) ? raw : 'stream';
}

function computeNextUrl(currentUrl: string, targetView: ViewMode): string {
  const parsed = new URL(currentUrl);
  if (targetView === 'stream') {
    parsed.searchParams.delete('view');
  } else {
    parsed.searchParams.set('view', targetView);
  }
  return parsed.toString();
}

console.log('=== Running View Routing & URL Synchronization Tests ===');

// Test 1: Default fallback to stream
{
  const view = resolveViewFromUrl('');
  if (view !== 'stream') {
    console.error(`FAIL: Expected 'stream', got '${view}'`);
    process.exit(1);
  }
  console.log('✔ Fallback to stream on empty query string passed.');
}

// Test 2: Fallback on unrecognized view parameter
{
  const view = resolveViewFromUrl('?view=unknown_section');
  if (view !== 'stream') {
    console.error(`FAIL: Expected fallback 'stream', got '${view}'`);
    process.exit(1);
  }
  console.log('✔ Fallback to stream on invalid query parameter passed.');
}

// Test 3: Resolving valid view parameters
for (const expected of VALID_VIEWS) {
  const view = resolveViewFromUrl(`?view=${expected}`);
  if (view !== expected) {
    console.error(`FAIL: Expected '${expected}', got '${view}'`);
    process.exit(1);
  }
}
console.log('✔ Correct resolution of all valid view parameters (stream, analytics, repos, settings) passed.');

// Test 4: URL generation strips view parameter for stream
{
  const next = computeNextUrl('http://localhost:5000/?view=analytics', 'stream');
  if (next.includes('view=')) {
    console.error(`FAIL: Expected view parameter to be stripped, got: ${next}`);
    process.exit(1);
  }
  console.log('✔ URL parameter cleanup for default stream view passed.');
}

// Test 5: URL generation sets view parameter for non-stream views
{
  const nextAnalytics = computeNextUrl('http://localhost:5000/', 'analytics');
  if (!nextAnalytics.includes('view=analytics')) {
    console.error(`FAIL: Expected view=analytics in URL, got: ${nextAnalytics}`);
    process.exit(1);
  }

  const nextRepos = computeNextUrl('http://localhost:5000/?sort=recent', 'repos');
  if (!nextRepos.includes('view=repos') || !nextRepos.includes('sort=recent')) {
    console.error(`FAIL: Expected view=repos while preserving other params, got: ${nextRepos}`);
    process.exit(1);
  }
  console.log('✔ URL parameter preservation across query transitions passed.');
}

console.log('\nALL VIEW ROUTING & STATE SYNCHRONIZATION TESTS PASSED CLEANLY!\n');
