/**
 * React-oriented parser example.
 * Uses function + arrow handlers in a component-style shape.
 */

type CheckoutItem = { id: string; price: number };

@Flow('ReactCheckoutFlow', 'Prepare Checkout', 1)
const prepareCheckout = (items: CheckoutItem[]) => {
    const normalized = normalizeItems(items);
    return submitCheckout(normalized);
};

@Flow('ReactCheckoutFlow', 'Normalize Items', 2)
@FlowHelper('reactPriceNormalizer', 'Normalizes item prices before submit.')
function normalizeItems(items: CheckoutItem[]) {
    return items.map(item => ({ ...item, price: Math.max(0, item.price) }));
}

@Flow('ReactCheckoutFlow', 'Submit Checkout', 3)
const submitCheckout = (items: CheckoutItem[]) => {
    return {
        success: true,
        count: items.length
    };
};

export { prepareCheckout, normalizeItems, submitCheckout };