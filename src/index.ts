import { RedditBot } from './RedditBot';
import { GTMBot } from './GTMBot'
import * as scheduler from 'node-cron'
import { GoogleImageSearcher } from './GoogleImageSearcher';
import { Logger } from './Logger';

const bot = new GTMBot(new RedditBot())
const logger = new Logger().getLogger()

if(process.argv.indexOf("once") > -1) {
    logger.enableConsoleLogging('debug')
    bot.processComments(logger)
} else {
    scheduler.schedule("*/1 * * * *", () => {
        bot.processComments(logger)
    })
}

