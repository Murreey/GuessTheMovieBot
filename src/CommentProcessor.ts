import { Comment, Submission, ReplyableContent } from 'snoowrap';
import { FlairTemplate } from 'snoowrap/dist/objects/Subreddit';
import { RedditBot } from './RedditBot'
import * as fs from 'fs'
import * as path from 'path'
import * as Mustache from 'mustache'
import { GoogleImageSearcher } from './GoogleImageSearcher';
import { Logger } from './Logger'

export class CommentProcessor {
    bot: RedditBot
    config: Object
    logger: any
    guesserComment: Comment
    submitterConfirmationComment: Comment

    points

    constructor(bot, config?, logger = Logger.safeLogger()) {
        this.bot = bot
        this.logger = logger
        if(config) {
            this.config = config
        } else {
            this.config = require('../config.json')
        }

        this.points =  {
            winner: {
                normal: 6,
                google: 2
            },
            submitter: {
                normal: 3,
                google: 1
            }
        }
    }

    async processComment(comment: Comment): Promise<boolean> {
        this.guesserComment = comment
        this.logger.verbose(`Processing comment '${this.guesserComment.body}'`)
        if(await this.checkCommentIsValidWin(this.guesserComment)) {
            this.logger.verbose(`${this.guesserComment.body} is a valid win!`)
            return this.processWin(this.guesserComment)
        }

        return false
    }

    async checkCommentIsValidWin(comment: Comment): Promise<boolean> {
        const submission = await this.bot.getPostFromComment(comment)
        if(await submission.is_self) {
            this.logger.verbose(`'${comment.body}' rejected as it's on a self post`)
            return false
        }

        const currentFlair: string = await submission.link_flair_text
        if(currentFlair && (currentFlair.toLowerCase().includes("identified") || currentFlair.toLowerCase().includes("meta"))) {
            this.logger.verbose(`'${comment.body}' rejected as the post has '${currentFlair}' flair`)
            return false
        }

        const repliers = await this.bot.getAllRepliers(await this.bot.getPostFromComment(comment))
        if(repliers.indexOf(this.config['bot_username']) > -1) {
            this.logger.verbose(`'${comment.body}' rejected as the bot has already replied to that post`)
            return false
        }

        const opReplies = await this.bot.getOPReplies(comment)
        if(opReplies.length === 0) {
            this.logger.verbose(`'${comment.body}' rejected as OP hasn't replied`)
            return false
        }

        const opConfirmationComments = opReplies.filter((comment) => this.commentContainsConfirmation(comment.body))
        if(opConfirmationComments.length === 0) {
            this.logger.verbose(`'${comment.body}' rejected as OP's replies are not confirmations`)
            return false
        }

        const guesser = await comment.author
        if(await opConfirmationComments[0].author.id === guesser.id) {
            this.logger.verbose(`'${comment.body}' rejected as the commenter is the post submitter`)
            return false
        }

        if(currentFlair && currentFlair.toLowerCase().includes("easy") && await this.bot.getUserPoints(guesser.name) >= 10) {
            this.logger.verbose(`'${comment.body}' rejected as the post is easy and commenter /u/${guesser.name} has >= 10 points`)
            return false
        }

        this.submitterConfirmationComment = opConfirmationComments[0]

        return true
    }

    commentContainsConfirmation(comment: string) {
        return /\byes\b/i.test(comment)
    }
    
    async processWin(comment: Comment): Promise<boolean> {
        const winner = await comment.author.name

        const post: Submission = await this.bot.getPostFromComment(comment)
        const submitter = await post.author.name

        this.logger.info(`'${comment.body}' has won post '${await post.title}'!`)
        this.logger.info(`- winner is ${winner} (${await this.bot.getUserPoints(winner)} points)`)
        this.logger.info(`- submitter is ${submitter} (${await this.bot.getUserPoints(submitter)} points)`)

        this.logger.verbose(`Adding identified flair...`)
        this.addIdentifiedFlair(post)

        const foundOnGoogle = await new GoogleImageSearcher().foundImageResults(await post.url)
        if(foundOnGoogle) {
            this.logger.info(`- was found on Google Image Search!`)
        }

        this.replyWithBotMessage(foundOnGoogle, this.submitterConfirmationComment, comment)
        this.logger.verbose(`Replying with bot message...`)

        this.logger.verbose(`Awarding points...`)
        // TODO: This is messy, will move to a point-distribution class.
        await this.addPoints(winner, this.points['winner'][foundOnGoogle ? 'google' : 'normal'])
        await this.addPoints(submitter, this.points['submitter'][foundOnGoogle ? 'google' : 'normal'])


        // this.bot.removeReports(comment)
        this.logger.info(`- https://redd.it/${await post.id}/`)

        return true
    }

    async addIdentifiedFlair(post: Submission) {
        const currentFlair = await post.link_flair_text

        const flairTypes: FlairTemplate[] = await this.bot.getFlairTypes(await post.id)

        var newFlair = "identified"
        if(currentFlair === "easy") newFlair = newFlair + " + easy"
        if(currentFlair === "hard") newFlair = newFlair + " + hard"

        const flairTemplate = flairTypes.find((template) => {
            return newFlair === template.flair_text
        })

        if(flairTemplate) {  
            post.selectFlair(flairTemplate)
        }
    }

    async addPoints(username: string, points: number) {
        const currentPoints = await this.bot.getUserPoints(username)
        await this.bot.setUserPoints(username, currentPoints + points)
        this.logger.verbose(`Added ${points} to ${username} - had ${currentPoints}, now has ${currentPoints + points}`)
    }

    async replyWithBotMessage(foundOnGoogle: boolean, opComment: Comment, winningComment: Comment) {
        const replyTemplate = fs.readFileSync(path.resolve(__dirname, "../reply_template.md"), "UTF-8")
        const templateValues = {
            guesser: await winningComment.author.name,
            guesser_points: this.points ? this.points['winner'][foundOnGoogle ? 'google' : 'normal']: 6,
            poster: await opComment.author.name,
            poster_points: this.points ? this.points['submitter'][foundOnGoogle ? 'google' : 'normal']: 3,
            subreddit: require('../config.json').subreddit
        }

        const reply = Mustache.render(replyTemplate, templateValues)
        const postedComment: Comment = await opComment.reply(reply) as Comment
        if(postedComment) postedComment.distinguish()
    }
}