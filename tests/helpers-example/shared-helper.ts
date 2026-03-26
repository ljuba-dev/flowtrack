/**
 * Common validation utility used across different flows.
 */
@FlowHelper('ValidateInput', 'Validates that the input data is correctly formatted.')
function validateInput(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid input');
    }
    return true;
}

/**
 * Common logging utility.
 */
@FlowHelper('AuditLogger', 'Logs important events to the audit database.')
function logAuditEvent(event, userId) {
    console.log(`[AUDIT] User ${userId} performed ${event}`);
}
