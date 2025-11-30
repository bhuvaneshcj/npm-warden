#!/usr/bin/env node

import { Command } from "commander";
import { DependencyParser } from "./parser.js";
import { RegistryClient } from "./registry.js";
import { DependencyAuditor } from "./auditor.js";
import { Reporter } from "./reporter.js";
import type { AuditConfig } from "./types.js";

const program = new Command();

program
    .name("npm-warden")
    .description("Audit npm dependencies for maintenance and security risks")
    .version("1.0.2")
    .option(
        "--stale-months <number>",
        "Months since last publish to flag as stale",
        "12",
    )
    .option(
        "--min-downloads <number>",
        "Minimum weekly downloads threshold",
        "1000",
    )
    .option("--skip-dev", "Exclude devDependencies from audit", false)
    .option("--output <format>", "Output format: text or json", "text")
    .option(
        "--fail-on-risk",
        "Exit with non-zero code if risks are found",
        false,
    )
    .action(async (options) => {
        try {
            const config: AuditConfig = {
                staleMonths: parseInt(options.staleMonths, 10),
                minDownloads: parseInt(options.minDownloads, 10),
                skipDev: options.skipDev,
                outputFormat: options.output === "json" ? "json" : "text",
                failOnRisk: options.failOnRisk,
            };

            // Validate config
            if (isNaN(config.staleMonths) || config.staleMonths < 0) {
                console.error(
                    "Error: --stale-months must be a positive number",
                );
                process.exit(1);
            }

            if (isNaN(config.minDownloads) || config.minDownloads < 0) {
                console.error(
                    "Error: --min-downloads must be a positive number",
                );
                process.exit(1);
            }

            if (
                config.outputFormat !== "text" &&
                config.outputFormat !== "json"
            ) {
                console.error(
                    'Error: --output must be either "text" or "json"',
                );
                process.exit(1);
            }

            // Parse dependencies
            console.log("📦 Parsing dependencies...");
            const parser = new DependencyParser();
            const packages = await parser.parseDependencies(config.skipDev);
            console.log(`Found ${packages.length} packages to audit`);

            // Fetch registry metadata
            console.log("🌐 Fetching package metadata from npm registry...");
            const registryClient = new RegistryClient();
            const registryMetadata = await registryClient.fetchMultiplePackages(
                packages.map((pkg) => ({
                    name: pkg.name,
                    version: pkg.version,
                })),
            );
            console.log(
                `Fetched metadata for ${registryMetadata.size} packages`,
            );

            // Audit packages
            console.log("🔍 Auditing packages for risks...");
            const auditor = new DependencyAuditor(config);
            const results = await auditor.auditPackages(
                packages,
                registryMetadata,
            );

            // Generate report
            const reporter = new Reporter();
            let output: string;

            if (config.outputFormat === "json") {
                output = reporter.generateJsonReport(results);
            } else {
                output = reporter.generateTextReport(results);
            }

            console.log(output);

            // Exit with appropriate code
            if (config.failOnRisk) {
                const hasRisks = results.some((r) => r.risks.length > 0);
                if (hasRisks) {
                    process.exit(1);
                }
            }

            process.exit(0);
        } catch (error) {
            console.error(
                "Error:",
                error instanceof Error ? error.message : String(error),
            );
            process.exit(1);
        }
    });

program.parse();
