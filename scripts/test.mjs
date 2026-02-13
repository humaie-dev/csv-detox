#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fg from 'fast-glob';

const pattern = 'src/**/__tests__/**/*.test.ts';
const testFiles = await fg(pattern);

if (testFiles.length === 0) {
  console.error(`No test files found matching pattern: ${pattern}`);
  process.exit(1);
}

const args = ['--import', 'tsx', '--test', ...testFiles];
const proc = spawn('node', args, { stdio: 'inherit' });

proc.on('exit', (code) => {
  process.exit(code || 0);
});
