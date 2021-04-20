// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { BotComponent } from 'botbuilder';
import { ServiceCollection, Configuration } from 'botbuilder-dialogs-adaptive-runtime-core';

/**
 * Create a bot component from a simple function
 *
 * @param callback a callback function that handles all Bot Component registrations and logic
 * @returns an anonymous BotComponent class constructor
 */
export function functionalBotComponent(
    callback: (services: ServiceCollection, configuration: Configuration) => void
): new () => BotComponent {
    return class extends BotComponent {
        configureServices(services: ServiceCollection, configuration: Configuration): void {
            callback(services, configuration);
        }
    };
}
