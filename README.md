# npm-warden

A CLI tool to audit npm dependencies for maintenance and security risks. `npm-warden` analyzes your project's dependency tree and flags packages that may pose risks due to staleness, low usage, or security vulnerabilities.

## Features

- 🔍 **Comprehensive Dependency Analysis**: Parses `package.json` and lock files to build a complete dependency tree
- 📊 **Registry Metadata**: Fetches package metadata from npm registry including publish dates, download stats, and more
- ⚠️ **Risk Detection**: Flags dependencies based on:
  - **Stale packages**: Packages not updated in a specified time period
  - **Low usage**: Packages with low weekly download counts
  - **Security vulnerabilities**: Known security issues detected via `npm audit`
- 📝 **Flexible Reporting**: Human-readable terminal output or JSON format for CI integration
- ⚙️ **Configurable**: Customize thresholds and options via command-line flags

## Installation

```bash
npm install -g npm-warden
```

Or use it directly with `npx`:

```bash
npx npm-warden
```

## Usage

### Basic Usage

Run from your project root directory:

```bash
npm-warden
```

This will:
1. Parse your `package.json` and `package-lock.json` (or `yarn.lock`)
2. Fetch metadata from npm registry for all dependencies
3. Audit packages for risks
4. Display a human-readable report

### Command-Line Options

```bash
npm-warden [options]

Options:
  --stale-months <number>    Months since last publish to flag as stale (default: 12)
  --min-downloads <number>   Minimum weekly downloads threshold (default: 1000)
  --skip-dev                 Exclude devDependencies from audit
  --output <format>          Output format: text or json (default: text)
  --fail-on-risk             Exit with non-zero code if risks are found
  -h, --help                 Display help for command
  -V, --version              Display version number
```

### Examples

**Audit with custom thresholds:**

```bash
npm-warden --stale-months 6 --min-downloads 5000
```

**Skip dev dependencies:**

```bash
npm-warden --skip-dev
```

**JSON output for CI:**

```bash
npm-warden --output json --fail-on-risk
```

**Combine options:**

```bash
npm-warden --stale-months 18 --min-downloads 2000 --skip-dev --output json
```

## Output Formats

### Text Output (Default)

The text output provides a color-coded, human-readable report grouped by risk type:

```
⚠️  Dependency Risk Report
============================================================

🔴 SECURITY VULNERABILITIES
------------------------------------------------------------
vulnerable-package@1.0.0 (direct)
  Risk: SECURITY - HIGH severity
  Reason: Security vulnerability: Critical XSS vulnerability
  Last published: 2 months ago
  Weekly downloads: 15,000

🟡 STALE PACKAGES
------------------------------------------------------------
old-package@2.1.0 (direct)
  Risk: STALE - MEDIUM severity
  Reason: Last published 15.2 months ago (threshold: 12 months)
  Last published: 15 months ago
  Weekly downloads: 3,500

Summary
------------------------------------------------------------
Total packages audited: 150
Packages with risks: 3
  - Security: 1
  - Stale: 1
  - Low usage: 1
```

### JSON Output

JSON output is designed for CI/CD integration and programmatic processing:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "summary": {
    "total": 150,
    "flagged": 3,
    "byType": {
      "security": 1,
      "stale": 1,
      "low-usage": 1
    }
  },
  "packages": [
    {
      "name": "vulnerable-package",
      "version": "1.0.0",
      "isDirect": true,
      "isDev": false,
      "metadata": {
        "lastPublished": "2023-11-15T00:00:00.000Z",
        "weeklyDownloads": 15000
      },
      "risks": [
        {
          "type": "security",
          "severity": "high",
          "reason": "Security vulnerability: Critical XSS vulnerability"
        }
      ]
    }
  ]
}
```

## CI Integration

### GitHub Actions

You can use `npm-warden` in your GitHub Actions workflow:

```yaml
name: Dependency Audit

on:
  pull_request:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx npm-warden --output json --fail-on-risk
```

See [`.github/workflows/audit.yml`](.github/workflows/audit.yml) for a complete example.

### Exit Codes

- `0`: Success, no risks found (or `--fail-on-risk` not used)
- `1`: Error occurred or risks found (when `--fail-on-risk` is used)

## How It Works

1. **Dependency Parsing**: Reads `package.json` and lock files to build a complete dependency tree including transitive dependencies.

2. **Registry Metadata Fetching**: For each package, fetches metadata from the npm registry API:
   - Last published date
   - Weekly download statistics
   - Package description

3. **Risk Assessment**: Applies heuristics to flag packages:
   - **Stale**: Last published date exceeds the threshold
   - **Low Usage**: Weekly downloads below the threshold
   - **Security**: Vulnerabilities detected via `npm audit`

4. **Reporting**: Generates formatted output based on the selected format.

## Configuration

### Thresholds

- **Stale Months**: Default is 12 months. Packages not updated within this period are flagged.
- **Min Downloads**: Default is 1000 weekly downloads. Packages below this threshold are flagged as low usage.

### Rate Limiting

The tool includes built-in rate limiting when fetching from the npm registry API to avoid overwhelming the service. There's a 100ms delay between requests.

## Limitations

- **yarn.lock**: Full parsing of `yarn.lock` is not yet implemented. The tool will use `package.json` only if `yarn.lock` is detected.
- **Security Vulnerabilities**: Relies on `npm audit` which requires npm to be installed and a valid `package-lock.json`.
- **Download Stats**: Download statistics may not be available for all packages, especially very new or very old packages.

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Project Structure

```
npm-warden/
├── src/
│   ├── cli.ts          # CLI entry point
│   ├── parser.ts       # Dependency tree parsing
│   ├── registry.ts     # npm registry API client
│   ├── auditor.ts      # Risk assessment logic
│   ├── reporter.ts     # Report generation
│   └── types.ts        # TypeScript type definitions
├── tests/              # Unit tests
└── dist/               # Compiled output
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- Built with TypeScript and Node.js
- Uses the npm registry API for package metadata
- Integrates with `npm audit` for security vulnerability detection

