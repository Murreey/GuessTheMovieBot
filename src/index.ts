import * as RedditBot from './RedditBot';
import WinChecker from './WinChecker';

const bot = RedditBot.create({ debug: true, startFrom: "t1_gobjgub" })

bot.fetchNewConfirmations().then(comments => {
  comments.forEach(async comment => {
    const valid = await WinChecker(bot).isValidWin(comment)
    console.log(`${comment.author.name}: ${comment.body.substr(0, 10)} (${comment.permalink})`)
    console.log(`- valid: ${valid}`)
  })
})