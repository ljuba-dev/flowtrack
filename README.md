# FlowTrack

[![npm version](https://img.shields.io/npm/v/@flowtrack-ljuba/core.svg)](https://www.npmjs.com/package/@flowtrack-ljuba/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

FlowTrack is a powerful visualization tool for tracking and documenting code execution flows in TypeScript and JavaScript projects. Using simple decorators, it automatically generates interactive Mermaid.js diagrams to help developers understand complex business logic, identify dependencies, and document system behavior.

## Project Links

- **npm package:** https://www.npmjs.com/package/@flowtrack-ljuba/core
- **GitHub repository:** https://github.com/ljuba-dev/flowtrack
- **Issue tracker:** https://github.com/ljuba-dev/flowtrack/issues

## Why FlowTrack?

In large codebases, tracing the path of a request or a business process across multiple files, controllers, and services can be challenging. FlowTrack provides:

- **Visual Clarity:** See your code's execution path as a clear, interactive diagram.
- **Living Documentation:** Your documentation stays in sync with your code through decorators.
- **Dependency Tracking:** Automatically identify and visualize helper functions and external service calls.
- **Standalone Web Dashboard:** Explore and navigate flows in a browser-based interface.

## Purpose

The primary goal of FlowTrack is to bridge the gap between code and architectural diagrams. By annotating key functions with `@Flow` and `@FlowHelper` decorators, FlowTrack parses your codebase and builds a comprehensive map of how different components interact.

![FlowTrack Browser Overview](https://github.com/ljuba-dev/flowtrack/raw/main/assets/overview.png)

## Installation

### As an NPM Package

You can install FlowTrack as a development dependency in your project:

```bash
# Using npm
npm install --save-dev @flowtrack-ljuba/core

# Using pnpm
pnpm add -D @flowtrack-ljuba/core
```

<!-- ### For Visual Studio Code

The VS Code extension is not publicly available yet.
This section will be restored once the extension is released.
 -->

## Key Features

### Interactive Browser
The standalone server provides a rich web interface to explore your flows, with auto-reloading and Mermaid.js visualization.

- `Flows` page: visual flow diagrams with steps, helpers, and linked tests.
- `Helpers` page: a global catalog of helper functions and where they are used.
- `Tests` page: a global catalog of `@FlowTest` entries grouped by the flow they belong to.

![Flow Details View](https://github.com/ljuba-dev/flowtrack/raw/main/assets/flow-details.png)

### Multi-File Flows
FlowTrack seamlessly connects steps from different files into a single, cohesive flow diagram.

![Multi-file Flow Example](https://github.com/ljuba-dev/flowtrack/raw/main/assets/multi-file-flow.png)

### Helper Function Visibility
FlowTrack highlights helper functions decorated with `@FlowHelper`, making it easier to understand supporting logic used by your main flow steps.

![Flow Helpers View](https://github.com/ljuba-dev/flowtrack/raw/main/assets/helpers.png)

### Flow With Helpers
You can also inspect flows together with their helper relationships to get a complete picture of execution and dependencies.

![Flow With Helpers](https://github.com/ljuba-dev/flowtrack/raw/main/assets/flow-with-helpers.png)

## Getting Started

### 1. Configure Your Project

Create a `flow.config.js` in your project root to specify which directories to scan and other settings:

```javascript
module.exports = {
    include: ['src', 'app', 'services'],
    framework: 'auto', // auto | angular | react | typescript
    port: 3434 // optional, defaults to 3434
};
```

### Framework Profiles

FlowTrack now supports internal framework-aware parsing profiles while keeping the same `@Flow` and `@FlowHelper` decorators.

- `auto` (default): detects your project and picks a parser profile automatically.
- `angular`: uses Angular-oriented parsing behavior.
- `react`: uses React-oriented parsing behavior.
- `typescript`: uses the baseline TypeScript/JavaScript parser profile.

You can force a profile in `flow.config.js`:

```javascript
module.exports = {
    include: ['src'],
    framework: 'angular'
};
```

### 2. Annotate Your Code

Use the `@Flow` decorator to define a step in a business process:

```typescript
import { Flow } from '@flowtrack-ljuba/core';

@Flow('OrderProcessing', 'Validate Payment', 1)
function validatePayment(orderId: string) {
    // ... logic
}

@Flow('OrderProcessing', 'Update Inventory', 2)
function updateInventory(orderId: string) {
    // ... logic
}
```

Use `@FlowHelper` for utility functions used within flows:

```typescript
import { FlowHelper } from '@flowtrack-ljuba/core';

@FlowHelper()
function sanitizeData(data: any) {
    // ... logic
}
```

Use `@FlowTest` to attach test coverage to a specific flow. You can optionally bind the test to a concrete step:

```typescript
import { FlowTest } from '@flowtrack-ljuba/core';

/**
 * Verifies checkout happy-path completion.
 */
@FlowTest('OrderProcessing', {
    name: 'Order processing e2e',
    type: 'E2E',
    framework: 'Playwright',
    tags: ['smoke', 'checkout']
})
async function completeCheckoutTest() {
    // ... test logic
}
```

`@FlowTest` arguments:
- positional `flow` (required): flow name where this test belongs.
- options object (optional):
  - `name`: test label shown in the diagram/sidebar.
  - `description`, `type`, `framework`, plus optional metadata like `id` and `tags`.
  - `step`: optional step binding (number or step name). If omitted, the test is shown as a flow-level test and is not connected to a specific step node.

Additional examples:

```typescript
@FlowTest('OrderProcessing', {
    name: 'Validate Payment unit test',
    type: 'Unit',
    framework: 'Jest',
    step: 1,
    tags: ['unit', 'fast']
})
function validatePaymentUnitTest() {
    // Jest unit test body
}

@FlowTest('OrderProcessing', {
    name: 'Create Shipment B2B',
    type: 'B2B',
    framework: 'Jest',
    description: 'Validates partner fulfillment integration.',
    tags: ['integration', 'partner']
})
function createShipmentB2BTest() {
    // Backend-to-backend integration test body
}
```

### 3. Visualize

#### Using Standalone Server
Run the FlowTrack server to view your flows in any web browser. You can add it to your `package.json` scripts:

```json
{
  "scripts": {
    "flow": "flowtrack"
  }
}
```

Then run:
```bash
npm run flow
```
Or use npx directly:
```bash
npx flowtrack
```
Then open `http://localhost:3434` in your browser.

## Documentation and Support

- **Browser Dashboard:** `http://localhost:3434`
- **Configuration:** Check `flow.config.js` for custom include paths.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for setup steps, coding expectations, and pull request workflow.

Built with ❤️ for developers who love clarity.
