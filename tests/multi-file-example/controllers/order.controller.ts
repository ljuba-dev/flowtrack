@Flow('OrderProcessing', 'Entry Point', 0)
async function handleNewOrder(order) {
    if (validateOrder(order) && checkInventory(order)) {
        const result = await processOrder(order);
        notifyUser(result.orderId);
    }
}
