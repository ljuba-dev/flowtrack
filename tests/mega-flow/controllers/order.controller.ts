
import { validateRequest, sanitizeData } from '../utils/security';
import { checkWarehouseInventory, calculateDiscounts, finalizeOrderProcessing } from '../services/fulfillment.service';

/**
 * Controller for handling new order requests.
 */
@Flow('MegaFulfillmentFlow', 'Initiate Order', 1)
function handleOrderRequest(req, res) {
    // 1. Validate request (using helper)
    if (!validateRequest(req)) {
        return res.status(403).send('FORBIDDEN');
    }

    // 2. Sanitize data (using helper)
    const rawOrderData = req.body;
    const orderData = sanitizeData(rawOrderData);

    // 3. Check inventory
    const inStock = checkWarehouseInventory(orderData.sku, orderData.qty);
    if (!inStock) {
        return res.status(400).send('OUT_OF_STOCK');
    }

    // 4. Calculate discounts
    const finalPrice = calculateDiscounts(orderData);

    // 4.5 Branching logic simulation
    if (orderData.international) {
        calculateExternalShipping(orderData);
    } else {
        calculateShipping(orderData);
    }

    // 5. Finalize order
    const result = finalizeOrderProcessing({ ...orderData, total: finalPrice });

    return res.status(200).json(result);
}

@FlowTest('MegaFulfillmentFlow', {
    type: 'E2E',
    framework: 'Playwright',
    description: 'Validates mega fulfillment flow from request to finalize.'
})
function megaFulfillmentE2ETest() {}

export { handleOrderRequest };
