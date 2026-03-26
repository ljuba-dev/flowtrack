/**
 * Step 1: Request Password Reset
 */
@Flow('PasswordResetFlow', 'Request Reset', 1)
function requestReset(email) {
    auditLog('password_reset_request', email, { timestamp: Date.now() });
    return sendResetEmail(email);
}

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
