@Flow('OrderProcess', 'Start', 1)
function startOrder(orderData) {
    validateInput(orderData);
    logAuditEvent('orderStarted', orderData.userId);
    return processPayment(orderData);
}

@Flow('OrderProcess', 'ProcessPayment', 2)
function processPayment(order) {
    return { success: true };
}
