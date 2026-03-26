
@FlowHelper('externalLogger', 'Logs events to an external system for auditing purposes.')
function logToExternalSystem(event, details) {
    // integration with external logger
    console.log(`[EXTERNAL_LOG] ${event}: ${JSON.stringify(details)}`);
}

@FlowHelper('notificationDispatcher', 'Dispatches notifications via various channels.')
function dispatchNotification(userId, message) {
    // integration with notification service
    console.log(`[NOTIFY] User ${userId}: ${message}`);
}

export { logToExternalSystem, dispatchNotification };
