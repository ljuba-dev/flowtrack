@Flow('OrderProcessing', 'Processing', 3)
async function processOrder(order) {
    console.log("Processing payment and shipping...");
    return { status: 'success', orderId: order.id };
}

@FlowTest('OrderProcessing', {
    type: 'Unit',
    framework: 'Jest',
    step: 3,
    description: 'Validates service-level order processing result.'
})
function processOrderUnitTest() {}

@Flow('OrderProcessing', 'Notification', 4)
function notifyUser(orderId) {
    console.log(`Sending email for order ${orderId}`);
}
