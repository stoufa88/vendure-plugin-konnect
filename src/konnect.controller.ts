// products.controller.ts
import { HttpService } from '@nestjs/axios';
import { Controller, Post, Get, Query, Req, Res, HttpStatus } from '@nestjs/common';
import { Ctx, InternalServerError, LanguageCode, Logger, Order, OrderService, PaymentMethod, PaymentMethodService, RequestContext, RequestContextService, TransactionalConnection } from '@vendure/core';
import { firstValueFrom } from 'rxjs';
import type { Response } from 'express';
import { loggerCtx } from './constants';
import { RequestWithRawBody } from './types';

const BASE_KONNECT_URL = 'https://api.preprod.konnect.network/api/v2';

@Controller('payments')
export class KonnectController {
  constructor(
    private paymentMethodService: PaymentMethodService,
    private orderService: OrderService,
    private httpService: HttpService,
    private requestContextService: RequestContextService,
    private connection: TransactionalConnection,
  ) { }

  @Get('konnect')
  async webhook(
    @Query() query: any,
    @Ctx() ctx: RequestContext,
    @Req() request: RequestWithRawBody,
    @Res() response: Response,
  ): Promise<void> {
    Logger.info('hello from webhook', loggerCtx);
    Logger.info(query.payment_ref, loggerCtx);

    // Fetch payment usng payment_ref
    const { data } = await firstValueFrom(
      this.httpService.get(`${BASE_KONNECT_URL}/payments/${query.payment_ref}`)
    );

    // @TODO get channelToken Add withTransaction like in stripe plugin
    
    const outerCtx = await this.createContext('16umpfivrsek47brjwj', request);
    await this.connection.withTransaction(outerCtx, async ctx => {
      const { id, status, orderId, amount } = data.payment;

      const order = await this.orderService.findOneByCode(ctx, orderId);

      if (!order) {
        throw new Error(
          `Unable to find order ${orderId}, unable to settle payment!`,
        );
      }

  
      Logger.info(JSON.stringify(order));
      Logger.info('-------');
      Logger.info(JSON.stringify(data));
  
      if (status === 'pending') {
        Logger.warn(`Payment for order ${orderId} failed`, loggerCtx);
        response.send('Ok');
        return;
      }
  
      if (status !== 'completed') {
        Logger.info(`Received ${status} status update for order ${orderId}`, loggerCtx);
        return;
      }
  
      const paymentMethod = await this.getPaymentMethod(ctx);

      const addPaymentToOrderResult = await this.orderService.addPaymentToOrder(ctx, orderId, {
        method: paymentMethod.code,
        metadata: {
          paymentId: id,
          paymentAmountReceived: amount,
        },
      });
  
      if (!(addPaymentToOrderResult instanceof Order)) {
        Logger.error(
          `Error adding payment to order ${orderId}: ${addPaymentToOrderResult.message}`,
          loggerCtx,
        );
        return;
      }
  
      // The payment intent ID is added to the order only if we can reach this point.
      Logger.info(
        `Payment id ${id} added to order ${orderId}`,
        loggerCtx,
      );
    })

    // Send the response status only if we didn't sent anything yet.
    if (!response.headersSent) {
      response.status(HttpStatus.OK).send('Ok');
    }
  }

  private async createContext(channelToken: string, req: RequestWithRawBody): Promise<RequestContext> {
    return this.requestContextService.create({
      apiType: 'admin',
      channelOrToken: channelToken,
      req,
      languageCode: LanguageCode.en,
    });
  }

  private async getPaymentMethod(ctx: RequestContext): Promise<PaymentMethod> {
    const method = (await this.paymentMethodService.findAll(ctx)).items.find(
      m => m.handler.code === 'code',
    );

    if (!method) {
      throw new InternalServerError(`[${loggerCtx}] Could not find Konnect PaymentMethod`);
    }

    return method;
  }
}