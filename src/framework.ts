import * as fs from 'fs';
import * as path from 'path';
import { parse } from './parser';

export type FrameworkProfile = 'auto' | 'typescript' | 'angular' | 'react';
export type ResolvedFrameworkProfile = Exclude<FrameworkProfile, 'auto'>;

export interface FrameworkSelectionOptions {
    workspaceRoot: string;
    configuredFramework?: FrameworkProfile;
}

export function resolveFrameworkProfile(options: FrameworkSelectionOptions): ResolvedFrameworkProfile {
    if (options.configuredFramework && options.configuredFramework !== 'auto') {
        return options.configuredFramework;
    }

    const angularJsonPath = path.join(options.workspaceRoot, 'angular.json');
    if (fs.existsSync(angularJsonPath)) {
        return 'angular';
    }

    const packageJsonPath = path.join(options.workspaceRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        try {
            const packageText = fs.readFileSync(packageJsonPath, 'utf8');
            const packageJson = JSON.parse(packageText);
            const deps = {
                ...(packageJson.dependencies || {}),
                ...(packageJson.devDependencies || {}),
                ...(packageJson.peerDependencies || {})
            };

            if (deps['@angular/core']) {
                return 'angular';
            }

            if (deps.react || deps['react-dom']) {
                return 'react';
            }
        } catch {
            // Fall back to typescript profile.
        }
    }

    return 'typescript';
}

export function parseByFramework(text: string, _profile: ResolvedFrameworkProfile) {
    // Current parser is shared baseline; profile hook is intentionally centralized
    // so we can progressively specialize framework behavior without breaking API.
    return parse(text);
}