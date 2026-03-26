/**
 * Validates the order data before processing.
 */
@Flow('OrderProcessing', 'Validation', 1)
function validateOrder(order) {
    console.log("Validating order...");
    return order.items && order.items.length > 0;
}

@FlowTest('OrderProcessing', {
    type: 'Unit',
    framework: 'Jest',
    step: 1,
    description: 'Covers order payload validation rules.'
})
function validateOrderUnitTest() {}

@Flow('OrderProcessing', 'Payment Check', 2)
function checkInventory(order) {
    // Check if items are in stock
    return true;
}
