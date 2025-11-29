import { test } from 'node:test';
import assert from 'node:assert';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { DependencyParser } from '../src/parser.js';

const TEST_DIR = join(process.cwd(), '.test-tmp');

test('DependencyParser - parse package.json with dependencies', async () => {
  // Setup
  mkdirSync(TEST_DIR, { recursive: true });
  const packageJson = {
    name: 'test-project',
    version: '1.0.0',
    dependencies: {
      'package-a': '^1.0.0',
      'package-b': '~2.0.0',
    },
    devDependencies: {
      'package-c': '3.0.0',
    },
  };
  writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify(packageJson, null, 2));

  // Test
  const parser = new DependencyParser(TEST_DIR);
  const packages = await parser.parseDependencies(false);

  // Assert
  assert.strictEqual(packages.length, 3);
  assert.ok(packages.some(p => p.name === 'package-a' && p.isDirect));
  assert.ok(packages.some(p => p.name === 'package-b' && p.isDirect));
  assert.ok(packages.some(p => p.name === 'package-c' && p.isDirect && p.isDev));

  // Cleanup
  rmSync(TEST_DIR, { recursive: true, force: true });
});

test('DependencyParser - skip dev dependencies', async () => {
  // Setup
  mkdirSync(TEST_DIR, { recursive: true });
  const packageJson = {
    name: 'test-project',
    version: '1.0.0',
    dependencies: {
      'package-a': '^1.0.0',
    },
    devDependencies: {
      'package-c': '3.0.0',
    },
  };
  writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify(packageJson, null, 2));

  // Test
  const parser = new DependencyParser(TEST_DIR);
  const packages = await parser.parseDependencies(true);

  // Assert
  assert.strictEqual(packages.length, 1);
  assert.ok(packages.some(p => p.name === 'package-a'));
  assert.ok(!packages.some(p => p.name === 'package-c'));

  // Cleanup
  rmSync(TEST_DIR, { recursive: true, force: true });
});

test('DependencyParser - parse package-lock.json', async () => {
  // Setup
  mkdirSync(TEST_DIR, { recursive: true });
  const packageJson = {
    name: 'test-project',
    version: '1.0.0',
    dependencies: {
      'package-a': '^1.0.0',
    },
  };
  const packageLock = {
    name: 'test-project',
    version: '1.0.0',
    lockfileVersion: 2,
    dependencies: {
      'package-a': {
        version: '1.0.1',
        resolved: 'https://registry.npmjs.org/package-a/-/package-a-1.0.1.tgz',
        dependencies: {
          'package-transitive': {
            version: '2.0.0',
          },
        },
      },
    },
  };
  writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify(packageJson, null, 2));
  writeFileSync(join(TEST_DIR, 'package-lock.json'), JSON.stringify(packageLock, null, 2));

  // Test
  const parser = new DependencyParser(TEST_DIR);
  const packages = await parser.parseDependencies(false);

  // Assert
  assert.ok(packages.length >= 1);
  assert.ok(packages.some(p => p.name === 'package-a'));

  // Cleanup
  rmSync(TEST_DIR, { recursive: true, force: true });
});

