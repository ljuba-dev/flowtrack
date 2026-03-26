@Flow('OrderProcess', { name: 'Start', step: 1, helpers: ['api.get', 'audit.log'] })
function startOrder(orderData) {
    validateInput(orderData);
    logAuditEvent('orderStarted', orderData.userId);
    return processPayment(orderData);
}

@FlowTest('OrderProcess', 'Start', { type: 'Unit', framework: 'Jest', tags: ['smoke', 'critical'] })
function startOrderTest() {
    return startOrder({ userId: 'test-user' });
}

@Flow('OrderProcess', { name: 'ProcessPayment', step: 2, helpers: ['api.get'] })
function processPayment(order) {
    return { success: true };
}

@Flow('CartCheckout', { name: 'Validate Cart', step: 1, helpers: ['api.get', 'audit.log'] })
function validateCart(cartData) {
    validateInput(cartData);
    logAuditEvent('cartValidated', cartData.userId);
    return { valid: true, items: cartData.items || [] };
}

@Flow('CartCheckout', { name: 'Apply Discount', step: 2, helpers: ['api.get'] })
function applyDiscount(cartData) {
    validateInput(cartData);
    return { total: 90, discountApplied: true };
}

@FlowTest('CartCheckout', 'Validate Cart', {
    type: 'Unit',
    framework: 'Jest',
    description: 'Validates cart payload and emits audit log through shared helpers.',
    tags: ['unit', 'checkout']
})
function validateCartUnitTest() {
    return validateCart({ userId: 'unit-user', items: [{ sku: 'sku-1', qty: 1 }] });
}

@FlowTest('CartCheckout', 'Apply Discount', {
    type: 'Unit',
    framework: 'Jest',
    tags: ['unit', 'pricing']
})
function applyDiscountUnitTest() {
    return applyDiscount({ userId: 'unit-user', items: [{ sku: 'sku-2', qty: 2 }] });
}
