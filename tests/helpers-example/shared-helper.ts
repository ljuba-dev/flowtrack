/**
 * Common validation utility used across different flows.
 */
@FlowHelper('api.get', 'Fetches data from backend services.')
function validateInput(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid input');
    }
    return true;
}

/**
 * Common logging utility.
 */
@FlowHelper('audit.log', 'Logs important events to the audit database.')
function logAuditEvent(event, userId) {
    console.log(`[AUDIT] User ${userId} performed ${event}`);
}
