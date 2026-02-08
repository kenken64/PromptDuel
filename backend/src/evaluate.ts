import { readFileSync, existsSync, readdirSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';

// Override with WORKSPACES_DIR env var
const WORKSPACES_DIR = process.env.WORKSPACES_DIR
  ? resolve(process.env.WORKSPACES_DIR)
  : resolve(__dirname, '../../workspaces');

// Evaluation criteria for Challenge 1: BracketValidator
const CHALLENGE_1_CRITERIA = {
  name: 'BracketValidator',
  maxScore: 100,
  categories: [
    { name: 'Functionality / Test Cases', weight: 40, key: 'functionality' },
    { name: 'Algorithm Efficiency', weight: 20, key: 'algorithm' },
    { name: 'Error Handling', weight: 15, key: 'errorHandling' },
    { name: 'Code Quality', weight: 15, key: 'codeQuality' },
    { name: 'CLI Implementation', weight: 10, key: 'cli' },
  ],
};

// Evaluation criteria for Challenge 2: QuantumHeist
const CHALLENGE_2_CRITERIA = {
  name: 'QuantumHeist',
  maxScore: 100,
  categories: [
    { name: 'Algorithm Design & Implementation', weight: 25, key: 'algorithm' },
    { name: 'Data Structures', weight: 20, key: 'dataStructures' },
    { name: 'Game Mechanics Implementation', weight: 20, key: 'gameMechanics' },
    { name: 'Code Quality', weight: 15, key: 'codeQuality' },
    { name: 'Complexity Analysis', weight: 10, key: 'complexity' },
    { name: 'Testing & Correctness', weight: 5, key: 'testing' },
    { name: 'Performance', weight: 3, key: 'performance' },
    { name: 'Documentation', weight: 2, key: 'documentation' },
  ],
};

interface CategoryScore {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  feedback: string;
}

interface EvaluationResult {
  playerName: string;
  challenge: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: string;
  categories: CategoryScore[];
  filesFound: string[];
  timestamp: string;
}

function getGrade(percentage: number): string {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

function evaluateChallenge1(workspacePath: string, playerName: string): EvaluationResult {
  const criteria = CHALLENGE_1_CRITERIA;
  const categories: CategoryScore[] = [];
  const filesFound: string[] = [];

  // Check what files exist
  if (existsSync(workspacePath)) {
    const files = readdirSync(workspacePath);
    filesFound.push(...files);
  }

  const hasIndexJs = filesFound.includes('index.js');

  // Read ALL .js files in the workspace to capture multi-file implementations
  let codeContent = '';
  const jsFiles = filesFound.filter(f => f.endsWith('.js'));
  for (const jsFile of jsFiles) {
    try {
      codeContent += readFileSync(join(workspacePath, jsFile), 'utf-8') + '\n';
    } catch (e) {
      // skip unreadable files
    }
  }

  // Check if it's just the template (no real implementation)
  const isOnlyTemplate = !hasIndexJs && jsFiles.length === 0 ||
    (codeContent.includes("// Your code goes here") && codeContent.length < 300) ||
    codeContent.includes("Hello from") ||
    codeContent.length < 200;

  // Evaluate Functionality (40%) - STRICTER CHECKS
  let functionalityScore = 0;
  let functionalityFeedback = '';

  if (isOnlyTemplate) {
    functionalityFeedback = 'Only template code found. No implementation.';
  } else if (hasIndexJs && codeContent.length > 200) {
    // Check for PROPER stack implementation with bracket pairs
    const hasStackOps = codeContent.includes('push') && codeContent.includes('pop');
    const hasBracketPairs = (
      (codeContent.includes("'('") || codeContent.includes('"("')) &&
      (codeContent.includes("')'") || codeContent.includes('")"'))
    );
    const hasSquareBrackets = (
      (codeContent.includes("'['") || codeContent.includes('"["')) &&
      (codeContent.includes("']'") || codeContent.includes('"]"'))
    );
    const hasCurlyBrackets = (
      (codeContent.includes("'{'") || codeContent.includes('"{"')) &&
      (codeContent.includes("'}'") || codeContent.includes('"}"'))
    );
    const hasAngleBrackets = (
      (codeContent.includes("'<'") || codeContent.includes('"<"')) &&
      (codeContent.includes("'>'") || codeContent.includes('">"'))
    );

    // Count how many bracket types are properly handled
    const bracketTypesHandled = [hasBracketPairs, hasSquareBrackets, hasCurlyBrackets, hasAngleBrackets].filter(Boolean).length;

    // Check for matching logic (opening/closing pair detection)
    const hasMatchingLogic = codeContent.includes('===') || codeContent.includes('!==');
    const hasReturnValid = codeContent.includes('return') && (codeContent.includes('true') || codeContent.includes('false'));

    if (hasStackOps && hasMatchingLogic) {
      functionalityScore += 10;
      functionalityFeedback += 'Stack with matching logic. ';
    }

    if (bracketTypesHandled >= 3) {
      functionalityScore += 15;
      functionalityFeedback += `${bracketTypesHandled} bracket types handled. `;
    } else if (bracketTypesHandled >= 2) {
      functionalityScore += 10;
      functionalityFeedback += `${bracketTypesHandled} bracket types handled. `;
    } else if (bracketTypesHandled === 1) {
      functionalityScore += 5;
      functionalityFeedback += 'Only 1 bracket type handled. ';
    }

    if (hasReturnValid) {
      functionalityScore += 8;
      functionalityFeedback += 'Returns validity result. ';
    }

    // Check for proper mapping/pair definition
    if (codeContent.includes('{') && (codeContent.includes("')'") || codeContent.includes('")"')) &&
        (codeContent.includes("'('") || codeContent.includes('"("'))) {
      functionalityScore += 7;
      functionalityFeedback += 'Bracket pair mapping defined. ';
    }
  } else {
    functionalityFeedback = 'Code too short or no implementation.';
  }

  categories.push({
    name: criteria.categories[0].name,
    weight: criteria.categories[0].weight,
    score: Math.min(functionalityScore, 40),
    maxScore: 40,
    feedback: functionalityFeedback || 'Functionality needs work.',
  });

  // Evaluate Algorithm Efficiency (20%) - STRICTER
  let algorithmScore = 0;
  let algorithmFeedback = '';

  if (!isOnlyTemplate) {
    // Must have BOTH stack-like array AND iteration
    const hasArrayAsStack = codeContent.includes('[]') && codeContent.includes('push') && codeContent.includes('pop');
    const hasLoop = codeContent.includes('for (') || codeContent.includes('for(') ||
                   codeContent.includes('.forEach') || codeContent.includes('while');
    const hasLengthCheck = codeContent.includes('.length');

    if (hasArrayAsStack && hasLoop) {
      algorithmScore += 12;
      algorithmFeedback += 'Stack-based O(n) approach. ';
    } else if (hasLoop) {
      algorithmScore += 5;
      algorithmFeedback += 'Has iteration but missing stack. ';
    }

    if (hasLengthCheck && codeContent.includes('=== 0')) {
      algorithmScore += 8;
      algorithmFeedback += 'Proper empty stack check. ';
    }
  }

  categories.push({
    name: criteria.categories[1].name,
    weight: criteria.categories[1].weight,
    score: Math.min(algorithmScore, 20),
    maxScore: 20,
    feedback: algorithmFeedback || 'Algorithm needs improvement.',
  });

  // Evaluate Error Handling (15%) - STRICTER
  let errorScore = 0;
  let errorFeedback = '';

  if (!isOnlyTemplate) {
    // Check for specific error scenarios
    const hasUnmatchedError = codeContent.toLowerCase().includes('unmatched') ||
                              codeContent.toLowerCase().includes('unexpected') ||
                              codeContent.toLowerCase().includes('mismatch');
    const hasUnclosedError = codeContent.toLowerCase().includes('unclosed') ||
                             codeContent.toLowerCase().includes('not closed');
    const hasPositionTracking = codeContent.includes('position') ||
                                codeContent.includes('index') ||
                                codeContent.includes('charAt') ||
                                codeContent.includes('line') ||
                                codeContent.includes('column') ||
                                codeContent.includes('char ');

    if (hasUnmatchedError) {
      errorScore += 5;
      errorFeedback += 'Handles unmatched brackets. ';
    }
    if (hasUnclosedError) {
      errorScore += 5;
      errorFeedback += 'Handles unclosed brackets. ';
    }
    if (hasPositionTracking && (codeContent.includes('position') || codeContent.includes('index'))) {
      errorScore += 5;
      errorFeedback += 'Reports error position. ';
    }
  }

  categories.push({
    name: criteria.categories[2].name,
    weight: criteria.categories[2].weight,
    score: Math.min(errorScore, 15),
    maxScore: 15,
    feedback: errorFeedback || 'Error handling needs work.',
  });

  // Evaluate Code Quality (15%) - STRICTER
  let qualityScore = 0;
  let qualityFeedback = '';

  if (!isOnlyTemplate) {
    // Check for proper function definition (accept common naming patterns)
    const hasValidateFunction = codeContent.includes('function validate') ||
                               codeContent.includes('const validate') ||
                               codeContent.includes('validateBrackets') ||
                               codeContent.includes('function check') ||
                               codeContent.includes('const check') ||
                               codeContent.includes('function isValid') ||
                               codeContent.includes('const isValid') ||
                               codeContent.includes('function verify') ||
                               codeContent.includes('class Bracket') ||
                               codeContent.includes('class Validator');
    const hasModernSyntax = codeContent.includes('const ') || codeContent.includes('let ');
    const hasExport = codeContent.includes('export') || codeContent.includes('module.exports');
    const hasComments = codeContent.includes('//') || codeContent.includes('/*');

    if (hasValidateFunction) {
      qualityScore += 5;
      qualityFeedback += 'Named validation function. ';
    }
    if (hasModernSyntax) {
      qualityScore += 4;
      qualityFeedback += 'Modern JS syntax. ';
    }
    if (hasExport) {
      qualityScore += 3;
      qualityFeedback += 'Exports present. ';
    }
    if (hasComments) {
      qualityScore += 3;
      qualityFeedback += 'Code documented. ';
    }
  }

  categories.push({
    name: criteria.categories[3].name,
    weight: criteria.categories[3].weight,
    score: Math.min(qualityScore, 15),
    maxScore: 15,
    feedback: qualityFeedback || 'Code quality needs improvement.',
  });

  // Evaluate CLI Implementation (10%) - STRICTER
  let cliScore = 0;
  let cliFeedback = '';

  if (!isOnlyTemplate) {
    const hasArgvHandling = codeContent.includes('process.argv');
    const hasReadline = codeContent.includes('readline');
    const hasInteractiveMode = codeContent.includes('question') || codeContent.includes('prompt') ||
                               codeContent.includes('input');
    const hasHelpFlag = codeContent.includes('--help') || codeContent.includes('-h') ||
                        codeContent.includes('help') || codeContent.includes('usage');
    const hasColorOutput = codeContent.includes('\\x1b[') || codeContent.includes('\\033[') ||
                           codeContent.includes('chalk') || codeContent.includes('green') ||
                           codeContent.includes('red') || codeContent.includes('color');

    if (hasArgvHandling) {
      cliScore += 3;
      cliFeedback += 'CLI arguments. ';
    }
    if (hasReadline || hasInteractiveMode) {
      cliScore += 4;
      cliFeedback += 'Interactive mode. ';
    }
    if (hasHelpFlag) {
      cliScore += 3;
      cliFeedback += 'Help option. ';
    }
  }

  categories.push({
    name: criteria.categories[4].name,
    weight: criteria.categories[4].weight,
    score: Math.min(cliScore, 10),
    maxScore: 10,
    feedback: cliFeedback || 'CLI features not implemented.',
  });

  const totalScore = categories.reduce((sum, cat) => sum + cat.score, 0);
  const percentage = Math.round((totalScore / 100) * 100);

  return {
    playerName,
    challenge: 1,
    totalScore,
    maxScore: 100,
    percentage,
    grade: getGrade(percentage),
    categories,
    filesFound,
    timestamp: new Date().toISOString(),
  };
}

function evaluateChallenge2(workspacePath: string, playerName: string): EvaluationResult {
  const criteria = CHALLENGE_2_CRITERIA;
  const categories: CategoryScore[] = [];
  const filesFound: string[] = [];

  // Check what files exist
  if (existsSync(workspacePath)) {
    const files = readdirSync(workspacePath);
    filesFound.push(...files);
  }

  const hasIndexJs = filesFound.includes('index.js');

  // Read ALL .js files in the workspace to capture multi-file implementations
  let codeContent = '';
  const jsFiles = filesFound.filter(f => f.endsWith('.js'));
  for (const jsFile of jsFiles) {
    try {
      codeContent += readFileSync(join(workspacePath, jsFile), 'utf-8') + '\n';
    } catch (e) {
      // skip unreadable files
    }
  }

  // Check if it's just the template (no real implementation)
  const isOnlyTemplate = !hasIndexJs && jsFiles.length === 0 ||
    (codeContent.includes("// Your code goes here") && codeContent.length < 400) ||
    codeContent.includes("Hello from") ||
    codeContent.length < 300;

  // Evaluate Algorithm Design (25%) - STRICTER
  let algorithmScore = 0;
  let algorithmFeedback = '';

  if (!isOnlyTemplate) {
    // Check for ACTUAL pathfinding implementation
    const hasDijkstraImpl = codeContent.includes('dijkstra') &&
                           (codeContent.includes('distance') || codeContent.includes('dist')) &&
                           codeContent.includes('visited');
    const hasBFSImpl = (codeContent.toLowerCase().includes('bfs') || codeContent.includes('breadth')) &&
                      codeContent.includes('queue') &&
                      codeContent.includes('visited');
    const hasAStarImpl = codeContent.toLowerCase().includes('astar') || codeContent.toLowerCase().includes('a*') ||
                        (codeContent.includes('heuristic') && codeContent.includes('priority'));
    const hasPathReconstruction = codeContent.includes('parent') || codeContent.includes('path') ||
                                  codeContent.includes('predecessor');

    if (hasDijkstraImpl) {
      algorithmScore += 12;
      algorithmFeedback += "Dijkstra's implementation. ";
    } else if (hasBFSImpl) {
      algorithmScore += 10;
      algorithmFeedback += 'BFS implementation. ';
    } else if (hasAStarImpl) {
      algorithmScore += 13;
      algorithmFeedback += 'A* implementation. ';
    }

    if (hasPathReconstruction) {
      algorithmScore += 7;
      algorithmFeedback += 'Path reconstruction logic. ';
    }

    // Check for neighbor exploration
    if ((codeContent.includes('neighbors') || codeContent.includes('adjacent')) &&
        codeContent.includes('directions')) {
      algorithmScore += 5;
      algorithmFeedback += 'Neighbor exploration. ';
    }
  }

  categories.push({
    name: criteria.categories[0].name,
    weight: criteria.categories[0].weight,
    score: Math.min(algorithmScore, 25),
    maxScore: 25,
    feedback: algorithmFeedback || 'Algorithm implementation needed.',
  });

  // Evaluate Data Structures (20%) - STRICTER
  let dsScore = 0;
  let dsFeedback = '';

  if (!isOnlyTemplate) {
    // Check for proper priority queue/heap
    const hasPriorityQueue = (codeContent.includes('PriorityQueue') || codeContent.includes('MinHeap') ||
                             codeContent.includes('priority')) &&
                            (codeContent.includes('enqueue') || codeContent.includes('insert') ||
                             codeContent.includes('push'));
    // Check for bitmask with actual state tracking
    const hasBitmaskState = (codeContent.includes('<<') || codeContent.includes('1 <<')) &&
                           (codeContent.includes('&') || codeContent.includes('|')) &&
                           (codeContent.includes('state') || codeContent.includes('collected'));
    // Check for 2D grid representation
    const has2DGrid = codeContent.includes('[][]') ||
                     (codeContent.includes('[row]') && codeContent.includes('[col]')) ||
                     (codeContent.includes('[y]') && codeContent.includes('[x]'));
    // Check for Set/Map usage
    const hasSetMap = codeContent.includes('new Set') || codeContent.includes('new Map') ||
                     codeContent.includes('Set()') || codeContent.includes('Map()');

    if (hasPriorityQueue) {
      dsScore += 8;
      dsFeedback += 'Priority queue implemented. ';
    }
    if (hasBitmaskState) {
      dsScore += 7;
      dsFeedback += 'Bitmask state tracking. ';
    }
    if (has2DGrid) {
      dsScore += 3;
      dsFeedback += '2D grid structure. ';
    }
    if (hasSetMap) {
      dsScore += 2;
      dsFeedback += 'Set/Map usage. ';
    }
  }

  categories.push({
    name: criteria.categories[1].name,
    weight: criteria.categories[1].weight,
    score: Math.min(dsScore, 20),
    maxScore: 20,
    feedback: dsFeedback || 'Data structures need improvement.',
  });

  // Evaluate Game Mechanics (20%) - STRICTER
  let mechanicsScore = 0;
  let mechanicsFeedback = '';

  if (!isOnlyTemplate) {
    // Check for actual grid parsing/creation
    const hasGridParsing = codeContent.includes('parseGrid') || codeContent.includes('createGrid') ||
                          (codeContent.includes('split') && codeContent.includes('map'));
    // Check for gem/key collection with state
    const hasCollectibles = (codeContent.includes('gem') || codeContent.includes('key') ||
                            codeContent.includes('collectible')) &&
                           (codeContent.includes('collect') || codeContent.includes('pickup'));
    // Check for portal teleportation logic
    const hasPortals = codeContent.includes('portal') &&
                      (codeContent.includes('teleport') || codeContent.includes('pair') ||
                       codeContent.includes('destination'));
    // Check for laser/door mechanics with conditions
    const hasObstacles = (codeContent.includes('laser') || codeContent.includes('door')) &&
                        (codeContent.includes('blocked') || codeContent.includes('passable') ||
                         codeContent.includes('check'));
    // Check for start/end detection
    const hasStartEnd = (codeContent.includes('start') || codeContent.includes('S')) &&
                       (codeContent.includes('end') || codeContent.includes('exit') ||
                        codeContent.includes('E') || codeContent.includes('vault'));

    if (hasGridParsing) {
      dsScore += 4;
      mechanicsFeedback += 'Grid parsing. ';
    }
    if (hasCollectibles) {
      mechanicsScore += 5;
      mechanicsFeedback += 'Collectibles system. ';
    }
    if (hasPortals) {
      mechanicsScore += 5;
      mechanicsFeedback += 'Portal teleportation. ';
    }
    if (hasObstacles) {
      mechanicsScore += 4;
      mechanicsFeedback += 'Obstacle handling. ';
    }
    if (hasStartEnd) {
      mechanicsScore += 2;
      mechanicsFeedback += 'Start/end detection. ';
    }
  }

  categories.push({
    name: criteria.categories[2].name,
    weight: criteria.categories[2].weight,
    score: Math.min(mechanicsScore, 20),
    maxScore: 20,
    feedback: mechanicsFeedback || 'Game mechanics need work.',
  });

  // Evaluate Code Quality (15%) - STRICTER
  let qualityScore = 0;
  let qualityFeedback = '';

  if (!isOnlyTemplate) {
    // Check for proper class/function structure
    const hasClassStructure = codeContent.includes('class ') && codeContent.includes('constructor');
    const hasNamedFunctions = (codeContent.match(/function \w+/g) || []).length >= 3;
    const hasModernSyntax = codeContent.includes('const ') && codeContent.includes('let ') &&
                           !codeContent.includes('var ');
    const hasExports = codeContent.includes('export') || codeContent.includes('module.exports');
    const hasSeparation = codeContent.includes('// ') && codeContent.length > 1000;

    if (hasClassStructure) {
      qualityScore += 5;
      qualityFeedback += 'Class-based design. ';
    } else if (hasNamedFunctions) {
      qualityScore += 4;
      qualityFeedback += 'Modular functions. ';
    }
    if (hasModernSyntax) {
      qualityScore += 4;
      qualityFeedback += 'Modern ES6+ syntax. ';
    }
    if (hasExports) {
      qualityScore += 3;
      qualityFeedback += 'Module exports. ';
    }
    if (hasSeparation) {
      qualityScore += 3;
      qualityFeedback += 'Well-organized code. ';
    }
  }

  categories.push({
    name: criteria.categories[3].name,
    weight: criteria.categories[3].weight,
    score: Math.min(qualityScore, 15),
    maxScore: 15,
    feedback: qualityFeedback || 'Code quality needs improvement.',
  });

  // Evaluate Complexity Analysis (10%) - STRICTER
  let complexityScore = 0;
  let complexityFeedback = '';

  if (!isOnlyTemplate) {
    // Check for documented complexity
    const hasTimeComplexity = codeContent.includes('O(') && codeContent.includes('Time');
    const hasSpaceComplexity = codeContent.includes('O(') && codeContent.includes('Space');
    const hasComplexityComment = codeContent.includes('complexity') &&
                                (codeContent.includes('V') || codeContent.includes('E') ||
                                 codeContent.includes('n'));

    if (hasTimeComplexity) {
      complexityScore += 5;
      complexityFeedback += 'Time complexity documented. ';
    }
    if (hasSpaceComplexity) {
      complexityScore += 3;
      complexityFeedback += 'Space complexity documented. ';
    }
    if (hasComplexityComment && !hasTimeComplexity) {
      complexityScore += 2;
      complexityFeedback += 'Complexity mentioned. ';
    }
  }

  categories.push({
    name: criteria.categories[4].name,
    weight: criteria.categories[4].weight,
    score: Math.min(complexityScore, 10),
    maxScore: 10,
    feedback: complexityFeedback || 'Complexity analysis missing.',
  });

  // Evaluate Testing (5%) - STRICTER
  let testScore = 0;
  let testFeedback = '';

  if (!isOnlyTemplate) {
    const hasTestCases = (codeContent.includes('test') || codeContent.includes('Test')) &&
                        (codeContent.includes('expect') || codeContent.includes('assert') ||
                         codeContent.includes('==='));
    const hasExampleRun = codeContent.includes('example') || codeContent.includes('sample') ||
                         codeContent.includes('// Test');

    if (hasTestCases) {
      testScore += 4;
      testFeedback += 'Test cases included. ';
    }
    if (hasExampleRun) {
      testScore += 1;
      testFeedback += 'Example provided. ';
    }
  }

  categories.push({
    name: criteria.categories[5].name,
    weight: criteria.categories[5].weight,
    score: Math.min(testScore, 5),
    maxScore: 5,
    feedback: testFeedback || 'No tests found.',
  });

  // Evaluate Performance (3%) - STRICTER
  let perfScore = 0;
  let perfFeedback = '';

  if (!isOnlyTemplate && codeContent.length > 800) {
    // Check for optimizations
    const hasEarlyReturn = codeContent.includes('return') && codeContent.includes('if (');
    const hasMemoization = codeContent.includes('memo') || codeContent.includes('cache') ||
                          codeContent.includes('visited');

    if (hasMemoization) {
      perfScore += 2;
      perfFeedback += 'Memoization/caching. ';
    }
    if (hasEarlyReturn) {
      perfScore += 1;
      perfFeedback += 'Early returns. ';
    }
  }

  categories.push({
    name: criteria.categories[6].name,
    weight: criteria.categories[6].weight,
    score: Math.min(perfScore, 3),
    maxScore: 3,
    feedback: perfFeedback || 'Performance not evaluated.',
  });

  // Evaluate Documentation (2%) - STRICTER
  let docScore = 0;
  let docFeedback = '';

  if (!isOnlyTemplate) {
    const hasJSDoc = codeContent.includes('/**') && codeContent.includes('*/');
    const hasInlineComments = (codeContent.match(/\/\/ /g) || []).length >= 5;

    if (hasJSDoc) {
      docScore += 1;
      docFeedback += 'JSDoc comments. ';
    }
    if (hasInlineComments) {
      docScore += 1;
      docFeedback += 'Inline comments. ';
    }
  }

  categories.push({
    name: criteria.categories[7].name,
    weight: criteria.categories[7].weight,
    score: Math.min(docScore, 2),
    maxScore: 2,
    feedback: docFeedback || 'Documentation missing.',
  });

  const totalScore = categories.reduce((sum, cat) => sum + cat.score, 0);
  const percentage = Math.round((totalScore / 100) * 100);

  return {
    playerName,
    challenge: 2,
    totalScore,
    maxScore: 100,
    percentage,
    grade: getGrade(percentage),
    categories,
    filesFound,
    timestamp: new Date().toISOString(),
  };
}

export function evaluateWorkspace(playerName: string, challenge: number): EvaluationResult {
  const sanitizedName = playerName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50);
  const workspacePath = join(WORKSPACES_DIR, `${sanitizedName}_challenge${challenge}`);

  if (challenge === 1) {
    return evaluateChallenge1(workspacePath, playerName);
  } else {
    return evaluateChallenge2(workspacePath, playerName);
  }
}

export function generateGradesMarkdown(
  player1Result: EvaluationResult,
  player2Result: EvaluationResult
): string {
  const winner = player1Result.totalScore > player2Result.totalScore
    ? player1Result.playerName
    : player2Result.totalScore > player1Result.totalScore
    ? player2Result.playerName
    : 'Tie';

  const challengeName = player1Result.challenge === 1 ? 'BracketValidator' : 'QuantumHeist';

  let md = `# Prompt Duel - Evaluation Results

## Challenge: ${challengeName} (Challenge ${player1Result.challenge})

**Evaluation Date:** ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}

---

## 🏆 Winner: ${winner}

---

## Player 1: ${player1Result.playerName}

### Overall Score: ${player1Result.totalScore}/${player1Result.maxScore} (${player1Result.percentage}%) - Grade: **${player1Result.grade}**

| Category | Score | Max | Feedback |
|----------|-------|-----|----------|
`;

  for (const cat of player1Result.categories) {
    md += `| ${cat.name} | ${cat.score} | ${cat.maxScore} | ${cat.feedback} |\n`;
  }

  md += `
### Files Found
${player1Result.filesFound.length > 0 ? player1Result.filesFound.map(f => `- ${f}`).join('\n') : '- No files found'}

---

## Player 2: ${player2Result.playerName}

### Overall Score: ${player2Result.totalScore}/${player2Result.maxScore} (${player2Result.percentage}%) - Grade: **${player2Result.grade}**

| Category | Score | Max | Feedback |
|----------|-------|-----|----------|
`;

  for (const cat of player2Result.categories) {
    md += `| ${cat.name} | ${cat.score} | ${cat.maxScore} | ${cat.feedback} |\n`;
  }

  md += `
### Files Found
${player2Result.filesFound.length > 0 ? player2Result.filesFound.map(f => `- ${f}`).join('\n') : '- No files found'}

---

## Comparison

| Metric | ${player1Result.playerName} | ${player2Result.playerName} |
|--------|------|------|
| Total Score | ${player1Result.totalScore} | ${player2Result.totalScore} |
| Percentage | ${player1Result.percentage}% | ${player2Result.percentage}% |
| Grade | ${player1Result.grade} | ${player2Result.grade} |

---

*Generated by Prompt Duel Evaluation System*
`;

  return md;
}

export function saveGradesMarkdown(
  player1Result: EvaluationResult,
  player2Result: EvaluationResult
): string {
  const md = generateGradesMarkdown(player1Result, player2Result);
  const timestamp = Date.now();
  const filename = `grades_${timestamp}.md`;
  const filepath = join(WORKSPACES_DIR, filename);

  writeFileSync(filepath, md);
  console.log(`Grades saved to: ${filepath}`);

  return filepath;
}

export type { EvaluationResult, CategoryScore };
