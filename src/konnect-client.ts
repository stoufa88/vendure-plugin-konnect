export class VendureKonnectClient {
  constructor(public apiKey: string, public receiverWalletId: string) {
    this.apiKey = apiKey;
    this.receiverWalletId = receiverWalletId;
  }
}
