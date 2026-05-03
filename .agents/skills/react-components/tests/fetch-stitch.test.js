/**
 * Tests for scripts/fetch-stitch.sh
 *
 * Tests the argument validation and error handling of the shell script
 * using Node.js child_process to spawn it as a subprocess.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'fetch-stitch.sh');

/**
 * Run fetch-stitch.sh with the given arguments.
 * @param {string[]} args
 * @param {number} [timeout]
 * @returns {{ exitCode: number, stdout: string, stderr: string }}
 */
function runScript(args = [], timeout = 5000) {
  const result = spawnSync('bash', [SCRIPT_PATH, ...args], {
    encoding: 'utf-8',
    timeout,
  });
  return {
    exitCode: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

describe('fetch-stitch.sh - argument validation', () => {
  it('exits with code 1 when no arguments are provided', () => {
    const { exitCode } = runScript([]);
    assert.equal(exitCode, 1);
  });

  it('prints usage message when no arguments are provided', () => {
    const { stdout } = runScript([]);
    assert.match(stdout, /Usage:/);
  });

  it('exits with code 1 when only URL is provided (missing output path)', () => {
    const { exitCode } = runScript(['https://example.com/file.html']);
    assert.equal(exitCode, 1);
  });

  it('prints usage message when only one argument is provided', () => {
    const { stdout } = runScript(['https://example.com/file.html']);
    assert.match(stdout, /Usage:/);
  });

  it('includes the script invocation syntax in the usage message', () => {
    const { stdout } = runScript([]);
    // Usage line: "Usage: <script> <url> <output_path>"
    assert.match(stdout, /<url>/);
    assert.match(stdout, /<output_path>/);
  });
});

describe('fetch-stitch.sh - initiation message', () => {
  it('prints the initiating message before attempting curl', () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'fetch-stitch-test-'));
    const tmpInput = path.join(tmpDir, 'input.html');
    const tmpOutput = path.join(tmpDir, 'output.html');

    try {
      writeFileSync(tmpInput, '<html>test</html>');
      const result = spawnSync(
        'bash',
        [SCRIPT_PATH, `file://${tmpInput}`, tmpOutput],
        { encoding: 'utf-8', timeout: 5000 }
      );
      assert.match(result.stdout, /Initiating high-reliability fetch for Stitch HTML/);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('fetch-stitch.sh - successful local file download', () => {
  it('exits with code 0 when curl succeeds with a local file URL', () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'fetch-stitch-test-'));
    const tmpInput = path.join(tmpDir, 'source.html');
    const tmpOutput = path.join(tmpDir, 'dest.html');

    try {
      writeFileSync(tmpInput, '<html><body>Test content</body></html>');
      const result = spawnSync(
        'bash',
        [SCRIPT_PATH, `file://${tmpInput}`, tmpOutput],
        { encoding: 'utf-8', timeout: 5000 }
      );
      assert.equal(result.status, 0);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('prints success message when download succeeds', () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'fetch-stitch-test-'));
    const tmpInput = path.join(tmpDir, 'source.html');
    const tmpOutput = path.join(tmpDir, 'dest.html');

    try {
      writeFileSync(tmpInput, '<html>content</html>');
      const result = spawnSync(
        'bash',
        [SCRIPT_PATH, `file://${tmpInput}`, tmpOutput],
        { encoding: 'utf-8', timeout: 5000 }
      );
      assert.match(result.stdout, /Successfully retrieved/);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('creates the output file at the specified path on success', () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'fetch-stitch-test-'));
    const tmpInput = path.join(tmpDir, 'source.html');
    const tmpOutput = path.join(tmpDir, 'output.html');

    try {
      writeFileSync(tmpInput, '<html>content</html>');
      spawnSync(
        'bash',
        [SCRIPT_PATH, `file://${tmpInput}`, tmpOutput],
        { encoding: 'utf-8', timeout: 5000 }
      );
      assert.ok(existsSync(tmpOutput), 'Output file should exist after successful download');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('includes the output path in the success message', () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'fetch-stitch-test-'));
    const tmpInput = path.join(tmpDir, 'source.html');
    const tmpOutput = path.join(tmpDir, 'my-design.html');

    try {
      writeFileSync(tmpInput, '<html>content</html>');
      const result = spawnSync(
        'bash',
        [SCRIPT_PATH, `file://${tmpInput}`, tmpOutput],
        { encoding: 'utf-8', timeout: 5000 }
      );
      assert.match(result.stdout, /my-design\.html/);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('fetch-stitch.sh - curl failure handling', () => {
  it('exits with code 1 when curl fails (unreachable URL)', () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'fetch-stitch-test-'));
    const tmpOutput = path.join(tmpDir, 'output.html');

    try {
      // curl -f returns non-zero for HTTP errors; an invalid host fails fast
      const result = spawnSync(
        'bash',
        [SCRIPT_PATH, 'file:///nonexistent-path-that-does-not-exist/file.html', tmpOutput],
        { encoding: 'utf-8', timeout: 5000 }
      );
      assert.equal(result.status, 1);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('prints error message when curl fails', () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'fetch-stitch-test-'));
    const tmpOutput = path.join(tmpDir, 'output.html');

    try {
      const result = spawnSync(
        'bash',
        [SCRIPT_PATH, 'file:///nonexistent-path-that-does-not-exist/file.html', tmpOutput],
        { encoding: 'utf-8', timeout: 5000 }
      );
      assert.match(result.stdout, /Error: Failed to retrieve content/);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});