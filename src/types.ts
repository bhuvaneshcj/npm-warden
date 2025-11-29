export interface PackageInfo {
  name: string;
  version: string;
  isDirect: boolean;
  isDev: boolean;
}

export interface RegistryMetadata {
  name: string;
  version: string;
  lastPublished?: Date;
  weeklyDownloads?: number;
  dependents?: number;
  description?: string;
}

export interface RiskFlag {
  type: 'stale' | 'low-usage' | 'security';
  severity: 'low' | 'medium' | 'high';
  reason: string;
  metadata?: {
    lastPublished?: Date;
    weeklyDownloads?: number;
    dependents?: number;
    vulnerability?: {
      id: string;
      title: string;
      severity: string;
    };
  };
}

export interface AuditResult {
  package: PackageInfo;
  registryMetadata?: RegistryMetadata;
  risks: RiskFlag[];
}

export interface AuditConfig {
  staleMonths: number;
  minDownloads: number;
  skipDev: boolean;
  outputFormat: 'text' | 'json';
  failOnRisk: boolean;
}

export interface PackageLockDependency {
  version: string;
  resolved?: string;
  integrity?: string;
  dependencies?: Record<string, PackageLockDependency>;
  dev?: boolean;
}

export interface PackageLock {
  name: string;
  version: string;
  lockfileVersion: number;
  dependencies?: Record<string, PackageLockDependency>;
}

export interface NpmRegistryResponse {
  name: string;
  'dist-tags': {
    latest: string;
  };
  time: {
    created: string;
    modified: string;
    [version: string]: string;
  };
  versions: {
    [version: string]: {
      name: string;
      version: string;
      dist: {
        tarball: string;
      };
    };
  };
  downloads?: {
    week: number;
  };
  dependents?: number;
  description?: string;
}

export interface NpmAuditResult {
  vulnerabilities: {
    [packageName: string]: {
      name: string;
      severity: string;
      via: Array<{
        source: number;
        name: string;
        dependency: string;
        title: string;
        url: string;
        severity: string;
      }>;
    };
  };
  metadata: {
    vulnerabilities: {
      info: number;
      low: number;
      moderate: number;
      high: number;
      critical: number;
    };
  };
}

