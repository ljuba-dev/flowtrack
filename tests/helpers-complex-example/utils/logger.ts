/**
 * Global audit logger for tracking sensitive operations.
 * This helper is used across multiple flows to ensure compliance.
 */
@FlowHelper('AuditLogger', 'Logs sensitive actions to a secure audit trail')
function auditLog(action, userId, data) {
    console.log(`AUDIT: [${action}] by User ${userId}`, data);
}
