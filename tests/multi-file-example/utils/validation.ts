/**
 * Validates the order data before processing.
 */
@Flow('OrderProcessing', 'Validation', 1)
function validateOrder(order) {
    console.log("Validating order...");
    return order.items && order.items.length > 0;
}

@Flow('OrderProcessing', 'Payment Check', 2)
function checkInventory(order) {
    // Check if items are in stock
    return true;
}
