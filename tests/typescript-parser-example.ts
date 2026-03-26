/**
 * Plain TypeScript parser example.
 */

interface RegistrationInput {
    email: string;
    password: string;
}

@Flow('TypeScriptRegistrationFlow', 'Start Registration', 1)
function startRegistration(input: RegistrationInput) {
    const validated = validateRegistration(input);
    return persistRegistration(validated);
}

@Flow('TypeScriptRegistrationFlow', 'Validate Input', 2)
@FlowHelper('registrationValidator', 'Validates registration payload fields.')
const validateRegistration = (input: RegistrationInput) => {
    return {
        ...input,
        email: input.email.trim().toLowerCase()
    };
};

@Flow('TypeScriptRegistrationFlow', 'Persist User', 3)
function persistRegistration(input: RegistrationInput) {
    return { success: true, userEmail: input.email };
}

export { startRegistration, validateRegistration, persistRegistration };