#!/usr/bin/env node
import express from 'express';
import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';
import { FrameworkProfile, parseByFramework, resolveFrameworkProfile } from './framework';
import { extractFlows, FlowMap } from './visitor';

const app = express();
const workspaceRoot = process.cwd();

interface FlowConfig {
    include: string[];
    port: number;
    framework?: FrameworkProfile;
}

const defaultConfig: FlowConfig = {
    include: ['src', 'app', 'tests'],
    port: 3434,
    framework: 'auto'
};

function loadConfig(): FlowConfig {
    const configPath = path.join(workspaceRoot, 'flow.config.js');
    if (fs.existsSync(configPath)) {
        try {
            // Since it's a .js file and we're in a Node environment (ts-node)
            // we can try requiring it.
            // Using absolute path for require
            const userConfig = require(configPath);
            const merged = { ...defaultConfig, ...userConfig };
            // If include is empty array, it should fallback to defaults
            if (!merged.include || merged.include.length === 0) {
                merged.include = defaultConfig.include;
            }
            return merged;
        } catch (e) {
            console.error('Failed to load flow.config.js, using defaults', e);
        }
    }
    return defaultConfig;
}

const config = loadConfig();
const finalPort = config.port || process.env.PORT || 3434;
const MAX_PORT_RETRIES = 10;
const parserProfile = resolveFrameworkProfile({
    workspaceRoot,
    configuredFramework: config.framework
});
console.log(`[FlowTrack] Parser profile: ${parserProfile}`);

let allFlows: FlowMap = { flows: {}, helpers: {}, tests: {} };
let lastUpdate = Date.now();

function isFlowSourceFile(filePath: string): boolean {
    return filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.jsx');
}

function looksLikeExtensionlessFlowSource(filePath: string): boolean {
    if (path.extname(filePath)) {
        return false;
    }

    try {
        const text = fs.readFileSync(filePath, 'utf8');
        return text.includes('@Flow(') || text.includes('@FlowHelper(');
    } catch {
        return false;
    }
}

async function scanWorkspace() {
    console.log('Scanning workspace for flows...');
    const flows: FlowMap = { flows: {}, helpers: {}, tests: {} };
    const files: string[] = [];

    config.include.forEach(dir => {
        const fullPath = path.isAbsolute(dir) ? dir : path.join(workspaceRoot, dir);
        console.log(`[FlowTrack] Checking flow include path: ${fullPath}`);
        if (fs.existsSync(fullPath)) {
            if (fs.statSync(fullPath).isDirectory()) {
                files.push(...getAllFiles(fullPath));
            } else {
                files.push(fullPath);
            }
        } else {
            console.warn(`[FlowTrack] Include path does not exist, skipping: ${fullPath}`);
        }
    });

    console.log(`[FlowTrack] Candidate files discovered: ${files.length}`);
    
    for (const file of files) {
        if (isFlowSourceFile(file) || looksLikeExtensionlessFlowSource(file)) {
            try {
                const text = fs.readFileSync(file, 'utf8');
                const { cst } = parseByFramework(text, parserProfile);
                if (cst) {
                    const relativePath = path.relative(workspaceRoot, file);
                    const fileFlows = extractFlows(cst, relativePath);
                    for (const title in fileFlows.flows) {
                        if (!flows.flows[title]) {
                            flows.flows[title] = [];
                        }
                        flows.flows[title].push(...fileFlows.flows[title]);
                    }
                    for (const name in fileFlows.helpers) {
                        flows.helpers[name] = fileFlows.helpers[name];
                    }
                    if (fileFlows.tests) {
                        if (!flows.tests) {
                            flows.tests = {};
                        }
                        for (const flowName in fileFlows.tests) {
                            if (!flows.tests[flowName]) {
                                flows.tests[flowName] = [];
                            }
                            flows.tests[flowName].push(...fileFlows.tests[flowName]);
                        }
                    }
                }
            } catch (e) {
                console.error(`Failed to parse ${file}`, e);
            }
        }
    }

    // Assign missing steps
    for (const title in flows.flows) {
        const steps = flows.flows[title];
        let nextStep = 1;
        steps.forEach(s => {
            if (s.step !== undefined && s.step >= nextStep) {
                nextStep = s.step + 1;
            }
        });
        steps.forEach(s => {
            if (s.step === undefined) {
                s.step = nextStep++;
            }
        });
    }

    allFlows = flows;
    lastUpdate = Date.now();
    const testsCount = Object.values(allFlows.tests || {}).reduce((sum, tests) => sum + tests.length, 0);
    console.log(`Scan complete. Found ${Object.keys(allFlows.flows).length} flows, ${Object.keys(allFlows.helpers).length} helpers and ${testsCount} tests.`);
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
                arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
            }
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

// Watch for changes
const watchPaths = config.include.map(dir => path.isAbsolute(dir) ? dir : path.join(workspaceRoot, dir));
watchPaths.forEach(watchPath => {
    console.log(`[FlowTrack] Watching include path: ${watchPath}`);
});
    chokidar.watch(watchPaths, {
        ignored: [/(^|[\/\\])\../, '**/node_modules/**', '**/dist/**'],
        persistent: true,
        ignoreInitial: true
    }).on('all', (event, p) => {
        if (isFlowSourceFile(p) || looksLikeExtensionlessFlowSource(p)) {
            console.log(`File ${p} has been ${event}`);
            scanWorkspace();
        }
    });

app.get('/api/flows', (req: any, res: any) => {
    res.json({
        flows: allFlows,
        lastUpdate: lastUpdate
    });
});

app.get('/styles.css', (req: any, res: any) => {
    res.sendFile(path.join(__dirname, 'html', 'styles.css'));
});

app.get('/client.js', (req: any, res: any) => {
    res.sendFile(path.join(__dirname, 'html', 'client.js'));
});

app.get('/', (req: any, res: any) => {
    res.sendFile(path.join(__dirname, 'html', 'index.html'));
});

function startServerWithPortRetry(startPort: number, maxRetries: number): Promise<number> {
    return new Promise((resolve, reject) => {
        let retries = 0;

        const tryStart = (port: number) => {
            const server = app.listen(port, () => {
                console.log(`FlowTrack server running at http://localhost:${port}`);
                resolve(port);
            });

            server.on('error', (error: any) => {
                if (error?.code === 'EADDRINUSE') {
                    const nextPort = port + 1;
                    if (retries < maxRetries) {
                        retries += 1;
                        console.warn(`[FlowTrack] Port ${port} is busy. Trying port ${nextPort}... (${retries}/${maxRetries})`);
                        tryStart(nextPort);
                        return;
                    }

                    console.error(`[FlowTrack] Port ${port} is busy and no more ports are available in retry range.`);
                    console.error(`[FlowTrack] Failed to start server. Tried ports ${startPort}-${startPort + maxRetries}.`);
                    reject(new Error(`Could not start FlowTrack server: all ports from ${startPort} to ${startPort + maxRetries} are busy.`));
                    return;
                }

                reject(error);
            });
        };

        tryStart(startPort);
    });
}

scanWorkspace().then(() => {
    startServerWithPortRetry(Number(finalPort), MAX_PORT_RETRIES).catch((error) => {
        console.error('[FlowTrack] Server startup failed.', error);
        process.exit(1);
    });
});
