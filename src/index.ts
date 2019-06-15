import * as scheduler from 'node-cron';
import { GTMBot } from './GTMBot';
import { Logger } from './Logger';
import { RedditBot } from './RedditBot';
import { ConfigLoader } from './ConfigLoader';

const logger = new Logger().getLogger()
const config = new ConfigLoader(logger).getConfig()
let redditBot = new RedditBot(config)

const runOnce = process.argv.indexOf("once") > -1
const readOnly = process.argv.indexOf("readonly") > -1

if(readOnly) {
    redditBot = new RedditBot(config, undefined, true)
    logger.enableConsoleLogging('silly')
}

let gtmBot = new GTMBot(redditBot, config)

if(runOnce) {
    logger.enableConsoleLogging('silly')
    gtmBot.processComments(logger, true)
} else {
    logger.enableConsoleLogging('info')
    scheduler.schedule("*/1 * * * *", () => {
        gtmBot.processComments(logger)
    })
}
