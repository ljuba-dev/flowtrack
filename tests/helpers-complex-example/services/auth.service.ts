/**
 * Step 1: Request Password Reset
 */
@Flow('PasswordResetFlow', 'Request Reset', 1)
function requestReset(email) {
    auditLog('password_reset_request', email, { timestamp: Date.now() });
    return sendResetEmail(email);
}

@FlowTest('PasswordResetFlow', {
    type: 'E2E',
    framework: 'Playwright',
    description: 'Covers the full password reset flow.'
})
function passwordResetE2ETest() {}

@FlowTest('PasswordResetFlow', {
    type: 'Unit',
    framework: 'Jest',
    step: 2,
    description: 'Validates reset email dispatch behavior.'
})
function sendResetEmailUnitTest() {}

/**
 * Step 2: Send Email
 */
@Flow('PasswordResetFlow', 'Send Email', 2)
function sendResetEmail(email) {
    console.log(`Sending reset link to ${email}`);
    return { success: true };
}

@FlowHelper('AuditLogger')
function auditLog(action, email, data) {}

