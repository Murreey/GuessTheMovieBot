import { Logger, LogLevel } from './Logger';
import * as RedditBot from './RedditBot';
import WinChecker from './WinChecker';
import processWin from './WinProcessor'

const bot = RedditBot.create({ debug: true, readOnly: true, startFrom: "t1_gobjgub" })
Logger.setup({ file: null, console: LogLevel.SILLY })

bot.fetchNewConfirmations().then(comments => {
  [comments[0]].forEach(async comment => {
    const valid = await WinChecker(bot).isValidWin(comment)
    console.log(`${comment.author.name}: ${comment.body.substr(0, 10)} (${comment.permalink})`)
    console.log(`- valid: ${valid}`)
    await processWin(bot, comment)
  })
})