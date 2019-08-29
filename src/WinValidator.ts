import * as fs from 'fs';
import * as Mustache from 'mustache';
import * as path from 'path';
import { Comment, Submission } from 'snoowrap';
import { FlairTemplate } from 'snoowrap/dist/objects/Subreddit';
import { GoogleImageSearcher } from './GoogleImageSearcher';
import { Logger } from './Logger';
import { ScoreProcessor, WinType } from './ScoreProcessor';
import { Command } from './ModCommandProcessor';

export class WinValidator {
    bot: any
    config: Object
    logger: any
    guesserComment: Comment
    submitterConfirmationComment: Comment
    submission: Submission

    points

    constructor(bot, config, logger = Logger.safeLogger()) {
        this.bot = bot
        this.config = config
        this.logger = logger
    }

    async checkCommentIsValidWin(comment: any, commands: Command[] = []): Promise<boolean> {
        this.submission =  await this.bot.getPostFromComment(comment)

        if(await this.submission.is_self) {
            const body = await this.submission.selftext
            const trimmed = body && body.toLowerCase().replace('&#x200b;', '').trim()
            const isImageUrl = /^(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|jpeg|gif|png)$/i.test(trimmed)

            if(!isImageUrl) {
                this.logger.verbose(`'${comment.body}' rejected as it's on a self post`)
                return false
            }

            this.logger.verbose(`'${comment.body}' is a self post but looks like an image URL`)
            this.submission.url = trimmed
        }

        if(await this.submission.author.name === '[deleted]') {
            this.logger.verbose(`'${comment.body}' rejected as the submitter has deleted their account.`)
            return false
        }

        if(await this.submission.author.id === await comment.author.id) {
            this.logger.verbose(`'${comment.body}' rejected as it was posted by the OP`)
            return false
        }

        const currentFlair: string = await this.submission.link_flair_text
        if(currentFlair && (currentFlair.toLowerCase().includes("identified") || currentFlair.toLowerCase().includes("meta"))) {
            this.logger.verbose(`'${comment.body}' rejected as the post has '${currentFlair}' flair`)
            return false
        }

        // Temporarily ignoring this step -
        // expandReplies() in snoowrap appears to be broken so getAllRepliers isn't working
        // Isn't super critical, almost all posts should be caught before as if the bot's already replied it will identified flair
        // const repliers = await this.bot.getAllRepliers(this.submission)
        // if(repliers.indexOf(this.config['bot_username']) > -1) {
        //     this.logger.verbose(`'${comment.body}' rejected as the bot has already replied to that post`)
        //     return false
        // }

        const opReplies = await this.bot.getOPReplies(comment, this.submission)
        if(opReplies.length === 0) {
            this.logger.verbose(`'${comment.body}' rejected as OP hasn't replied`)
            return false
        }

        const opConfirmationComments = opReplies.filter((comment) => this.commentContainsConfirmation(comment.body))
        if(opConfirmationComments.length === 0) {
            if(!commands.includes(Command.CONFIRM)) {
                this.logger.verbose(`'${comment.body}' rejected as OP's replies are not confirmations`)
                return false
            }

            this.logger.verbose(`'${comment.body}' has no confirmation from OP, but a mod has confirmed the guess`)
        }

        const guesser = await comment.author
        if(currentFlair && currentFlair.toLowerCase().includes("easy") && await this.bot.getUserPoints(guesser.name) > 10) {
            this.logger.verbose(`'${comment.body}' rejected as the post is easy and commenter /u/${guesser.name} has > 10 points`)
            return false
        }

        this.submitterConfirmationComment = opReplies[0]

        return true
    }

    commentContainsConfirmation(comment: string) {
        return /\b(yes|yep|correct)\b/i.test(comment)
    }

    async processWin(comment: Comment): Promise<boolean> {
        const guesser = await comment.author.name
        const submitter = await this.submission.author.name

        this.logger.info(`'${await this.submission.title}' confirmed as '${comment.body}'! (https://redd.it/${await this.submission.id}/)`)
        this.logger.info(`- winner is ${guesser}`)
        this.logger.info(`- submitter is ${submitter}`)

        this.logger.verbose(`Adding identified flair...`)
        this.addIdentifiedFlair(this.submission)

        const foundOnGoogle = await new GoogleImageSearcher().foundImageResults(await this.submission.url)
        if(foundOnGoogle) {
            this.logger.info(`- was found on Google Image Search!`)
        }

        this.logger.verbose(`Awarding points...`)
        const scoreProcessor = new ScoreProcessor(this.bot, this.config, this.logger)
        await scoreProcessor.processWin(guesser, WinType.GUESSER, foundOnGoogle)
        await scoreProcessor.processWin(submitter, WinType.SUBMITTER, foundOnGoogle)

        this.logger.verbose(`Replying with bot message...`)
        this.replyWithBotMessage(foundOnGoogle, this.submitterConfirmationComment, guesser, submitter)

        this.bot.removeReports(comment)

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

        if(flairTemplate && !this.bot.readonly) {
            post.selectFlair(flairTemplate)
        }
    }

    async replyWithBotMessage(foundOnGoogle: boolean, opComment: any, guesser: string, submitter: string) {
        const replyTemplate = fs.readFileSync(path.resolve(__dirname, `../templates/${this.config['replyTemplate']}`), "UTF-8")
        const templateValues = {
            guesser,
            guesser_points: await new ScoreProcessor(this.bot, this.config, this.logger).winTypeToPoints(WinType.GUESSER, foundOnGoogle),
            poster: submitter,
            poster_points: await new ScoreProcessor(this.bot, this.config, this.logger).winTypeToPoints(WinType.SUBMITTER, foundOnGoogle),
            subreddit: (this.config as any).subreddit
        }

        const reply = Mustache.render(replyTemplate, templateValues)

        if(!this.bot.readonly) {
            const postedComment: Comment = await opComment.reply(reply) as Comment
            if(postedComment) postedComment.distinguish()
        }
    }
}