@Flow('MissingStepsFlow', 'Start')
function stepOne() {
    console.log('Step 1');
}

@FlowTest('MissingStepsFlow', {
    type: 'E2E',
    framework: 'Playwright',
    description: 'Validates auto-step flow ordering behavior.'
})
function missingStepsFlowE2ETest() {}

@FlowTest('MissingStepsFlow', {
    type: 'Unit',
    framework: 'Jest',
    step: 10,
    description: 'Covers explicitly numbered step behavior.'
})
function explicitStepUnitTest() {}

@Flow('MissingStepsFlow', 'Step with explicit number', 10)
function stepTen() {
    console.log('Step 10');
}

@Flow('MissingStepsFlow', 'Auto step')
function stepEleven() {
    console.log('Step 11');
}
