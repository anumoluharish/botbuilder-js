// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { config } from 'dotenv';
import * as path from 'path';
import * as restify from 'restify';

// Import required bot services. See https://aka.ms/bot-services to learn more about the different parts of a bot.
import { BotFrameworkAdapter } from 'botbuilder';

import { IntegrationBot } from './integrationBot';

// Set up Nock
import * as nockHelper from './../src/nock-helper/nock-helper';

nockHelper.nockHttp('integrationBot')


// Note: Ensure you have a .env file and include MicrosoftAppId and MicrosoftAppPassword.
const ENV_FILE = path.join(__dirname, '..', '.env');
config({ path: ENV_FILE });

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about adapters.
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    console.error('[onTurnError]:');
    console.error(error);
    // Send a message to the user
    await context.sendActivity(`Oops. Something went wrong in the bot!\n  ${error.message}`);
};

const activityIds: string[] = [];

// Create the bot.
const myBot = new IntegrationBot(activityIds);

if (nockHelper.isRecording()) {

    // Create HTTP server.
    const server = restify.createServer();
    server.listen(process.env.port || process.env.PORT || 3978, () => {
        console.log(`\n${ server.name } listening to ${ server.url }`);
        console.log(`\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator`);
    });

    // Listen for incoming requests.
    server.post('/api/messages', (req, res) => {
        adapter.processActivity(req, res, async (context) => {
            if (req.body.text == 'exit') {
                //graceful shutdown
                nockHelper.gitSaveRecordings();
                process.exit();
            }
            nockHelper.logRequest(req, 'integrationBot');

            // Route to bot
            await myBot.run(context);
        });
    });
}
else if (nockHelper.isPlaying()) {
    nockHelper.processRecordings('integrationBot', adapter, myBot);
}
else if (nockHelper.isProxyHost()) {
    // Create HTTP proxy server.
    nockHelper.proxyRecordings();
}
else if (nockHelper.isProxyPlay()) {
    nockHelper.proxyPlay(myBot);
}
