import type { Request } from 'express';

/**
 * @description
 * Configuration options for the Konnect payments plugin.
 *
 * @docsCategory core plugins/KonnectPlugin
 * @docsPage KonnectPlugin
 */
export interface KonnectPluginOptions {
    /**
     * @description
     * Add me please
     * @default ''
     */
    baseUrl?: string;
}

export interface RequestWithRawBody extends Request {
    rawBody: Buffer;
}
