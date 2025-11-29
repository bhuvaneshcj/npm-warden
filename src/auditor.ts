import { execSync } from "child_process";
import { join } from "path";
import type {
    PackageInfo,
    RegistryMetadata,
    RiskFlag,
    AuditResult,
    AuditConfig,
    NpmAuditResult,
} from "./types.js";

export class DependencyAuditor {
    private config: AuditConfig;
    private projectRoot: string;

    constructor(config: AuditConfig, projectRoot: string = process.cwd()) {
        this.config = config;
        this.projectRoot = projectRoot;
    }

    /**
     * Audit packages and return results with risk flags
     */
    async auditPackages(
        packages: PackageInfo[],
        registryMetadata: Map<string, RegistryMetadata>,
    ): Promise<AuditResult[]> {
        const securityVulnerabilities = await this.getSecurityVulnerabilities();

        const results: AuditResult[] = [];

        for (const pkg of packages) {
            const metadata = registryMetadata.get(pkg.name);
            const risks = this.assessRisks(
                pkg,
                metadata,
                securityVulnerabilities,
            );

            results.push({
                package: pkg,
                registryMetadata: metadata,
                risks,
            });
        }

        return results;
    }

    /**
     * Assess risks for a single package
     */
    private assessRisks(
        pkg: PackageInfo,
        metadata: RegistryMetadata | undefined,
        securityVulnerabilities: Map<string, any>,
    ): RiskFlag[] {
        const risks: RiskFlag[] = [];

        if (!metadata) {
            // Package not found in registry - could be a risk
            risks.push({
                type: "low-usage",
                severity: "medium",
                reason: "Package not found in npm registry",
            });
            return risks;
        }

        // Check for stale packages
        if (metadata.lastPublished) {
            const monthsSincePublish = this.getMonthsSince(
                metadata.lastPublished,
            );
            if (monthsSincePublish > this.config.staleMonths) {
                risks.push({
                    type: "stale",
                    severity:
                        monthsSincePublish > 24
                            ? "high"
                            : monthsSincePublish > 18
                              ? "medium"
                              : "low",
                    reason: `Last published ${monthsSincePublish.toFixed(1)} months ago (threshold: ${this.config.staleMonths} months)`,
                    metadata: {
                        lastPublished: metadata.lastPublished,
                    },
                });
            }
        }

        // Check for low usage
        if (metadata.weeklyDownloads !== undefined) {
            if (metadata.weeklyDownloads < this.config.minDownloads) {
                risks.push({
                    type: "low-usage",
                    severity:
                        metadata.weeklyDownloads < 100
                            ? "high"
                            : metadata.weeklyDownloads < 500
                              ? "medium"
                              : "low",
                    reason: `Low weekly downloads: ${metadata.weeklyDownloads} (threshold: ${this.config.minDownloads})`,
                    metadata: {
                        weeklyDownloads: metadata.weeklyDownloads,
                    },
                });
            }
        } else {
            // No download stats available - could indicate very low usage
            risks.push({
                type: "low-usage",
                severity: "low",
                reason: "Download statistics unavailable - package may have very low usage",
            });
        }

        // Check for security vulnerabilities
        const vuln = securityVulnerabilities.get(pkg.name);
        if (vuln) {
            const severity = this.mapNpmSeverityToRisk(vuln.severity);
            risks.push({
                type: "security",
                severity,
                reason: `Security vulnerability: ${vuln.via[0]?.title || "Unknown vulnerability"}`,
                metadata: {
                    vulnerability: {
                        id: vuln.via[0]?.name || pkg.name,
                        title: vuln.via[0]?.title || "Unknown",
                        severity: vuln.severity,
                    },
                },
            });
        }

        return risks;
    }

    /**
     * Get security vulnerabilities using npm audit
     */
    private async getSecurityVulnerabilities(): Promise<Map<string, any>> {
        const vulnerabilities = new Map<string, any>();

        try {
            // Run npm audit in JSON mode
            const output = execSync("npm audit --json", {
                cwd: this.projectRoot,
                encoding: "utf-8",
                stdio: ["ignore", "pipe", "ignore"],
            });

            const auditResult: NpmAuditResult = JSON.parse(output);

            if (auditResult.vulnerabilities) {
                for (const [packageName, vuln] of Object.entries(
                    auditResult.vulnerabilities,
                )) {
                    // Extract the actual package name (npm audit uses paths like "package@version")
                    const name = vuln.name || packageName.split("@")[0];
                    vulnerabilities.set(name, vuln);
                }
            }
        } catch (error) {
            // npm audit may fail if there are vulnerabilities or if npm is not available
            // Try to parse the error output
            if (error instanceof Error && "stdout" in error) {
                try {
                    const output = (error as any).stdout?.toString() || "";
                    const auditResult: NpmAuditResult = JSON.parse(output);

                    if (auditResult.vulnerabilities) {
                        for (const [packageName, vuln] of Object.entries(
                            auditResult.vulnerabilities,
                        )) {
                            const name = vuln.name || packageName.split("@")[0];
                            vulnerabilities.set(name, vuln);
                        }
                    }
                } catch {
                    // Ignore parse errors
                }
            }
        }

        return vulnerabilities;
    }

    private getMonthsSince(date: Date): number {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays / 30.44; // Average days per month
    }

    private mapNpmSeverityToRisk(severity: string): "low" | "medium" | "high" {
        switch (severity.toLowerCase()) {
            case "critical":
            case "high":
                return "high";
            case "moderate":
            case "medium":
                return "medium";
            case "low":
            case "info":
                return "low";
            default:
                return "medium";
        }
    }
}
