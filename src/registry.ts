import type { RegistryMetadata, NpmRegistryResponse } from './types.js';

const NPM_REGISTRY_URL = 'https://registry.npmjs.org';
const NPM_DOWNLOADS_URL = 'https://api.npmjs.org/downloads';

export class RegistryClient {
  private cache = new Map<string, RegistryMetadata>();
  private rateLimitDelay = 100; // ms between requests

  /**
   * Fetch metadata for a package from npm registry
   */
  async fetchPackageMetadata(packageName: string, version?: string): Promise<RegistryMetadata | null> {
    const cacheKey = `${packageName}@${version || 'latest'}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Add delay to respect rate limits
      await this.delay(this.rateLimitDelay);

      const response = await fetch(`${NPM_REGISTRY_URL}/${packageName}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch metadata for ${packageName}: ${response.statusText}`);
      }

      const data = await response.json() as NpmRegistryResponse;
      
      // Determine which version to use
      const targetVersion = version || data['dist-tags']?.latest;
      const versionData = data.versions?.[targetVersion];
      
      if (!versionData) {
        return null;
      }

      // Get last published date for this version
      const lastPublished = data.time?.[targetVersion] 
        ? new Date(data.time[targetVersion])
        : data.time?.modified 
        ? new Date(data.time.modified)
        : data.time?.created
        ? new Date(data.time.created)
        : undefined;

      // Fetch download stats (separate API call)
      const downloads = await this.fetchDownloadStats(packageName);

      const metadata: RegistryMetadata = {
        name: packageName,
        version: targetVersion,
        lastPublished,
        weeklyDownloads: downloads,
        description: data.description,
      };

      this.cache.set(cacheKey, metadata);
      return metadata;
    } catch (error) {
      console.warn(`Warning: Failed to fetch metadata for ${packageName}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Fetch download statistics for a package
   */
  private async fetchDownloadStats(packageName: string): Promise<number | undefined> {
    try {
      // Get last week's downloads
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const start = this.formatDate(startDate);
      const end = this.formatDate(endDate);

      const response = await fetch(
        `${NPM_DOWNLOADS_URL}/range/${start}:${end}/${packageName}`
      );

      if (!response.ok) {
        return undefined;
      }

      const data = await response.json() as { downloads?: Array<{ downloads: number }> };
      
      // Sum up downloads for the week
      if (data.downloads && Array.isArray(data.downloads)) {
        return data.downloads.reduce((sum: number, day: { downloads: number }) => sum + (day.downloads || 0), 0);
      }

      return undefined;
    } catch (error) {
      // Silently fail - downloads are optional
      return undefined;
    }
  }

  /**
   * Fetch metadata for multiple packages with batching
   */
  async fetchMultiplePackages(
    packages: Array<{ name: string; version?: string }>
  ): Promise<Map<string, RegistryMetadata>> {
    const results = new Map<string, RegistryMetadata>();

    for (const pkg of packages) {
      const metadata = await this.fetchPackageMetadata(pkg.name, pkg.version);
      if (metadata) {
        results.set(pkg.name, metadata);
      }
    }

    return results;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

