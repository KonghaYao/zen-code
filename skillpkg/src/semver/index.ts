import semver from 'semver';

export function parseVersion(version: string): string | null {
    return semver.valid(semver.coerce(version));
}

export function isValidVersion(version: string): boolean {
    return semver.valid(version) !== null;
}

export function satisfies(version: string, range: string): boolean {
    return semver.satisfies(version, range);
}

export function maxSatisfying(versions: string[], range: string): string | null {
    return semver.maxSatisfying(versions, range);
}

export function compareVersions(a: string, b: string): number {
    return semver.compare(a, b);
}

export function isGreaterThan(a: string, b: string): boolean {
    return semver.gt(a, b);
}

/**
 * Resolve a version specifier against a list of available versions.
 * Supports tags like 'latest', semver ranges like '^1.0.0', or exact versions.
 */
export function resolveVersion(spec: string, versions: string[], tags: Record<string, string>): string | null {
    // Check if it's a tag
    if (tags[spec]) {
        return tags[spec];
    }

    // Try exact match
    if (semver.valid(spec) && versions.includes(spec)) {
        return spec;
    }

    // Try range match
    return semver.maxSatisfying(versions, spec);
}

export { semver };
