import * as scheduler from 'node-cron';
import { GTMBot } from './GTMBot';
import { Logger } from './Logger';
import { RedditBot } from './RedditBot';
import { ConfigLoader } from './ConfigLoader';
import { ScoreboardCreator } from './ScoreboardCreator';

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

if(process.argv.indexOf("scoreboard") > -1) {
    const scoreboardCreator = new ScoreboardCreator(redditBot, config, logger)
    const scoreboard = scoreboardCreator.createScoreboard()
    scoreboardCreator.postScoreboard(scoreboard)
} else if(runOnce) {
    logger.enableConsoleLogging('silly')
    gtmBot.processComments(logger, true)
} else {
    logger.enableConsoleLogging('info')
    scheduler.schedule("*/1 * * * *", () => {
        gtmBot.processComments(logger)
    })

    scheduler.schedule("1 0 1 * *", () => {
        const scoreboardCreator = new ScoreboardCreator(redditBot, config, logger)
        const yesterday = new Date(new Date().setDate(new Date().getDate() - 1))
        logger.info(`* Publishing scoreboard for ${yesterday.toLocaleString('en-GB', { month: 'long', year: 'numeric' })}!`)
        const scoreboard = scoreboardCreator.createScoreboard(yesterday)
        scoreboardCreator.postScoreboard(scoreboard)
    })
}
