
@FlowHelper('securityCheck', 'Validates the integrity of the request and the user session.')
function validateRequest(req) {
    // security logic
    return true;
}

@FlowHelper('dataSanitizer', 'Sanitizes input data to prevent injection attacks.')
function sanitizeData(data) {
    // sanitization logic
    return data;
}

export { validateRequest, sanitizeData };
