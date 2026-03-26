/**
 * Flow decorator to mark a function as a step in a business process.
 * 
 * @param title The title of the flow (e.g., 'OrderProcessing')
 * @param name The name of the step (e.g., 'Validate Payment')
 * @param step The step number in the flow
 * @param description Optional description of the step
 */
export function Flow(title: string, name?: string, step?: number, description?: string): any;
/**
 * Flow decorator to mark a function as a step in a business process using an object.
 * 
 * @param title The title of the flow
 * @param options Step options
 */
export function Flow(title: string, options?: { name?: string, step?: number, description?: string }): any;
export function Flow(title: string, arg2?: any, arg3?: any, arg4?: any): any {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        return descriptor;
    };
}

/**
 * FlowHelper decorator to mark a utility function.
 * 
 * @param name Optional name for the helper
 * @param description Optional description for the helper
 */
export function FlowHelper(name?: string, description?: string): any {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        return descriptor;
    };
}
