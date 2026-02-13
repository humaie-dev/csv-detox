#!/usr/bin/env node
/**
 * PR Review Script
 * 
 * This script analyzes a pull request and generates a review using the OpenCode Review Agent.
 * It examines changed files, runs quality checks, and provides constructive feedback.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Environment variables
const PR_NUMBER = process.env.PR_NUMBER;
const BASE_REF = process.env.BASE_REF || 'main';
const HEAD_REF = process.env.HEAD_REF;

console.log(`📋 Reviewing PR #${PR_NUMBER}: ${HEAD_REF} -> ${BASE_REF}`);

// Ensure we have the latest refs
console.log('🔄 Fetching latest refs...');
run('git fetch origin', { silent: true, allowFailure: true });

/**
 * Run a command and return output
 */
function run(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    }).trim();
  } catch (error) {
    if (options.allowFailure) {
      return null;
    }
    throw error;
  }
}

/**
 * Get changed files in the PR
 */
function getChangedFiles() {
  // Try with origin prefix first (works in CI)
  let diff = run(`git diff --name-only origin/${BASE_REF}...HEAD`, { silent: true, allowFailure: true });
  
  // If that fails, try without origin prefix (works locally)
  if (!diff) {
    diff = run(`git diff --name-only ${BASE_REF}...HEAD`, { silent: true, allowFailure: true });
  }
  
  // If still no diff, get all tracked files as fallback
  if (!diff) {
    diff = run('git ls-files', { silent: true, allowFailure: true });
  }
  
  return diff ? diff.split('\n').filter(Boolean) : [];
}

/**
 * Get diff stats
 */
function getDiffStats() {
  // Try with origin prefix first
  let stats = run(`git diff --stat origin/${BASE_REF}...HEAD`, { silent: true, allowFailure: true });
  
  // Try without origin prefix
  if (!stats) {
    stats = run(`git diff --stat ${BASE_REF}...HEAD`, { silent: true, allowFailure: true });
  }
  
  return stats || 'Unable to get diff stats';
}

/**
 * Check if tests pass
 */
function checkTests() {
  console.log('\n🧪 Running tests...');
  try {
    run('npm test', { silent: true });
    return { passed: true, message: 'All tests passed' };
  } catch (error) {
    return { passed: false, message: 'Some tests failed' };
  }
}

/**
 * Check if linting passes
 */
function checkLinting() {
  console.log('\n🎨 Running linter...');
  try {
    run('npm run lint', { silent: true });
    return { passed: true, message: 'No linting errors' };
  } catch (error) {
    return { passed: false, message: 'Linting errors found' };
  }
}

/**
 * Check if build succeeds
 */
function checkBuild() {
  console.log('\n🏗️  Building project...');
  try {
    run('npm run build', { 
      silent: true,
      env: { ...process.env, NEXT_PUBLIC_CONVEX_URL: 'https://dummy.convex.cloud' }
    });
    return { passed: true, message: 'Build successful' };
  } catch (error) {
    return { passed: false, message: 'Build failed' };
  }
}

/**
 * Analyze changed files for potential issues
 */
function analyzeFiles(files) {
  const issues = [];
  const suggestions = [];
  const positive = [];

  for (const file of files) {
    // Skip non-source files
    if (!file.match(/\.(ts|tsx|js|jsx)$/)) continue;
    if (file.includes('node_modules/')) continue;

    try {
      const content = fs.readFileSync(file, 'utf8');

      // Check for console.log (should use proper logging)
      if (content.includes('console.log') && !file.includes('__tests__')) {
        suggestions.push(`\`${file}\`: Contains console.log statements - consider using proper logging`);
      }

      // Check for any type usage
      if (content.match(/:\s*any\b/) && !content.includes('eslint-disable')) {
        issues.push(`\`${file}\`: Uses \`any\` type - consider using more specific types`);
      }

      // Check for proper test files
      if (file.includes('__tests__') || file.endsWith('.test.ts') || file.endsWith('.test.tsx')) {
        positive.push(`\`${file}\`: Test file included ✓`);
      }

      // Check for TODOs
      const todos = content.match(/\/\/\s*TODO:/g);
      if (todos) {
        suggestions.push(`\`${file}\`: Contains ${todos.length} TODO comment(s)`);
      }

    } catch (error) {
      // File might have been deleted
      continue;
    }
  }

  return { issues, suggestions, positive };
}

/**
 * Generate review report
 */
function generateReview() {
  console.log('\n📊 Generating review...\n');

  const changedFiles = getChangedFiles();
  const diffStats = getDiffStats();
  const tests = checkTests();
  const linting = checkLinting();
  const build = checkBuild();
  const analysis = analyzeFiles(changedFiles);

  const allChecksPassed = tests.passed && linting.passed && build.passed;

  let review = `## 🤖 Automated Code Review

### Summary
This PR modifies **${changedFiles.length} file(s)**.

\`\`\`
${diffStats}
\`\`\`

### Quality Gates

${tests.passed ? '✅' : '❌'} **Tests**: ${tests.message}
${linting.passed ? '✅' : '❌'} **Linting**: ${linting.message}
${build.passed ? '✅' : '❌'} **Build**: ${build.message}

`;

  // Critical issues
  if (analysis.issues.length > 0 || !allChecksPassed) {
    review += `### Critical Issues 🔴

`;
    if (!tests.passed) {
      review += `- Tests are failing - must be fixed before merging\n`;
    }
    if (!linting.passed) {
      review += `- Linting errors must be resolved\n`;
    }
    if (!build.passed) {
      review += `- Build is broken - must be fixed\n`;
    }
    analysis.issues.forEach(issue => {
      review += `- ${issue}\n`;
    });
    review += '\n';
  }

  // Suggestions
  if (analysis.suggestions.length > 0) {
    review += `### Suggestions 🟡

`;
    analysis.suggestions.forEach(suggestion => {
      review += `- ${suggestion}\n`;
    });
    review += '\n';
  }

  // Positive notes
  if (analysis.positive.length > 0) {
    review += `### Positive Notes 🟢

`;
    analysis.positive.forEach(note => {
      review += `- ${note}\n`;
    });
    review += '\n';
  }

  // Recommendation
  review += `### Recommendation

`;
  if (allChecksPassed && analysis.issues.length === 0) {
    review += `✅ **Approve** - All quality gates passed. Ready to merge after human review.
`;
  } else if (!allChecksPassed || analysis.issues.length > 0) {
    review += `🔄 **Request Changes** - Critical issues must be addressed before merging.
`;
  } else {
    review += `💬 **Comment** - Minor suggestions to consider.
`;
  }

  review += `
---
*This is an automated review. A human reviewer should still review the code for logic, design, and business requirements.*
`;

  return review;
}

// Main execution
try {
  const review = generateReview();
  fs.writeFileSync('review-output.md', review);
  console.log('\n✅ Review complete! Output written to review-output.md\n');
  console.log(review);
} catch (error) {
  console.error('❌ Review failed:', error.message);
  process.exit(1);
}
