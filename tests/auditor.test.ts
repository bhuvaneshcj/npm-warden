import { test } from "node:test";
import assert from "node:assert";
import { DependencyAuditor } from "../src/auditor.js";
import type {
    PackageInfo,
    RegistryMetadata,
    AuditConfig,
} from "../src/types.js";

test("DependencyAuditor - flag stale packages", async () => {
    const config: AuditConfig = {
        staleMonths: 12,
        minDownloads: 1000,
        skipDev: false,
        outputFormat: "text",
        failOnRisk: false,
    };

    const auditor = new DependencyAuditor(config);
    const packages: PackageInfo[] = [
        {
            name: "stale-package",
            version: "1.0.0",
            isDirect: true,
            isDev: false,
        },
    ];

    const metadata = new Map<string, RegistryMetadata>();
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 18); // 18 months ago
    metadata.set("stale-package", {
        name: "stale-package",
        version: "1.0.0",
        lastPublished: oldDate,
        weeklyDownloads: 5000,
    });

    const results = await auditor.auditPackages(packages, metadata);

    assert.strictEqual(results.length, 1);
    assert.ok(results[0].risks.length > 0);
    assert.ok(results[0].risks.some((r) => r.type === "stale"));
});

test("DependencyAuditor - flag low usage packages", async () => {
    const config: AuditConfig = {
        staleMonths: 12,
        minDownloads: 1000,
        skipDev: false,
        outputFormat: "text",
        failOnRisk: false,
    };

    const auditor = new DependencyAuditor(config);
    const packages: PackageInfo[] = [
        {
            name: "low-usage-package",
            version: "1.0.0",
            isDirect: true,
            isDev: false,
        },
    ];

    const metadata = new Map<string, RegistryMetadata>();
    const recentDate = new Date();
    recentDate.setMonth(recentDate.getMonth() - 1); // 1 month ago
    metadata.set("low-usage-package", {
        name: "low-usage-package",
        version: "1.0.0",
        lastPublished: recentDate,
        weeklyDownloads: 50, // Below threshold
    });

    const results = await auditor.auditPackages(packages, metadata);

    assert.strictEqual(results.length, 1);
    assert.ok(results[0].risks.length > 0);
    assert.ok(results[0].risks.some((r) => r.type === "low-usage"));
});

test("DependencyAuditor - no risks for healthy package", async () => {
    const config: AuditConfig = {
        staleMonths: 12,
        minDownloads: 1000,
        skipDev: false,
        outputFormat: "text",
        failOnRisk: false,
    };

    const auditor = new DependencyAuditor(config);
    const packages: PackageInfo[] = [
        {
            name: "healthy-package",
            version: "1.0.0",
            isDirect: true,
            isDev: false,
        },
    ];

    const metadata = new Map<string, RegistryMetadata>();
    const recentDate = new Date();
    recentDate.setMonth(recentDate.getMonth() - 1); // 1 month ago
    metadata.set("healthy-package", {
        name: "healthy-package",
        version: "1.0.0",
        lastPublished: recentDate,
        weeklyDownloads: 50000, // Above threshold
    });

    const results = await auditor.auditPackages(packages, metadata);

    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].risks.length, 0);
});
