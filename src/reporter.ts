import type { AuditResult, RiskFlag } from "./types.js";

export class Reporter {
    /**
     * Generate human-readable report
     */
    generateTextReport(results: AuditResult[]): string {
        const flaggedResults = results.filter((r) => r.risks.length > 0);

        if (flaggedResults.length === 0) {
            return "\n✅ No risks found! All dependencies look healthy.\n";
        }

        let output = "\n";
        output += "⚠️  Dependency Risk Report\n";
        output += "=".repeat(60) + "\n\n";

        // Group by risk type
        const byType: Record<string, AuditResult[]> = {
            security: [],
            stale: [],
            "low-usage": [],
        };

        for (const result of flaggedResults) {
            for (const risk of result.risks) {
                if (!byType[risk.type]) {
                    byType[risk.type] = [];
                }
                if (
                    !byType[risk.type].some(
                        (r) => r.package.name === result.package.name,
                    )
                ) {
                    byType[risk.type].push(result);
                }
            }
        }

        // Security vulnerabilities
        if (byType.security.length > 0) {
            output += "🔴 SECURITY VULNERABILITIES\n";
            output += "-".repeat(60) + "\n";
            for (const result of byType.security) {
                const securityRisk = result.risks.find(
                    (r) => r.type === "security",
                );
                output += this.formatPackageInfo(result, securityRisk);
            }
            output += "\n";
        }

        // Stale packages
        if (byType.stale.length > 0) {
            output += "🟡 STALE PACKAGES\n";
            output += "-".repeat(60) + "\n";
            for (const result of byType.stale) {
                const staleRisk = result.risks.find((r) => r.type === "stale");
                output += this.formatPackageInfo(result, staleRisk);
            }
            output += "\n";
        }

        // Low usage packages
        if (byType["low-usage"].length > 0) {
            output += "🟠 LOW USAGE PACKAGES\n";
            output += "-".repeat(60) + "\n";
            for (const result of byType["low-usage"]) {
                const lowUsageRisk = result.risks.find(
                    (r) => r.type === "low-usage",
                );
                output += this.formatPackageInfo(result, lowUsageRisk);
            }
            output += "\n";
        }

        // Summary
        output += "Summary\n";
        output += "-".repeat(60) + "\n";
        output += `Total packages audited: ${results.length}\n`;
        output += `Packages with risks: ${flaggedResults.length}\n`;
        output += `  - Security: ${byType.security.length}\n`;
        output += `  - Stale: ${byType.stale.length}\n`;
        output += `  - Low usage: ${byType["low-usage"].length}\n`;

        return output;
    }

    private formatPackageInfo(result: AuditResult, risk?: RiskFlag): string {
        let output = "";
        const pkg = result.package;
        const meta = result.registryMetadata;

        output += `\n${pkg.name}@${pkg.version}`;
        if (pkg.isDirect) {
            output += " (direct)";
        }
        if (pkg.isDev) {
            output += " [dev]";
        }
        output += "\n";

        if (risk) {
            output += `  Risk: ${risk.type.toUpperCase()} - ${risk.severity.toUpperCase()} severity\n`;
            output += `  Reason: ${risk.reason}\n`;
        }

        if (meta) {
            if (meta.lastPublished) {
                const monthsAgo = Math.round(
                    (Date.now() - meta.lastPublished.getTime()) /
                        (1000 * 60 * 60 * 24 * 30.44),
                );
                output += `  Last published: ${monthsAgo} months ago\n`;
            }
            if (meta.weeklyDownloads !== undefined) {
                output += `  Weekly downloads: ${meta.weeklyDownloads.toLocaleString()}\n`;
            }
            if (meta.description) {
                output += `  Description: ${meta.description.substring(0, 80)}${meta.description.length > 80 ? "..." : ""}\n`;
            }
        }

        return output;
    }

    /**
     * Generate JSON report
     */
    generateJsonReport(results: AuditResult[]): string {
        const flaggedResults = results.filter((r) => r.risks.length > 0);

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: results.length,
                flagged: flaggedResults.length,
                byType: {
                    security: results.filter((r) =>
                        r.risks.some((risk) => risk.type === "security"),
                    ).length,
                    stale: results.filter((r) =>
                        r.risks.some((risk) => risk.type === "stale"),
                    ).length,
                    "low-usage": results.filter((r) =>
                        r.risks.some((risk) => risk.type === "low-usage"),
                    ).length,
                },
            },
            packages: flaggedResults.map((result) => ({
                name: result.package.name,
                version: result.package.version,
                isDirect: result.package.isDirect,
                isDev: result.package.isDev,
                metadata: result.registryMetadata
                    ? {
                          lastPublished:
                              result.registryMetadata.lastPublished?.toISOString(),
                          weeklyDownloads:
                              result.registryMetadata.weeklyDownloads,
                          description: result.registryMetadata.description,
                      }
                    : null,
                risks: result.risks.map((risk) => ({
                    type: risk.type,
                    severity: risk.severity,
                    reason: risk.reason,
                    vulnerability: risk.metadata?.vulnerability,
                })),
            })),
        };

        return JSON.stringify(report, null, 2);
    }

    /**
     * Check if there are any high-severity risks
     */
    hasHighSeverityRisks(results: AuditResult[]): boolean {
        return results.some((result) =>
            result.risks.some((risk) => risk.severity === "high"),
        );
    }
}
