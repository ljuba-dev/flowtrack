/**
 * This is the start of the authentication flow.
 * It initiates the user login process.
 */
@Flow('AuthFlow', 'Start Login', 1)
function initiateLogin(email, password) {
    console.log("Initiating login for:", email);
    return validateCredentials(email, password);
}

@FlowTest('AuthFlow', {
    type: 'E2E',
    framework: 'Playwright',
    description: 'Validates the entire authentication flow behavior.'
})
function authFlowE2ETest() {}

@FlowTest('AuthFlow', {
    type: 'Unit',
    framework: 'Jest',
    step: 2,
    description: 'Covers credential validation decision logic.'
})
function validateCredentialsUnitTest() {}

/**
 * Validates the provided email and password against the database.
 */
@Flow('AuthFlow', 'Validate Credentials', 2)
async function validateCredentials(email, password) {
    const user = await db.findUserByEmail(email);
    if (!user || user.password !== password) {
        return handleFailedLogin(email);
    }
    return checkMFA(user);
}

/**
 * Handles failed login attempts.
 * Increments fail count and returns error.
 */
@Flow('AuthFlow', 'Login Failed', 3)
function handleFailedLogin(email) {
    console.error("Login failed for:", email);
    return { success: false, error: "Invalid credentials" };
}

/**
 * Checks if Multi-Factor Authentication is required for the user.
 */
@Flow('AuthFlow', 'Check MFA', 3)
checkMFA(user) {
    if (user.mfaEnabled) {
        return promptMFA(user.id);
    }
    return completeLogin(user);
}

/**
 * Prompts the user for MFA code.
 */
@Flow('AuthFlow', 'Prompt MFA', 4)
function promptMFA(userId) {
    return { success: true, requireMFA: true, userId };
}

/**
 * Finalizes the login process and creates a session.
 */
@Flow('AuthFlow', 'Complete Login', 4)
function completeLogin(user) {
    const token = jwt.sign({ id: user.id }, SECRET);
    return { success: true, token };
}
