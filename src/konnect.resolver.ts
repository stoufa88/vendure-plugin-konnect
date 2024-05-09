import { Mutation, Resolver } from '@nestjs/graphql';
import {
    ActiveOrderService,
    Allow,
    Ctx,
    Permission,
    RequestContext,
    UnauthorizedError,
    UserInputError,
} from '@vendure/core';

import { KonnectService } from './konnect.service';

@Resolver()
export class KonnectResolver {
    constructor(private konnectService: KonnectService, private activeOrderService: ActiveOrderService) {}

    @Mutation()
    @Allow(Permission.Owner)
    async initPayment(@Ctx() ctx: RequestContext): Promise<string> {
        if (!ctx.authorizedAsOwnerOnly) {
            throw new UnauthorizedError();
        }
        const sessionOrder = await this.activeOrderService.getActiveOrder(ctx, undefined);
        if (!sessionOrder) {
            throw new UserInputError('No active order found for session');
        }
        return this.konnectService.initPayment(ctx, sessionOrder);
    }
}
