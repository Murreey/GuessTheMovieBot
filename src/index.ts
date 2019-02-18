import * as scheduler from 'node-cron';
import { GTMBot } from './GTMBot';
import { Logger } from './Logger';
import { RedditBot } from './RedditBot';

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
