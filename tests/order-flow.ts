/**
 * Handles the processing of a new order from a customer.
 */
@Flow('OrderProcessing', { name: 'New Order', step: 1, description: 'Initiates order processing workflow.' })
function handleOrder(order) {
    console.log("Processing order:", order.id);
    return checkStock(order);
}

@FlowTest('OrderProcessing', {
    type: 'E2E',
    framework: 'Playwright',
    description: 'Validates the order processing flow from new order to shipment.'
})
function orderProcessingE2ETest() {}

@FlowTest('OrderProcessing', {
    type: 'Unit',
    framework: 'Jest',
    step: 2,
    description: 'Validates inventory check branching.'
})
function checkInventoryUnitTest() {}

@FlowTest('OrderProcessing', {
    type: 'Unit',
    framework: 'Jest',
    step: 2,
    description: 'Validates inventory check branching 2.'
})
function checkInventoryUnitTest1() {}

/**
 * Checks inventory to see if items are available for the order.
 */
@Flow('OrderProcessing', 'Check Inventory', 2)
function checkStock(order) {
    if (inventory.hasItems(order.items)) {
        return reserveStock(order);
    }
    return notifyOutOfStock(order);
}

/**
 * Reserves the stock for the order.
 */
@FlowHelper()
function reserveStock(order) {
    inventory.reserve(order.items);
    return processPayment(order);
}

/**
 * Notifies the customer that items are out of stock.
 */
@Flow('OrderProcessing', 'Out of Stock Notification', 3)
function notifyOutOfStock(order) {
    emailService.sendOutOfStock(order.customer);
    return { status: 'failed', reason: 'out_of_stock' };
}

/**
 * Initiates the payment process for the order.
 */
@Flow('OrderProcessing', 'Initiate Payment', 3)
function processPayment(order) {
    const success = paymentGateway.charge(order.total, order.paymentMethod);
    if (success) {
        return createShipment(order);
    }
    return handlePaymentFailure(order);
}

/**
 * Handles failures in the payment process.
 */
@Flow('OrderProcessing', 'Payment Failed', 4)
function handlePaymentFailure(order) {
    console.error("Payment failed for order:", order.id);
    return { status: 'failed', reason: 'payment_denied' };
}

/**
 * Creates a shipment request for the ordered items.
 */
@Flow('OrderProcessing', 'Create Shipment', 4)
function createShipment(order) {
    const shipment = shippingService.create(order);
    return { status: 'success', shipmentId: shipment.id };
}
