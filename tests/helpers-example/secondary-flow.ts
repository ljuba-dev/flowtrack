@Flow('UserProfileUpdate', 'Start', 1)
function updateProfile(userData) {
    validateInput(userData);
    logAuditEvent('profileUpdated', userData.userId);
    return saveProfile(userData);
}

@Flow('UserProfileUpdate', 'Save', 2)
function saveProfile(user) {
    return { updated: true };
}
