
/**
 * In standard JavaScript, decorators are not supported natively.
 * However, FlowTrack's custom parser is designed to identify @Flow and @FlowHelper
 * patterns even in JavaScript files. 
 *
 * This allows you to define your business flows directly in your JS code,
 * even if it's technically invalid syntax for a standard JS engine.
 * The FlowTrack extension will still be able to parse and visualize it.
 */

@Flow('OrderProcessingJS', 'Entry Point', 1)
function handleNewOrder(order) {
    console.log('Processing order:', order.id);
    
    // Validate the order
    if (validate(order)) {
        processPayment(order);
    }
}

@Flow('OrderProcessingJS', 'Payment Step', 2)
@FlowHelper('PaymentProcessor')
function processPayment(order) {
    console.log('Processing payment for:', order.id);
    // Payment logic...
    finalizeOrder(order);
}

@FlowHelper('InputValidator')
function validate(data) {
    return data && data.id;
}

@Flow('OrderProcessingJS', 'Completion', 3)
function finalizeOrder(order) {
    console.log('Order finalized:', order.id);
}

module.exports = { handleNewOrder };
