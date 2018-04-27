import { RedditBot } from './RedditBot';
import { GTMBot } from './GTMBot'
import * as scheduler from 'node-cron'
import { GoogleImageSearcher } from './GoogleImageSearcher';
import { Logger } from './Logger';

let bot = new GTMBot(new RedditBot())
const logger = new Logger().getLogger()

if(process.argv.indexOf("once") > -1) {
    bot = new GTMBot(new RedditBot(undefined, true))
    logger.enableConsoleLogging('debug')
    bot.processComments(logger)
} else if(process.argv.indexOf("readonly") > -1) {
    bot = new GTMBot(new RedditBot(undefined, true))
    logger.enableConsoleLogging('info')
    startTask(() => {
        bot.processComments(logger)
    })
} else {
    startTask(() => {
        bot.processComments(logger)
    })
}

function startTask(task) {
    scheduler.schedule("*/1 * * * *", task)
}
