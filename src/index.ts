import * as Bluebird from 'bluebird'
import { RedditBot } from './RedditBot';
import { GTMBot } from './GTMBot'
import * as scheduler from 'node-cron'

const bot = new GTMBot(new RedditBot())

if(process.argv.indexOf("once") > -1) {
    bot.processComments()
} else {
    scheduler.schedule("*/1 * * * *", () => {
        bot.processComments()
    })
}

