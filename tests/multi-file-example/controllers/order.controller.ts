@Flow('OrderProcessing', 'Entry Point', 0)
async function handleNewOrder(order) {
    if (validateOrder(order) && checkInventory(order)) {
        const result = await processOrder(order);
        notifyUser(result.orderId);
    }
}

@FlowTest('OrderProcessing', {
    type: 'E2E',
    framework: 'Playwright',
    description: 'Validates multi-file order processing journey.'
})
function orderProcessingMultiFileE2ETest() {}
