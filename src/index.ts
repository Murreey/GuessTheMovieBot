import * as scheduler from 'node-cron';
import { GTMBot } from './GTMBot';
import { Logger } from './Logger';
import { RedditBot } from './RedditBot';
import { ConfigLoader } from './ConfigLoader';

const logger = new Logger().getLogger()
const config = new ConfigLoader(logger).getConfig()
let bot = new GTMBot(new RedditBot(config), config)


if(process.argv.indexOf("once") > -1) {
    bot = new GTMBot(new RedditBot(config, undefined, true), config)
    logger.enableConsoleLogging('silly')
    bot.processComments(logger)
} else if(process.argv.indexOf("readonly") > -1) {
    bot = new GTMBot(new RedditBot(config, undefined, true), config)
    logger.enableConsoleLogging('silly')
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
