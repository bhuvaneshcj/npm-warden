import { readFileSync } from "fs";
import { join } from "path";
import type {
    PackageInfo,
    PackageLock,
    PackageLockDependency,
} from "./types.js";

export class DependencyParser {
    private projectRoot: string;

    constructor(projectRoot: string = process.cwd()) {
        this.projectRoot = projectRoot;
    }

    /**
     * Parse package.json and lock file to build full dependency tree
     */
    async parseDependencies(skipDev: boolean = false): Promise<PackageInfo[]> {
        const packageJson = this.readPackageJson();
        const lockFile = this.readLockFile();

        const packages = new Map<string, PackageInfo>();

        // Add direct dependencies
        const directDeps = {
            ...packageJson.dependencies,
            ...(skipDev ? {} : packageJson.devDependencies),
        };
        for (const [name, version] of Object.entries(directDeps)) {
            packages.set(name, {
                name,
                version: this.normalizeVersion(String(version)),
                isDirect: true,
                isDev: !!packageJson.devDependencies?.[name],
            });
        }

        // Parse lock file for transitive dependencies
        if (lockFile) {
            this.extractFromLockFile(lockFile, packages, skipDev);
        }

        return Array.from(packages.values());
    }

    private readPackageJson(): any {
        try {
            const content = readFileSync(
                join(this.projectRoot, "package.json"),
                "utf-8",
            );
            return JSON.parse(content);
        } catch (error) {
            throw new Error(
                `Failed to read package.json: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    private readLockFile(): PackageLock | null {
        // Try package-lock.json first
        try {
            const content = readFileSync(
                join(this.projectRoot, "package-lock.json"),
                "utf-8",
            );
            return JSON.parse(content);
        } catch {
            // Try yarn.lock (simplified parsing - yarn.lock is more complex)
            try {
                const content = readFileSync(
                    join(this.projectRoot, "yarn.lock"),
                    "utf-8",
                );
                // For now, we'll just return null for yarn.lock and rely on package.json
                // A full yarn.lock parser would be more complex
                console.warn(
                    "yarn.lock detected but full parsing not implemented. Using package.json only.",
                );
                return null;
            } catch {
                return null;
            }
        }
    }

    private extractFromLockFile(
        lockFile: PackageLock,
        packages: Map<string, PackageInfo>,
        skipDev: boolean,
    ): void {
        if (!lockFile.dependencies) {
            return;
        }

        const visited = new Set<string>();

        const traverse = (
            deps: Record<string, PackageLockDependency>,
            isDevContext: boolean = false,
        ) => {
            for (const [name, dep] of Object.entries(deps)) {
                const key = `${name}@${dep.version}`;
                if (visited.has(key)) {
                    continue;
                }
                visited.add(key);

                const isDev = isDevContext || dep.dev === true;
                if (skipDev && isDev) {
                    // Still traverse nested deps even if we skip dev
                    if (dep.dependencies) {
                        traverse(dep.dependencies, isDev);
                    }
                    continue;
                }

                if (
                    !packages.has(name) ||
                    packages.get(name)!.version !== dep.version
                ) {
                    packages.set(name, {
                        name,
                        version: dep.version,
                        isDirect: false,
                        isDev,
                    });
                }

                if (dep.dependencies) {
                    traverse(dep.dependencies, isDev);
                }
            }
        };

        traverse(lockFile.dependencies);
    }

    private normalizeVersion(version: string): string {
        // Remove range prefixes like ^, ~, >=, etc.
        return version.replace(/^[\^~>=<]+/, "");
    }
}
