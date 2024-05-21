import { Inject, Injectable } from '@nestjs/common';
import { ConfigArg } from '@vendure/common/lib/generated-types';
import {
  Customer,
  Injector,
  Logger,
  Order,
  Payment,
  PaymentMethodService,
  RequestContext,
  TransactionalConnection,
  UserInputError,
} from '@vendure/core';
import { VendureKonnectClient } from './konnect-client';
import { konnectPaymentHandler } from './konnect.handler';
import { KONNECT_PLUGIN_OPTIONS, loggerCtx } from './constants';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { KonnectPluginOptions } from './types';

@Injectable()
export class KonnectService {
  @Inject(KONNECT_PLUGIN_OPTIONS) private options: KonnectPluginOptions;

  constructor(
    private connection: TransactionalConnection,
    private paymentMethodService: PaymentMethodService,
    private httpService: HttpService,
    // private moduleRef: ModuleRef,
  ) { }

  async initPayment(ctx: RequestContext, order: Order): Promise<string> {
    let customerId: string | undefined;
    const konnect = await this.getClient(ctx, order);

    // Call to konnect server to init payment and get payUrl
    const { data } = await firstValueFrom(
      this.httpService.post(`${this.options.baseUrl}/payments/init-payment`, {
        "receiverWalletId": konnect.receiverWalletId,
        "token": order.currencyCode,
        "amount": order.totalWithTax,
        "type": "immediate",
        "acceptedPaymentMethods": [
          "bank_card"
        ],
        "lifespan": 10,
        "addPaymentFeesToAmount": true,
        "firstName": order.customer?.firstName,
        "lastName": order.customer?.lastName,
        "phoneNumber": order.customer?.emailAddress,
        "email": order.customer?.emailAddress,
        "orderId": order.id,
        "webhook": "http://51.210.243.161:3000/payments/konnect",
        "silentWebhook": true,
        "successUrl": "https://dev.konnect.network/gateway/payment-success",
        "failUrl": "https://dev.konnect.network/gateway/payment-failure",
        "theme": "light"
      }, {
        headers: {
          'x-api-key': konnect.apiKey,
        },
      })
    );

    return data.payUrl ?? undefined;
  }

  /**
   * Get Stripe client based on eligible payment methods for order
   */
  async getClient(ctx: RequestContext, order: Order): Promise<VendureKonnectClient> {
    const [eligiblePaymentMethods, paymentMethods] = await Promise.all([
      this.paymentMethodService.getEligiblePaymentMethods(ctx, order),
      this.paymentMethodService.findAll(ctx, {
        filter: {
          enabled: { eq: true },
        },
      }),
    ]);
    const konnectPaymentMethod = paymentMethods.items.find(
      pm => pm.handler.code === konnectPaymentHandler.code,
    );
    if (!konnectPaymentMethod) {
      throw new UserInputError('No enabled Konnect payment method found');
    }
    const isEligible = eligiblePaymentMethods.some(pm => pm.code === konnectPaymentMethod.code);
    if (!isEligible) {
      throw new UserInputError(`Konnect payment method is not eligible for order ${order.code}`);
    }
    const apiKey = this.findOrThrowArgValue(konnectPaymentMethod.handler.args, 'apiKey');
    const receiverWalletId = this.findOrThrowArgValue(konnectPaymentMethod.handler.args, 'receiverWalletId');
    return new VendureKonnectClient(apiKey, receiverWalletId);
  }

  private findOrThrowArgValue(args: ConfigArg[], name: string): string {
    const value = args.find(arg => arg.name === name)?.value;
    if (!value) {
      throw Error(`No argument named '${name}' found!`);
    }
    return value;
  }
}
