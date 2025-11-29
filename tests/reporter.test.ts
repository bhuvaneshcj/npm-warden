import { test } from 'node:test';
import assert from 'node:assert';
import { Reporter } from '../src/reporter.js';
import type { AuditResult } from '../src/types.js';

test('Reporter - generate text report with risks', () => {
  const reporter = new Reporter();
  const results: AuditResult[] = [
    {
      package: {
        name: 'test-package',
        version: '1.0.0',
        isDirect: true,
        isDev: false,
      },
      registryMetadata: {
        name: 'test-package',
        version: '1.0.0',
        lastPublished: new Date('2020-01-01'),
        weeklyDownloads: 50,
      },
      risks: [
        {
          type: 'stale',
          severity: 'high',
          reason: 'Last published 48 months ago',
        },
      ],
    },
  ];

  const output = reporter.generateTextReport(results);
  assert.ok(output.includes('test-package'));
  assert.ok(output.includes('STALE'));
  assert.ok(output.includes('48 months ago'));
});

test('Reporter - generate text report with no risks', () => {
  const reporter = new Reporter();
  const results: AuditResult[] = [
    {
      package: {
        name: 'healthy-package',
        version: '1.0.0',
        isDirect: true,
        isDev: false,
      },
      registryMetadata: {
        name: 'healthy-package',
        version: '1.0.0',
      },
      risks: [],
    },
  ];

  const output = reporter.generateTextReport(results);
  assert.ok(output.includes('No risks found'));
});

test('Reporter - generate JSON report', () => {
  const reporter = new Reporter();
  const results: AuditResult[] = [
    {
      package: {
        name: 'test-package',
        version: '1.0.0',
        isDirect: true,
        isDev: false,
      },
      registryMetadata: {
        name: 'test-package',
        version: '1.0.0',
        lastPublished: new Date('2020-01-01'),
      },
      risks: [
        {
          type: 'stale',
          severity: 'high',
          reason: 'Last published 48 months ago',
        },
      ],
    },
  ];

  const output = reporter.generateJsonReport(results);
  const parsed = JSON.parse(output);

  assert.strictEqual(parsed.summary.total, 1);
  assert.strictEqual(parsed.summary.flagged, 1);
  assert.strictEqual(parsed.packages.length, 1);
  assert.strictEqual(parsed.packages[0].name, 'test-package');
});

test('Reporter - detect high severity risks', () => {
  const reporter = new Reporter();
  const results: AuditResult[] = [
    {
      package: {
        name: 'test-package',
        version: '1.0.0',
        isDirect: true,
        isDev: false,
      },
      registryMetadata: undefined,
      risks: [
        {
          type: 'security',
          severity: 'high',
          reason: 'Critical vulnerability',
        },
      ],
    },
  ];

  assert.strictEqual(reporter.hasHighSeverityRisks(results), true);
});

