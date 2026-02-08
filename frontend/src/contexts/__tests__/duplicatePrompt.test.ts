/**
 * Test: Duplicate prompt detection across all 7 prompts
 *
 * Uses the same normalized Set logic as GameContext.handleSubmit
 */

function normalize(prompt: string): string {
  return prompt.trim().toLowerCase().replace(/\s+/g, ' ');
}

function simulatePlayerPrompts(prompts: string[]): { results: { prompt: string; isDuplicate: boolean }[] } {
  const history = new Set<string>();
  const results: { prompt: string; isDuplicate: boolean }[] = [];

  for (const prompt of prompts) {
    const normalized = normalize(prompt);
    const isDuplicate = history.has(normalized);
    history.add(normalized);
    results.push({ prompt, isDuplicate });
  }

  return { results };
}

// Test cases
const tests = [
  {
    name: 'Back-to-back duplicate (prompts 1 & 2)',
    prompts: ['create a list', 'create a list'],
    expected: [false, true],
  },
  {
    name: 'Non-adjacent duplicate (prompts 1 & 3)',
    prompts: ['create a map', 'create a list', 'create a map'],
    expected: [false, false, true],
  },
  {
    name: 'All unique prompts',
    prompts: ['prompt one', 'prompt two', 'prompt three', 'prompt four', 'prompt five', 'prompt six', 'prompt seven'],
    expected: [false, false, false, false, false, false, false],
  },
  {
    name: 'Duplicate at end (prompts 2 & 7)',
    prompts: ['a', 'b', 'c', 'd', 'e', 'f', 'b'],
    expected: [false, false, false, false, false, false, true],
  },
  {
    name: 'Multiple duplicates scattered',
    prompts: ['create a map', 'create a list', 'create a map', 'fix bugs', 'create a list', 'add tests', 'fix bugs'],
    expected: [false, false, true, false, true, false, true],
  },
  {
    name: 'Case insensitive match',
    prompts: ['Create A List', 'create a list'],
    expected: [false, true],
  },
  {
    name: 'Whitespace normalization',
    prompts: ['create  a   list', 'create a list'],
    expected: [false, true],
  },
  {
    name: 'First prompt is never a duplicate',
    prompts: ['anything'],
    expected: [false],
  },
  {
    name: 'Every prompt is a duplicate of the first',
    prompts: ['same', 'same', 'same', 'same', 'same', 'same', 'same'],
    expected: [false, true, true, true, true, true, true],
  },
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  const { results } = simulatePlayerPrompts(test.prompts);
  const actual = results.map((r) => r.isDuplicate);
  const ok = JSON.stringify(actual) === JSON.stringify(test.expected);

  if (ok) {
    console.log(`  PASS: ${test.name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${test.name}`);
    console.log(`    Prompts:  ${JSON.stringify(test.prompts)}`);
    console.log(`    Expected: ${JSON.stringify(test.expected)}`);
    console.log(`    Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
