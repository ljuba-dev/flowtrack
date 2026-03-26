@Flow('MissingStepsFlow', 'Start')
function stepOne() {
    console.log('Step 1');
}

@Flow('MissingStepsFlow', 'Step with explicit number', 10)
function stepTen() {
    console.log('Step 10');
}

@Flow('MissingStepsFlow', 'Auto step')
function stepEleven() {
    console.log('Step 11');
}
