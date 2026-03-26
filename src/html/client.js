import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

mermaid.initialize({ 
    startOnLoad: false,
    securityLevel: 'loose',
    flowchart: { useMaxWidth: false, htmlLabels: true }
});

window.currentView = 'all'; // 'all', 'helpers', or specific flow title
let allFlowsData = { flows: {}, helpers: {}, tests: {} };
let lastServerUpdate = 0;
const diagramTransformState = new Map();

function getDiagramState(id) {
    if (!diagramTransformState.has(id)) {
        diagramTransformState.set(id, {
            scale: 1,
            offsetX: 0,
            offsetY: 0,
            isDragging: false,
            dragStartX: 0,
            dragStartY: 0
        });
    }
    return diagramTransformState.get(id);
}

function applyDiagramTransform(id) {
    const el = document.getElementById(id);
    if (!el) return;

    const state = getDiagramState(id);
    const x = state.scale > 1 ? state.offsetX : 0;
    const y = state.scale > 1 ? state.offsetY : 0;
    el.style.transform = `translate(${x}px, ${y}px) scale(${state.scale})`;
    el.classList.toggle('pannable', state.scale > 1);
    el.classList.toggle('panning', state.scale > 1 && state.isDragging);
}

function initFloatingControlsDrag(diagramContainer, controls) {
    if (!diagramContainer || !controls || controls.dataset.draggableInitialized === 'true') {
        return;
    }

    controls.dataset.draggableInitialized = 'true';
    const handle = controls.querySelector('.drag-handle');
    if (!handle) {
        return;
    }

    const dragState = {
        active: false,
        pointerId: null,
        offsetX: 0,
        offsetY: 0
    };

    handle.addEventListener('pointerdown', (event) => {
        dragState.active = true;
        dragState.pointerId = event.pointerId;

        const controlsRect = controls.getBoundingClientRect();
        dragState.offsetX = event.clientX - controlsRect.left;
        dragState.offsetY = event.clientY - controlsRect.top;

        controls.style.right = 'auto';
        controls.style.bottom = 'auto';
        controls.classList.add('dragging');
        handle.setPointerCapture(event.pointerId);
        event.preventDefault();
    });

    handle.addEventListener('pointermove', (event) => {
        if (!dragState.active || event.pointerId !== dragState.pointerId) {
            return;
        }

        const containerRect = diagramContainer.getBoundingClientRect();
        const maxLeft = Math.max(0, containerRect.width - controls.offsetWidth);
        const maxTop = Math.max(0, containerRect.height - controls.offsetHeight);

        let nextLeft = event.clientX - containerRect.left - dragState.offsetX;
        let nextTop = event.clientY - containerRect.top - dragState.offsetY;

        nextLeft = Math.min(Math.max(0, nextLeft), maxLeft);
        nextTop = Math.min(Math.max(0, nextTop), maxTop);

        controls.style.left = `${nextLeft}px`;
        controls.style.top = `${nextTop}px`;
    });

    const stopDrag = (event) => {
        if (!dragState.active || event.pointerId !== dragState.pointerId) {
            return;
        }

        dragState.active = false;
        controls.classList.remove('dragging');
        handle.releasePointerCapture(event.pointerId);
    };

    handle.addEventListener('pointerup', stopDrag);
    handle.addEventListener('pointercancel', stopDrag);
}

function initScrollableSections(root = document) {
    const sections = root.querySelectorAll('.scrollable-section');
    sections.forEach((section) => {
        if (section.dataset.scrollableInitialized === 'true') {
            return;
        }

        const content = section.querySelector('.scrollable-section-content');
        if (!content) {
            return;
        }

        section.dataset.scrollableInitialized = 'true';

        const updateIndicators = () => {
            const maxScroll = Math.max(0, content.scrollHeight - content.clientHeight);
            const canScrollUp = content.scrollTop > 2;
            const canScrollDown = content.scrollTop < maxScroll - 2;

            section.classList.toggle('can-scroll-up', canScrollUp);
            section.classList.toggle('can-scroll-down', canScrollDown);
        };

        content.addEventListener('scroll', updateIndicators);
        window.addEventListener('resize', updateIndicators);
        requestAnimationFrame(updateIndicators);
    });
}

function attachDiagramPanHandlers(id) {
    const el = document.getElementById(id);
    if (!el || el.dataset.panAttached === 'true') return;

    el.dataset.panAttached = 'true';

    const onPointerMove = (event) => {
        const state = getDiagramState(id);
        if (!state.isDragging) return;
        state.offsetX = event.clientX - state.dragStartX;
        state.offsetY = event.clientY - state.dragStartY;
        applyDiagramTransform(id);
    };

    const stopDragging = () => {
        const state = getDiagramState(id);
        if (!state.isDragging) return;
        state.isDragging = false;
        applyDiagramTransform(id);
    };

    el.addEventListener('pointerdown', (event) => {
        const state = getDiagramState(id);
        if (state.scale <= 1) return;

        state.isDragging = true;
        state.dragStartX = event.clientX - state.offsetX;
        state.dragStartY = event.clientY - state.offsetY;

        try {
            el.setPointerCapture(event.pointerId);
        } catch (_) {}

        applyDiagramTransform(id);
        event.preventDefault();
    });

    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', stopDragging);
    el.addEventListener('pointercancel', stopDragging);
    el.addEventListener('pointerleave', stopDragging);
}

async function loadFlows() {
    try {
        const response = await fetch('/api/flows');
        const data = await response.json();
        
        if (data.lastUpdate > lastServerUpdate) {
            lastServerUpdate = data.lastUpdate;
            allFlowsData = data; // { flows, helpers, lastUpdate }
            window.renderView();
        }
    } catch (e) {
        console.error('Failed to load flows', e);
    }
}

window.renderView = function() {
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if (window.currentView === 'helpers') {
        document.getElementById('nav-helpers').classList.add('active');
        document.getElementById('right-menu').classList.remove('visible');
        renderHelpers(allFlowsData.flows.helpers, allFlowsData.flows.flows);
    } else if (window.currentView === 'tests') {
        document.getElementById('nav-tests').classList.add('active');
        document.getElementById('right-menu').classList.remove('visible');
        renderTests(allFlowsData.flows.tests, allFlowsData.flows.flows);
    } else {
        document.getElementById('nav-flows').classList.add('active');
        if (window.currentView === 'all') {
            document.getElementById('right-menu').classList.add('visible');
        } else {
            document.getElementById('right-menu').classList.remove('visible');
        }
        renderFlows(allFlowsData.flows);
    }
};

async function renderFlows(data) {
    const flows = data.flows;
    const testsByFlow = data.tests || {};
    const container = document.getElementById('flows-container');
    container.innerHTML = '';
    
    const flowsToRender = window.currentView === 'all' ? flows : { [window.currentView]: flows[window.currentView] };

    if (!flowsToRender || Object.keys(flowsToRender).length === 0 || !flowsToRender[Object.keys(flowsToRender)[0]]) {
        container.innerHTML = '<p>No flows found. Add @Flow decorators to your code.</p>';
        return;
    }

    if (window.currentView !== 'all') {
        const backBtn = document.createElement('button');
        backBtn.className = 'btn';
        backBtn.style.marginBottom = '20px';
        backBtn.innerText = '← Back to all flows';
        backBtn.onclick = () => { window.currentView = 'all'; window.renderView(); };
        container.appendChild(backBtn);
    }

    const promises = Object.entries(flowsToRender).map(async ([title, steps]) => {
        if (!Array.isArray(steps)) return;
        const flowTests = Array.isArray(testsByFlow[title]) ? testsByFlow[title] : [];
        const sortedSteps = [...steps].sort((a, b) => (a.step || 0) - (b.step || 0));
        let mermaidCode = 'graph TD\n';
        
        const stepsByNumber = {};
        const fileList = new Set();
        const helperList = new Set();
        const stepNodeIdsByName = {};
        const stepNodeIdsByNumber = {};
        const testNodeIdsByStepName = {};

        sortedSteps.forEach(s => {
            const num = s.step || 0;
            if (!stepsByNumber[num]) stepsByNumber[num] = [];
            stepsByNumber[num].push(s);
            if (s.uri) fileList.add(s.uri);
            if (s.helpers) s.helpers.forEach(h => helperList.add(h));
        });

        const stepNumbers = Object.keys(stepsByNumber).map(Number).sort((a, b) => a - b);

        // Define nodes and their helpers
        sortedSteps.forEach((step, index) => {
            const nodeName = step.name || step.functionName;
            const fileName = step.uri ? step.uri.split(/[\\\/]/).pop() : 'unknown';
            const label = `${step.step || ''} ${nodeName}`.trim();
            const fileIndicator = `<br/><small>[${fileName}]</small>`;
            const escapedLabel = `${label}${fileIndicator}`.replace(/"/g, '&quot;');
            const safeId = step.functionName.replace(/[^a-zA-Z0-9_]/g, '_');
            const nodeId = `Node_${safeId}_${index}`;
            const normalizedStepName = nodeName.trim().toLowerCase();
            const stepNumber = typeof step.step === 'number' ? step.step : parseInt(`${step.step || ''}`, 10);
            if (!stepNodeIdsByName[normalizedStepName]) {
                stepNodeIdsByName[normalizedStepName] = [];
            }
            stepNodeIdsByName[normalizedStepName].push(nodeId);
            if (!Number.isNaN(stepNumber)) {
                if (!stepNodeIdsByNumber[stepNumber]) {
                    stepNodeIdsByNumber[stepNumber] = [];
                }
                stepNodeIdsByNumber[stepNumber].push(nodeId);
            }
            
            mermaidCode += `  ${nodeId}["${escapedLabel}"]\n`;
            
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

        for (let i = 0; i < stepNumbers.length - 1; i++) {
            const currentSteps = stepsByNumber[stepNumbers[i]];
            const nextSteps = stepsByNumber[stepNumbers[i + 1]];
            
            if (currentSteps && nextSteps) {
                currentSteps.forEach((curr) => {
                    const globalCurrIdx = sortedSteps.indexOf(curr);
                    nextSteps.forEach((next) => {
                        const globalNextIdx = sortedSteps.indexOf(next);
                        const safeCurrId = curr.functionName.replace(/[^a-zA-Z0-9_]/g, '_');
                        const safeNextId = next.functionName.replace(/[^a-zA-Z0-9_]/g, '_');
                        mermaidCode += `  Node_${safeCurrId}_${globalCurrIdx} --> Node_${safeNextId}_${globalNextIdx}\n`;
                    });
                });
            }
        }

        flowTests.forEach((test, testIdx) => {
            const normalizedTestName = (test.name || '').trim().toLowerCase();
            const normalizedTestStepName = typeof test.step === 'string' ? test.step.trim().toLowerCase() : '';
            const testStepNumber = typeof test.step === 'number' ? test.step : parseInt(`${test.step || ''}`, 10);
            const safeTestIdBase = (test.functionName || `${title}_test_${testIdx}`).replace(/[^a-zA-Z0-9_]/g, '_');
            const testNodeId = `Test_${safeTestIdBase}_${testIdx}`;
            const testTypeLabel = test.testType ? `[${test.testType}] ` : '';
            const testFrameworkLabel = test.framework ? ` (${test.framework})` : '';
            const testLabel = `${testTypeLabel}${test.name || 'Flow Test'}${testFrameworkLabel}`.replace(/"/g, '&quot;');

            mermaidCode += `  ${testNodeId}(["🧪 ${testLabel}"])\n`;
            mermaidCode += `  style ${testNodeId} fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px\n`;

            const matchedStepNodeIds = !Number.isNaN(testStepNumber)
                ? (stepNodeIdsByNumber[testStepNumber] || [])
                : (normalizedTestStepName ? (stepNodeIdsByName[normalizedTestStepName] || []) : []);
            if (matchedStepNodeIds.length > 0) {
                matchedStepNodeIds.forEach((stepNodeId) => {
                    mermaidCode += `  ${stepNodeId} -. verifies .-> ${testNodeId}\n`;
                });
                const relationKey = normalizedTestStepName || normalizedTestName;
                testNodeIdsByStepName[relationKey] = [
                    ...(testNodeIdsByStepName[relationKey] || []),
                    testNodeId
                ];
            }
        });

        const flowDiv = document.createElement('div');
        flowDiv.className = 'flow-container';
        const flowIdBase = 'flow-' + title.replace(/[^a-zA-Z0-9]/g, '-');
        const id = flowIdBase;
        
        const safeTitle = title.replace(/'/g, "\\'").replace(/"/g, "&quot;");
        const stepsList = sortedSteps.map((s, idx) => {
            const stepId = `step-${id}-${idx}`;
            const safeNodeIdPart = s.functionName.replace(/[^a-zA-Z0-9_]/g, '_');
            const nodeId = `Node_${safeNodeIdPart}_${idx}`;
            const escapedDesc = s.description ? s.description.replace(/'/g, "&apos;").replace(/"/g, "&quot;") : '';
            
            // Generate highlight handlers for all helpers in this step
            const helperNodeIds = (s.helpers || []).map((h, hIdx) => `Helper_${h.replace(/[^a-zA-Z0-9_]/g, '_')}_${idx}_${hIdx}`);
            const normalizedStepName = (s.name || s.functionName).trim().toLowerCase();
            const testNodeIds = testNodeIdsByStepName[normalizedStepName] || [];
            const allNodeIds = [nodeId, ...helperNodeIds, ...testNodeIds];
            const highlightCall = `[${allNodeIds.map(nid => `'${nid}'`).join(',')}].forEach(nid => highlightNode('${id}', nid, true))`;
            const unhighlightCall = `[${allNodeIds.map(nid => `'${nid}'`).join(',')}].forEach(nid => highlightNode('${id}', nid, false))`;

            const stepHelpers = s.helpers && s.helpers.length > 0 ? `<br/><small>Helpers: ${s.helpers.join(', ')}</small>` : '';
            return `
                <li id="${stepId}" 
                    onmouseover="${highlightCall}" 
                    onmouseout="${unhighlightCall}">
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
            const safeH = h.replace(/'/g, "\\'").replace(/"/g, "&quot;");
            
            // Generate highlight handlers for this helper across all steps
            const helperNodeIds = [];
            sortedSteps.forEach((s, idx) => {
                if (s.helpers && s.helpers.includes(h)) {
                    const hIdx = s.helpers.indexOf(h);
                    helperNodeIds.push(`Helper_${h.replace(/[^a-zA-Z0-9_]/g, '_')}_${idx}_${hIdx}`);
                }
            });
            const highlightCall = `[${helperNodeIds.map(nid => `'${nid}'`).join(',')}].forEach(nid => highlightNode('${id}', nid, true))`;
            const unhighlightCall = `[${helperNodeIds.map(nid => `'${nid}'`).join(',')}].forEach(nid => highlightNode('${id}', nid, false))`;

            return `<li onmouseover="${highlightCall}" onmouseout="${unhighlightCall}">
                <a href="#" onclick="viewHelper('${safeH}'); return false;">${h}</a>
            </li>`;
        }).join('');

        const testsListHtml = flowTests.map((test, idx) => {
            const safeTestName = (test.name || `Test ${idx + 1}`).replace(/'/g, '&apos;').replace(/"/g, '&quot;');
            const testTypeLabel = test.testType ? `<strong>${test.testType}</strong> · ` : '';
            const frameworkLabel = test.framework ? ` <small>(${test.framework})</small>` : '';
            return `<li>${testTypeLabel}${safeTestName}${frameworkLabel}</li>`;
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
                <div class="legend-item">
                    <div class="legend-box test-step"></div>
                    <span>Flow Test</span>
                </div>
            </div>
        `;

        flowDiv.innerHTML = `
            <div class="flow-header" onclick="toggleFlow('${id}-content')">
                <h2>Flow: ${title}</h2>
                <div class="header-actions">
                    ${window.currentView === 'all' ? `<button class="btn" onclick="event.stopPropagation(); zoomIn('${safeTitle}')">View only this</button>` : ''}
                    <button class="btn" onclick="event.stopPropagation(); printFlow('${id}')">Print</button>
                    <span class="toggle-icon">▼</span>
                </div>
            </div>
            <div id="${id}-content" class="flow-content">
                <div class="flow-layout">
                    <div class="flow-sidebar">
                        <section class="scrollable-section flow-information">
                            <h3>Flow Information</h3>
                            <div class="scroll-indicator scroll-indicator-top" aria-hidden="true">▲</div>
                            <div class="scrollable-section-content">
                                <p><strong>Name:</strong> ${title}</p>
                                <p><strong>Steps:</strong></p>
                                <ul>${stepsList}</ul>
                            </div>
                            <div class="scroll-indicator scroll-indicator-bottom" aria-hidden="true">▼</div>
                        </section>
                        ${helperList.size > 0 ? `
                        <section class="scrollable-section">
                            <h3>Helpers</h3>
                            <div class="scroll-indicator scroll-indicator-top" aria-hidden="true">▲</div>
                            <div class="scrollable-section-content">
                                <ul class="helper-list">${helpersListHtml}</ul>
                            </div>
                            <div class="scroll-indicator scroll-indicator-bottom" aria-hidden="true">▼</div>
                        </section>` : ''}
                        ${flowTests.length > 0 ? `
                        <section class="scrollable-section">
                            <h3>Tests</h3>
                            <div class="scroll-indicator scroll-indicator-top" aria-hidden="true">▲</div>
                            <div class="scrollable-section-content">
                                <ul class="test-list">${testsListHtml}</ul>
                            </div>
                            <div class="scroll-indicator scroll-indicator-bottom" aria-hidden="true">▼</div>
                        </section>` : ''}
                        <section class="scrollable-section">
                            <h3>Files</h3>
                            <div class="scroll-indicator scroll-indicator-top" aria-hidden="true">▲</div>
                            <div class="scrollable-section-content">
                                <ul class="file-list">${filesListHtml}</ul>
                            </div>
                            <div class="scroll-indicator scroll-indicator-bottom" aria-hidden="true">▼</div>
                        </section>
                    </div>
                    <div class="flow-diagram-container">
                        <div class="flow-diagram">
                            <pre class="mermaid" id="${id}">${mermaidCode}</pre>
                        </div>
                        <div class="floating-controls">
                            <div class="drag-handle" title="Drag to move controls">⠿ Move </div>
                            <div class="zoom-controls">
                                <label>Zoom:</label>
                                <input type="range" min="0.5" max="3" step="0.1" value="1" oninput="updateZoom('${id}', this.value)">
                            </div>
                            <button class="btn" onclick="resetZoom('${id}')">Reset</button>
                        </div>
                    </div>
                </div>
                ${legendHtml}
            </div>
`;
        container.appendChild(flowDiv);

        const diagramContainer = flowDiv.querySelector('.flow-diagram-container');
        const controls = flowDiv.querySelector('.floating-controls');
        initFloatingControlsDrag(diagramContainer, controls);
        initScrollableSections(flowDiv);
        
        try {
            const {svg} = await mermaid.render(id + '-svg', mermaidCode);
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = svg;
                attachDiagramPanHandlers(id);
                applyDiagramTransform(id);
            }
        } catch (renderError) {
            console.error('Mermaid render error for flow: ' + title, renderError);
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<div style="color: red">Render error: ' + renderError.message + '</div>';
        }
    });

    Promise.all(promises).then(() => {
        if (window.currentView === 'all') {
            updateRightMenu(flowsToRender);
        }
    }).catch(e => console.error('Mermaid render error', e));
}

function updateRightMenu(flows) {
    const menuItems = document.getElementById('menu-items');
    menuItems.innerHTML = '';
    
    Object.keys(flows).forEach(title => {
        const li = document.createElement('li');
        li.className = 'menu-item';
        
        // Find the flow container ID. We need a way to link it. 
        // In renderFlows, we generate random IDs. Let's change that to use title-based IDs for easier lookup.
        const flowId = 'flow-' + title.replace(/[^a-zA-Z0-9]/g, '-');
        
        li.onclick = () => {
            const el = document.getElementById(flowId);
            if (el) {
                const navHeight = 60;
                const elementPosition = el.getBoundingClientRect().top + window.pageYOffset;
                const offsetPosition = elementPosition - navHeight * 3 - 20; // 20px extra padding

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        };

        const text = document.createElement('span');
        text.className = 'menu-item-text';
        text.innerText = title;
        
        const eye = document.createElement('span');
        eye.className = 'eye-icon';
        eye.innerHTML = '<i class="far fa-eye"></i>';
        eye.title = 'Toggle Accordion';
        eye.onclick = (e) => {
            e.stopPropagation();
            window.toggleFlow(flowId + '-content');
            
            const content = document.getElementById(flowId + '-content');
            const isVisible = content && content.style.display !== 'none';
            eye.innerHTML = isVisible ? '<i class="far fa-eye"></i>' : '<i class="far fa-eye-slash"></i>';
        };
        
        li.appendChild(eye);
        li.appendChild(text);
        menuItems.appendChild(li);
    });
}

window.toggleAllAccordions = () => {
    const contents = document.querySelectorAll('.flow-content');
    const allHidden = Array.from(contents).every(c => c.style.display === 'none');
    
    // Determine new state
    const newStateVisible = allHidden;
    
    // Update main toggle button icon
    const toggleBtnIcon = document.querySelector('.menu-header .btn i');
    if (toggleBtnIcon) {
        toggleBtnIcon.className = newStateVisible ? 'fas fa-eye' : 'fas fa-eye-slash';
    }

    contents.forEach(c => {
        c.style.display = newStateVisible ? 'block' : 'none';
        const icon = c.previousElementSibling.querySelector('.toggle-icon');
        if (icon) icon.innerText = newStateVisible ? '▼' : '▶';
        
        // Update eye icons in right menu
        const flowId = c.id.replace('-content', '');
        const menuEye = document.querySelector(`.menu-item[onclick*="${flowId}"] .eye-icon`);
        if (menuEye) {
            menuEye.innerHTML = newStateVisible ? '<i class="far fa-eye"></i>' : '<i class="far fa-eye-slash"></i>';
        }
    });
};

function renderHelpers(helpers, flows) {
    const container = document.getElementById('flows-container');
    container.innerHTML = '<div class="helpers-view"><h2>Global Helpers</h2></div>';
    const grid = document.createElement('div');
    grid.className = 'helpers-grid';
    
    if (!helpers) return;

    Object.entries(helpers).forEach(([name, helper]) => {
        const helperCardId = 'helper-card-' + name.replace(/[^a-zA-Z0-9]/g, '-');
        const card = document.createElement('div');
        card.id = helperCardId;
        card.className = 'helper-card';
        
        const usedIn = [];
        Object.entries(flows).forEach(([flowTitle, steps]) => {
            if (Array.isArray(steps) && steps.some(s => s.helpers && s.helpers.includes(name))) {
                usedIn.push(flowTitle);
            }
        });

        let usageHtml = '';
        if (usedIn.length > 0) {
            usageHtml = '<div class="helper-usage"><strong>Used in:</strong><ul>' + 
                usedIn.map(f => {
                    const safeF = f.replace(/'/g, "\\'").replace(/"/g, "&quot;");
                    return '<li><a href="#" onclick="window.currentView=\'' + safeF + '\'; window.renderView(); return false;">' + f + '</a></li>';
                }).join('') + 
                '</ul></div>';
        }

        card.innerHTML = '<h3>' + name + '</h3>' +
            '<p class="helper-desc">' + (helper.description || 'No description provided.') + '</p>' +
            '<div class="helper-meta">' +
                '<span><strong>Function:</strong> ' + helper.functionName + '</span>' +
                '<span><strong>File:</strong> ' + helper.uri + '</span>' +
            '</div>' + usageHtml;
        grid.appendChild(card);
    });
    container.firstChild.appendChild(grid);
}

function renderTests(testsByFlow, flows) {
    const container = document.getElementById('flows-container');
    container.innerHTML = '<div class="tests-view"><h2>Flow Tests</h2></div>';
    const root = container.firstChild;

    if (!testsByFlow || Object.keys(testsByFlow).length === 0) {
        root.innerHTML += '<p>No tests found. Add @FlowTest decorators to your tests.</p>';
        return;
    }

    const sections = Object.entries(testsByFlow)
        .map(([flowName, tests]) => {
            if (!Array.isArray(tests) || tests.length === 0) {
                return '';
            }

            const flowExists = !!(flows && flows[flowName]);
            const flowLink = flowExists
                ? '<a href="#" onclick="window.currentView=\'' + flowName.replace(/'/g, "\\'") + '\'; window.renderView(); return false;">Open flow</a>'
                : '<span class="muted">Flow not currently discovered</span>';

            const testsItems = tests.map((test, index) => {
                const testName = test.name || ('Test ' + (index + 1));
                const testType = test.testType || 'Unspecified';
                const framework = test.framework ? ' · ' + test.framework : '';
                const step = typeof test.step !== 'undefined' ? '<span class="test-step-badge">Step: ' + test.step + '</span>' : '<span class="test-step-badge unbound">Flow-level</span>';
                const description = test.description ? '<p class="test-desc">' + test.description + '</p>' : '';
                return '<li class="test-item">' +
                    '<div class="test-item-header"><strong>' + testName + '</strong><span class="test-meta">' + testType + framework + '</span></div>' +
                    '<div class="test-item-subheader">' + step + '</div>' +
                    description +
                    '</li>';
            }).join('');

            return '<section class="test-flow-section">' +
                '<div class="test-flow-header">' +
                    '<h3>' + flowName + '</h3>' +
                    flowLink +
                '</div>' +
                '<ul class="test-list-view">' + testsItems + '</ul>' +
            '</section>';
        })
        .filter(Boolean)
        .join('');

    root.innerHTML += sections || '<p>No tests found. Add @FlowTest decorators to your tests.</p>';
}

window.zoomIn = (title) => {
    window.currentView = title;
    window.renderView();
};

window.printFlow = (flowId) => {
    const flowContainer = document.getElementById(flowId);
    if (!flowContainer) return;

    const flowRoot = flowContainer.closest('.flow-container');
    if (!flowRoot) return;

    const flowTitle = flowRoot.querySelector('.flow-header h2')?.textContent || 'Flow Diagram';
    const diagramSvg = flowRoot.querySelector('.flow-diagram .mermaid svg');
    const sidebar = flowRoot.querySelector('.flow-sidebar');
    if (!diagramSvg || !sidebar) return;

    let printRoot = document.getElementById('print-flow-root');
    if (!printRoot) {
        printRoot = document.createElement('div');
        printRoot.id = 'print-flow-root';
        printRoot.className = 'print-flow-root';
        document.body.appendChild(printRoot);
    }

    printRoot.innerHTML = `
        <section class="print-page print-diagram-page">
            <h2>${flowTitle}</h2>
            <div class="print-diagram-content">${diagramSvg.outerHTML}</div>
        </section>
        <section class="print-page print-sidebar-page">
            <h2>Flow Details</h2>
            <div class="print-sidebar-content">${sidebar.innerHTML}</div>
        </section>
    `;

    document.body.classList.add('printing-flow');
    const cleanupPrintState = () => {
        document.body.classList.remove('printing-flow');
        window.removeEventListener('afterprint', cleanupPrintState);
    };

    window.addEventListener('afterprint', cleanupPrintState);
    window.print();
    setTimeout(cleanupPrintState, 1000);
};

window.toggleFlow = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const header = el.previousElementSibling;
    const icon = header.querySelector('.toggle-icon');
    const isVisible = el.style.display !== 'none';
    
    if (isVisible) {
        el.style.display = 'none';
        icon.innerText = '▶';
    } else {
        el.style.display = 'block';
        icon.innerText = '▼';
    }
    
    // Update individual eye icon in right menu if it exists
    const flowId = id.replace('-content', '');
    const menuEye = document.querySelector(`.menu-item[onclick*="${flowId}"] .eye-icon`);
    if (menuEye) {
        menuEye.innerHTML = !isVisible ? '<i class="far fa-eye"></i>' : '<i class="far fa-eye-slash"></i>';
    }

    // Update main toggle button icon state based on all flows
    const contents = document.querySelectorAll('.flow-content');
    const allVisible = Array.from(contents).every(c => c.style.display !== 'none');
    const toggleBtnIcon = document.querySelector('.menu-header .btn i');
    if (toggleBtnIcon) {
        toggleBtnIcon.className = allVisible ? 'fas fa-eye' : 'fas fa-eye-slash';
    }
};

window.viewHelper = (helperName) => {
    window.currentView = 'helpers';
    window.renderView();
    
    // Give it a moment to render
    setTimeout(() => {
        const helperCardId = 'helper-card-' + helperName.replace(/[^a-zA-Z0-9]/g, '-');
        const el = document.getElementById(helperCardId);
        if (el) {
            const navHeight = 60;
            const elementPosition = el.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - navHeight - 20;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
            
            // Add a temporary highlight class
            el.classList.add('highlight-flash');
            setTimeout(() => el.classList.remove('highlight-flash'), 2000);
        }
    }, 100);
};

        window.highlightNode = (flowId, nodeId, highlight) => {
            const svgEl = document.querySelector(`#${flowId} svg`);
            if (!svgEl) return;
            
            // Mermaid v11 often adds a prefix or changes IDs.
            // Let's find all nodes and check their inner text or IDs more broadly.
            const nodes = svgEl.querySelectorAll('.node');
            nodes.forEach(node => {
                const id = node.id || node.getAttribute('id') || '';
                // nodeId like Helper_inventoryChecker_0_0 or Node_updateProfile_0
                if (id === nodeId || id.includes(nodeId)) {
                    if (highlight) {
                        node.classList.add('highlighted-node');
                    } else {
                        node.classList.remove('highlighted-node');
                    }
                }
            });
        };

window.updateZoom = (id, value) => {
    const state = getDiagramState(id);
    state.scale = Number(value) || 1;
    if (state.scale <= 1) {
        state.offsetX = 0;
        state.offsetY = 0;
        state.isDragging = false;
    }
    applyDiagramTransform(id);
};

window.resetZoom = (id) => {
    const slider = document.querySelector('input[oninput*="' + id + '"]');
    if (slider) {
        slider.value = 1;
    }
    const state = getDiagramState(id);
    state.scale = 1;
    state.offsetX = 0;
    state.offsetY = 0;
    state.isDragging = false;
    applyDiagramTransform(id);
};

// Start polling
loadFlows();
setInterval(loadFlows, 2000);
