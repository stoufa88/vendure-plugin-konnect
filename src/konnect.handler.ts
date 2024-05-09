import {
  CancelPaymentResult,
  CancelPaymentErrorResult,
  PaymentMethodHandler,
  CreatePaymentResult,
  SettlePaymentResult,
  SettlePaymentErrorResult,
  LanguageCode,
} from '@vendure/core';
import { KonnectService } from './konnect.service';

let konnectService: KonnectService;

/**
* This is a handler which integrates Vendure with an imaginary
* payment provider, who provide a Node SDK which we use to
* interact with their APIs.
*/
export const konnectPaymentHandler = new PaymentMethodHandler({
  code: 'konnect',
  description: [{
    languageCode: LanguageCode.en,
    value: 'Konnect',
  }],
  args: {
    apiKey: { type: 'string' },
    receiverWalletId: { type: 'string' },
  },
  init(injector) {
    konnectService = injector.get(KonnectService);
  },
  /** This is called when the `addPaymentToOrder` mutation is executed */
  createPayment: async (ctx, order, amount, args, metadata): Promise<CreatePaymentResult> => {
    if (ctx.apiType !== 'admin') {
      throw Error(`CreatePayment is not allowed for apiType '${ctx.apiType}'`);
    }

    try {
      return {
        amount: order.total,
        state: 'Settled' as const,
        // transactionId: result.id.toString(),
        metadata: {
          // cardInfo: result.cardInfo,
          // Any metadata in the `public` field
          // will be available in the Shop API,
          // All other metadata is private and
          // only available in the Admin API.
          public: {
            // referenceCode: result.publicId,
          }
        },
      };
    } catch (err) {
      return {
        amount: order.total,
        state: 'Declined' as const,
        metadata: {
          // errorMessage: err.message,
        },
      };
    }
  },

  /** This is called when the `settlePayment` mutation is executed */
  settlePayment: async (ctx, order, payment, args): Promise<SettlePaymentResult | SettlePaymentErrorResult> => {
    return {
      success: true,
    };
  },

  /** This is called when a payment is cancelled. */
  cancelPayment: async (ctx, order, payment, args): Promise<CancelPaymentResult | CancelPaymentErrorResult> => {
    try {
      // const result = await sdk.charges.cancel({
      //   apiKey: args.apiKey,
      //   id: payment.transactionId,
      // });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        // errorMessage: err.message,
      }
    }
  },
});