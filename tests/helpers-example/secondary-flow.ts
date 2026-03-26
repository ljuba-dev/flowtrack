@Flow('AngularUserFlow', { name: 'loadUser', step: 1, helpers: ['api.get', 'audit.log'] })
function loadUser(userData) {
    validateInput(userData);
    logAuditEvent('userLoaded', userData.userId);
    return validateUser(userData);
}

@Flow('AngularUserFlow', { name: 'ValidateUser', step: 2, helpers: ['api.get'] })
function validateUser(user) {
    return completeUserInit(user);
}

@Flow('AngularUserFlow', { name: 'Complete UserInit', step: 3, helpers: ['audit.log'] })
function completeUserInit(user) {
    return { initialized: true, user };
}

/**
 * Verifies that the entire Angular user initialization flow works in browser E2E.
 */
@FlowTest('AngularUserFlow', {
    name: 'Angular user flow e2e',
    type: 'E2E',
    framework: 'Playwright',
    tags: ['regression', 'ui']
})
async function angularUserFlowE2EPlaywrightTest() {
    return loadUser({ userId: 'playwright-user' });
}

@FlowTest('AngularUserFlow', {
    name: 'loadUser unit validation',
    description: 'Unit-level guard validation for loadUser step.',
    type: 'Unit',
    framework: 'Jest',
    step: 1,
    tags: ['unit', 'fast']
})
function loadUserUnitTest() {
    return loadUser({ userId: 'unit-user' });
}
