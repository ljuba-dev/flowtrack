/**
 * Angular-oriented parser example.
 * Uses class methods and service-like style.
 */

class UserFacadeService {
    @FlowTest('AngularUserFlow', {
        type: 'E2E',
        framework: 'Playwright',
        description: 'Covers the complete Angular user initialization flow.'
    })
    angularUserFlowE2ETest() {}

    @FlowTest('AngularUserFlow', {
        type: 'Unit',
        framework: 'Jest',
        step: 1,
        description: 'Validates user loading and mapping behavior.'
    })
    loadUserUnitTest() {}

    @Flow('AngularUserFlow', 'Load User', 1)
    loadUser(userId: string) {
        const user = this.getUserById(userId);
        return this.mapUser(user);
    }

    @Flow('AngularUserFlow', 'Validate User', 2)
    @FlowHelper('angularRoleValidator', 'Checks role permissions for routed screens.')
    validateUser(user: { id: string; role: string }) {
        if (user.role === 'admin') {
            return this.enableAdminRoutes(user);
        }

        return this.enableDefaultRoutes(user);
    }

    @Flow('AngularUserFlow', 'Complete User Init', 3)
    completeInit(user: { id: string }) {
        return { success: true, userId: user.id };
    }

    getUserById(userId: string) {
        return { id: userId, role: 'admin' };
    }

    mapUser(user: { id: string; role: string }) {
        return this.validateUser(user);
    }

    enableAdminRoutes(user: { id: string }) {
        return this.completeInit(user);
    }

    enableDefaultRoutes(user: { id: string }) {
        return this.completeInit(user);
    }
}

export { UserFacadeService };