import * as vscode from 'vscode';
import { parseByFramework, resolveFrameworkProfile } from './framework';
import { extractFlows, FlowMap } from './visitor';

export function activate(context: vscode.ExtensionContext) {
    console.log('FlowTrack extension is now active!');
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const parserProfile = workspaceRoot
        ? resolveFrameworkProfile({ workspaceRoot, configuredFramework: 'auto' })
        : 'typescript';
    console.log(`[FlowTrack] Parser profile: ${parserProfile}`);

    let disposable = vscode.commands.registerCommand('flowtrack.visualize', async (uri: vscode.Uri) => {
        let targetUri: vscode.Uri | undefined = uri;
        
        // If triggered from command palette, uri might be undefined, use active editor
        if (!targetUri) {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                targetUri = editor.document.uri;
            }
        }

        if (targetUri) {
            let allFlows: FlowMap = { flows: {}, helpers: {} };

            // Find all files in workspace to aggregate all flows
            const files = await vscode.workspace.findFiles('**/*.{ts,tsx,js,jsx}');
            for (const file of files) {
                try {
                    const doc = await vscode.workspace.openTextDocument(file);
                    const text = doc.getText();
                    const { cst } = parseByFramework(text, parserProfile);
                    if (cst) {
                        const fileFlows = extractFlows(cst, file.toString());
                        // Merge flows
                        for (const title in fileFlows.flows) {
                            if (!allFlows.flows[title]) {
                                allFlows.flows[title] = [];
                            }
                            allFlows.flows[title].push(...fileFlows.flows[title]);
                        }
                        // Merge helpers
                        for (const name in fileFlows.helpers) {
                            allFlows.helpers[name] = fileFlows.helpers[name];
                        }
                    }
                } catch (e) {
                    console.error(`Failed to parse ${file.toString()}`, e);
                }
            }

            // Assign missing steps
            for (const title in allFlows.flows) {
                const steps = allFlows.flows[title];
                let nextStep = 1;
                
                // First pass: find the highest defined step number
                steps.forEach(s => {
                    if (s.step !== undefined && s.step >= nextStep) {
                        nextStep = s.step + 1;
                    }
                });

                // Second pass: assign step numbers to those who don't have it
                steps.forEach(s => {
                    if (s.step === undefined) {
                        s.step = nextStep++;
                    }
                });
            }

            // Filter flows: 
            // If targetUri is a file, show flows that have steps in its directory.
            // If targetUri is a directory, show flows that have steps in that directory.
            const stats = await vscode.workspace.fs.stat(targetUri);
            const isDirectory = stats.type === vscode.FileType.Directory;
            const targetFolder = isDirectory ? targetUri.toString() : targetUri.toString().substring(0, targetUri.toString().lastIndexOf('/'));
            
            const filteredFlows: FlowMap = { flows: {}, helpers: allFlows.helpers };
            for (const title in allFlows.flows) {
                const hasStepInFolder = allFlows.flows[title].some(s => s.uri && s.uri.startsWith(targetFolder));
                if (hasStepInFolder) {
                    filteredFlows.flows[title] = allFlows.flows[title];
                }
            }

            if (Object.keys(filteredFlows.flows).length === 0) {
                vscode.window.showInformationMessage('No @Flow decorators found in this location.');
                return;
            }
            FlowPanel.createOrShow(context.extensionUri, filteredFlows);
        }
    });

    context.subscriptions.push(disposable);
}

class FlowPanel {
    public static currentPanel: FlowPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    private _flows: FlowMap;
    private _selectedFlowTitle: string | null = null;

    public static createOrShow(extensionUri: vscode.Uri, flows: FlowMap) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        if (FlowPanel.currentPanel) {
            FlowPanel.currentPanel._panel.reveal(column);
            FlowPanel.currentPanel._flows = flows;
            FlowPanel.currentPanel._selectedFlowTitle = null;
            FlowPanel.currentPanel._update();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'flowTrack',
            'FlowTrack Visualization',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );

        FlowPanel.currentPanel = new FlowPanel(panel, extensionUri, flows);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, flows: FlowMap) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._flows = flows;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'goToSource':
                        const line = message.line;
                        const uri = vscode.Uri.parse(message.uri);
                        const doc = await vscode.workspace.openTextDocument(uri);
                        const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
                        const position = new vscode.Position(line - 1, 0);
                        editor.selection = new vscode.Selection(position, position);
                        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
                        return;
                    case 'zoomIn':
                        this._selectedFlowTitle = message.title;
                        this._update();
                        return;
                    case 'showAll':
                        this._selectedFlowTitle = null;
                        this._update();
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        FlowPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        this._panel.webview.html = this._getHtmlForWebview();
    }

    private _getHtmlForWebview() {
        const flowsToShow = (this._selectedFlowTitle && this._flows.flows[this._selectedFlowTitle])
            ? { [this._selectedFlowTitle]: this._flows.flows[this._selectedFlowTitle] } 
            : this._flows.flows;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FlowTrack</title>
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
        const vscode = acquireVsCodeApi();
        mermaid.initialize({ 
            startOnLoad: true,
            securityLevel: 'loose',
            flowchart: { useMaxWidth: false, htmlLabels: true }
        });
        window.goToSource = (line, uri) => {
            vscode.postMessage({
                command: 'goToSource',
                line: line,
                uri: uri
            });
        };
        window.zoomIn = (title) => {
            vscode.postMessage({
                command: 'zoomIn',
                title: title
            });
        };
        window.showAll = () => {
            vscode.postMessage({
                command: 'showAll'
            });
        };
    </script>
    <style>
        body { font-family: sans-serif; padding: 20px; }
        .flow-container { margin-bottom: 40px; border-bottom: 1px solid #ccc; padding-bottom: 20px; position: relative; }
        .header { display: flex; justify-content: space-between; align-items: center; }
        h2 { color: #007acc; margin: 10px 0; }
        .file-info { font-size: 0.8em; color: #666; display: block; }
        .btn { 
            background: #007acc; color: white; border: none; padding: 5px 10px; 
            cursor: pointer; border-radius: 3px; font-size: 0.8em;
        }
        .btn:hover { background: #005a9e; }
        .back-link { margin-bottom: 20px; display: block; color: #007acc; cursor: pointer; text-decoration: underline; }
        .zoom-controls { display: flex; align-items: center; gap: 10px; font-size: 0.9em; }
        .mermaid { transform-origin: top center; transition: transform 0.2s; }
        .mermaid svg { max-width: none !important; width: 100% !important; height: auto !important; }
        .floating-controls {
            position: absolute;
            top: 60px;
            right: 10px;
            background: rgba(255, 255, 255, 0.9);
            padding: 8px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 10;
            display: flex;
            flex-direction: column;
            gap: 5px;
            border: 1px solid #ddd;
        }
        .flow-layout { display: flex; gap: 20px; }
        .flow-sidebar { width: 300px; flex-shrink: 0; border-right: 1px solid #eee; padding-right: 20px; }
        .flow-diagram-wrapper { flex-grow: 1; position: relative; overflow: auto; border: 1px solid #eee; padding: 20px; min-height: 400px; }
        section { margin-bottom: 20px; }
        h3 { color: #555; font-size: 1.1em; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 0; }
        ul { padding-left: 20px; margin: 5px 0; }
        .file-info { font-size: 0.8em; color: #666; }
        .step-description { font-size: 0.85em; background: #f9f9f9; padding: 5px; margin-top: 5px; border-radius: 3px; }
        .step-description p { margin: 5px 0; }
        .helper-list a { color: #007acc; text-decoration: none; }
        .helper-list a:hover { text-decoration: underline; }
        .highlighted-node rect, .highlighted-node polygon, .highlighted-node circle, .highlighted-node path, .highlighted-node ellipse {
            stroke: #007acc !important;
            stroke-width: 4px !important;
            filter: drop-shadow(0 0 5px rgba(0, 122, 204, 0.5));
            fill: #e6f3ff !important;
        }
        .legend { 
            margin-top: 20px; 
            padding-top: 15px; 
            border-top: 1px solid #eee; 
            font-size: 0.85em;
            display: flex;
            gap: 20px;
        }
        .legend-item { display: flex; align-items: center; }
        .legend-box { width: 15px; height: 15px; margin-right: 8px; border: 1px solid #333; }
        .flow-step { background-color: white; border-radius: 2px; }
        .helper-step { background-color: #f9f; border-radius: 50%; }
    </style>
</head>
<body>
    <h1>FlowTrack Visualization</h1>
    ${this._selectedFlowTitle ? '<a class="back-link" onclick="showAll()">← Back to all flows</a>' : ''}
    <script>
        function updateZoom(id, value) {
            const el = document.getElementById(id);
            if (el) {
                el.style.transform = \`scale(\${value})\`;
            }
        }
        function resetZoom(id) {
            const slider = document.querySelector('input[oninput*="' + id + '"]');
            if (slider) {
                slider.value = 1;
                updateZoom(id, 1);
            }
        }
        function highlightNode(flowId, nodeId, highlight) {
            const svgEl = document.querySelector('#' + flowId + ' svg');
            if (!svgEl) return;
            const nodes = svgEl.querySelectorAll('.node');
            nodes.forEach(node => {
                const id = node.id || node.getAttribute('id') || '';
                if (id === nodeId || id.includes(nodeId)) {
                    if (highlight) {
                        node.classList.add('highlighted-node');
                    } else {
                        node.classList.remove('highlighted-node');
                    }
                }
            });
        }
    </script>
    ${Object.entries(flowsToShow).map(([title, steps]) => {
        // Sort steps by step number
        const sortedSteps = [...steps].sort((a, b) => (a.step || 0) - (b.step || 0));
        
        let mermaidCode = 'graph TD\n';
        
        // Group steps by step number to handle branching
        const stepsByNumber: { [key: number]: any[] } = {};
        const fileList = new Set<string>();
        const helperList = new Set<string>();

        sortedSteps.forEach(s => {
            const num = s.step || 0;
            if (!stepsByNumber[num]) stepsByNumber[num] = [];
            stepsByNumber[num].push(s);
            if (s.uri) {
                const parts = s.uri.split('/');
                fileList.add(parts[parts.length - 1]);
            }
            if (s.helpers) {
                s.helpers.forEach(h => helperList.add(h));
            }
        });

        const stepNumbers = Object.keys(stepsByNumber).map(Number).sort((a, b) => a - b);

        // Define nodes and their helpers
        sortedSteps.forEach((step, index) => {
            const nodeName = step.name || step.functionName;
            const fileName = step.uri ? step.uri.split('/').pop() : 'unknown';
            const label = `${step.step || ''} ${nodeName}`.trim();
            const fileIndicator = `<br/><small>[${fileName}]</small>`;
            const escapedLabel = `${label}${fileIndicator}`.replace(/"/g, '&quot;');
            const safeId = step.functionName.replace(/[^a-zA-Z0-9_]/g, '_');
            const nodeId = `Node_${safeId}_${index}`;
            
            mermaidCode += `  ${nodeId}["${escapedLabel}"]\n`;
            if (step.line && step.uri) {
                mermaidCode += `  click ${nodeId} call goToSource(${step.line}, "${step.uri}")\n`;
            }

            // Add helpers for this step
            if (step.helpers && step.helpers.length > 0) {
                step.helpers.forEach((helper, hIdx) => {
                    const helperSafeId = helper.replace(/[^a-zA-Z0-9_]/g, '_');
                    const helperNodeId = `Helper_${helperSafeId}_${index}_${hIdx}`;
                    mermaidCode += `  ${helperNodeId}(["${helper.replace(/"/g, '&quot;')}"])\n`;
                    mermaidCode += `  ${nodeId} -.-> ${helperNodeId}\n`;
                    mermaidCode += `  style ${helperNodeId} fill:#f9f,stroke:#333,stroke-width:2px\n`;
                });
            }
        });

        // Define edges between consecutive steps
        for (let i = 0; i < stepNumbers.length - 1; i++) {
            const currentSteps = stepsByNumber[stepNumbers[i]];
            const nextSteps = stepsByNumber[stepNumbers[i + 1]];
            
            if (currentSteps && nextSteps) {
                currentSteps.forEach((curr, currIdx) => {
                    // Find global index of curr in sortedSteps
                    const globalCurrIdx = sortedSteps.indexOf(curr);
                    nextSteps.forEach((next, nextIdx) => {
                        const globalNextIdx = sortedSteps.indexOf(next);
                        const safeCurrId = curr.functionName.replace(/[^a-zA-Z0-9_]/g, '_');
                        const safeNextId = next.functionName.replace(/[^a-zA-Z0-9_]/g, '_');
                        mermaidCode += `  Node_${safeCurrId}_${globalCurrIdx} --> Node_${safeNextId}_${globalNextIdx}\n`;
                    });
                });
            }
        }

        const stepsList = sortedSteps.map((s, idx) => {
            const safeNodeIdPart = s.functionName.replace(/[^a-zA-Z0-9_]/g, '_');
            const nodeId = `Node_${safeNodeIdPart}_${idx}`;
            
            // Generate highlight handlers for all helpers in this step
            const helperNodeIds = (s.helpers || []).map((h, hIdx) => `Helper_${h.replace(/[^a-zA-Z0-9_]/g, '_')}_${idx}_${hIdx}`);
            const allNodeIds = [nodeId, ...helperNodeIds];
            const highlightCall = `[${allNodeIds.map(nid => `'${nid}'`).join(',')}].forEach(nid => highlightNode('mermaid-${title}', nid, true))`;
            const unhighlightCall = `[${allNodeIds.map(nid => `'${nid}'`).join(',')}].forEach(nid => highlightNode('mermaid-${title}', nid, false))`;

            const escapedDesc = s.description ? s.description.replace(/'/g, "&apos;").replace(/"/g, "&quot;") : '';
            const stepHelpers = s.helpers && s.helpers.length > 0 ? `<br/><small>Helpers: ${s.helpers.join(', ')}</small>` : '';
            return `
                <li onmouseover="${highlightCall}" onmouseout="${unhighlightCall}">
                    <strong>Step ${s.step}:</strong> ${s.name || s.functionName}${stepHelpers}
                    ${s.description ? `
                    <details class="step-description">
                        <summary>Description</summary>
                        <p>${escapedDesc}</p>
                    </details>` : ''}
                </li>`;
        }).join('');
        const filesListHtml = Array.from(fileList).map(f => `<li>${f}</li>`).join('');
        const helpersListHtml = Array.from(helperList).map(h => {
            // Generate highlight handlers for this helper across all steps
            const helperNodeIds: string[] = [];
            sortedSteps.forEach((s, idx) => {
                if (s.helpers && s.helpers.includes(h)) {
                    const hIdx = s.helpers.indexOf(h);
                    helperNodeIds.push(`Helper_${h.replace(/[^a-zA-Z0-9_]/g, '_')}_${idx}_${hIdx}`);
                }
            });
            const highlightCall = `[${helperNodeIds.map(nid => `'${nid}'`).join(',')}].forEach(nid => highlightNode('mermaid-${title}', nid, true))`;
            const unhighlightCall = `[${helperNodeIds.map(nid => `'${nid}'`).join(',')}].forEach(nid => highlightNode('mermaid-${title}', nid, false))`;

            return `<li onmouseover="${highlightCall}" onmouseout="${unhighlightCall}">
                <a href="#" style="color: var(--vscode-textLink-foreground); text-decoration: none;">${h}</a>
            </li>`;
        }).join('');

        const legendHtml = `
            <div class="legend">
                <div class="legend-item">
                    <div class="legend-box flow-step"></div>
                    <span>Flow Step</span>
                </div>
                <div class="legend-item">
                    <div class="legend-box helper-step"></div>
                    <span>Helper</span>
                </div>
            </div>
        `;

        return `
            <div class="flow-container">
                <div class="header">
                    <h2>Flow: ${title}</h2>
                    ${!this._selectedFlowTitle ? `<button class="btn" onclick="zoomIn('${title}')">View</button>` : ''}
                </div>
                <div class="flow-layout">
                    <div class="flow-sidebar">
                        <section>
                            <h3>Flow Information</h3>
                            <p><strong>Name:</strong> ${title}</p>
                            <p><strong>Steps:</strong></p>
                            <ul>${stepsList}</ul>
                        </section>
                        ${helperList.size > 0 ? `
                        <section>
                            <h3>Helpers</h3>
                            <ul class="helper-list">${helpersListHtml}</ul>
                        </section>` : ''}
                        <section>
                            <h3>Files</h3>
                            <ul class="file-list">${filesListHtml}</ul>
                        </section>
                    </div>
                    <div class="flow-diagram-wrapper">
                        <div class="floating-controls">
                            <div class="zoom-controls">
                                <label>Zoom:</label>
                                <input type="range" min="0.5" max="3" step="0.1" value="1" oninput="updateZoom('mermaid-${title}', this.value)">
                            </div>
                            <button class="btn" onclick="resetZoom('mermaid-${title}')">Reset</button>
                        </div>
                        <pre class="mermaid" id="mermaid-${title}">
${mermaidCode}
                        </pre>
                    </div>
                </div>
                ${legendHtml}
            </div>
        `;
    }).join('')}
</body>
</html>`;
    }
}
