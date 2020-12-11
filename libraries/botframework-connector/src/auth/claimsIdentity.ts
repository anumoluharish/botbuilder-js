/**
 * @module botframework-connector
 */
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { assert, Assertion } from 'botbuilder-stdlib';

/**
 * Represents a claim.
 */
export interface Claim {
    readonly type: string;
    readonly value: string;
}

/**
 * Represents a claims-based identity.
 */
export class ClaimsIdentity {
    static assert: Assertion<ClaimsIdentity> = assert.instanceOf('ClaimsIdentity', ClaimsIdentity);
    static isType = assert.toTest(ClaimsIdentity.assert);

    /**
     * Initializes a new instance of the [ClaimsIdentity](xref:botframework-connector.ClaimsIdentity) class.
     *
     * @param {Claim[]} claims An array of [Claim](xref:botframework-connector.Claim).
     * @param {string | boolean} authenticationType The type of auth for this set of claims, or boolean to override isAuthenticated
     */
    constructor(public readonly claims: Claim[], private readonly authenticationType?: string | boolean) {}

    public get isAuthenticated(): boolean {
        if (typeof this.authenticationType === 'boolean') {
            return this.authenticationType;
        }

        return this.authenticationType != null;
    }

    /**
     * Returns a claim value (if its present)
     * @param  {string} claimType The claim type to look for
     * @returns {string|null} The claim value or null if not found
     */
    public getClaimValue(claimType: string): string | null {
        const claim = this.claims.find((c) => c.type === claimType);

        return claim?.value ?? null;
    }
}
