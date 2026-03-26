/**
 * Step 1: Process Payment
 */
@Flow('PaymentProcessingFlow', 'Process Transaction', 1)
@FlowHelper('AuditLogger')
function processTransaction(userId, amount) {
    auditLog('payment_started', userId, { amount });
    return authorizeCard(userId, amount);
}

/**
 * Step 2: Card Authorization
 */
@Flow('PaymentProcessingFlow', 'Authorize Card', 2)
function authorizeCard(userId, amount) {
    console.log(`Authorizing card for user ${userId} for $${amount}`);
    auditLog('payment_authorized', userId, { amount, status: 'success' });
    return finalizePayment(userId, amount);
}

/**
 * Step 3: Finalize Payment
 */
@Flow('PaymentProcessingFlow', 'Finalize', 3)
function finalizePayment(userId, amount) {
    console.log(`Payment successful for user ${userId}`);
    return { success: true };
}

@FlowHelper('AuditLogger')
function auditLog(action, userId, data) {}
