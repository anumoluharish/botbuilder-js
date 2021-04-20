// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import assert from 'assert';
import { BotComponent } from 'botbuilder';
import { functionalBotComponent } from '../src/functionalBotComponent';

describe('functionalBotComponent', function () {
    it('creates a BotComponent', function () {
        const Constructor = functionalBotComponent((_services, _configuration) => {
            // no-op
        });

        const instance = new Constructor();

        assert(instance instanceof BotComponent);
    });
});
