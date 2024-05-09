import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';
import { gql } from 'graphql-tag';

import { KonnectResolver } from './konnect.resolver';
import { KonnectService } from './konnect.service';
import { KonnectController } from './konnect.controller';
import { konnectPaymentHandler } from './konnect.handler';
import { rawBodyMiddleware } from './raw-body-middleware';
import { KONNECT_PLUGIN_OPTIONS } from './constants';
import { HttpModule } from '@nestjs/axios';

@VendurePlugin({
  imports: [PluginCommonModule, HttpModule],
  controllers: [KonnectController],
  providers: [
    {
      provide: KONNECT_PLUGIN_OPTIONS,
      useFactory: (): any => KonnectPlugin.options,
    },
    KonnectService,
  ],
  configuration: config => {
    config.paymentOptions.paymentMethodHandlers.push(konnectPaymentHandler);

    config.apiOptions.middleware.push({
      route: '/payments/konnect',
      handler: rawBodyMiddleware,
      beforeListen: true,
    });

    return config;
  },
  shopApiExtensions: {
    schema: gql`
      extend type Mutation {
        initPayment: String!
      }
    `,
    resolvers: [KonnectResolver],
  },
  compatibility: '^2.0.0',
})
export class KonnectPlugin {
  static options: any;

  /**
   * @description
   * Initialize the Stripe payment plugin
   */
  static init(options: any): Type<KonnectPlugin> {
    this.options = options;
    return KonnectPlugin;
  }
}
