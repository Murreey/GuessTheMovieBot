import * as fs from 'fs';
import * as Mustache from 'mustache';
import * as path from 'path';
import { Comment, Submission } from 'snoowrap';
import { FlairTemplate } from 'snoowrap/dist/objects/Subreddit';
import { GoogleImageSearcher } from './GoogleImageSearcher';
import { Logger } from './Logger';
import { ScoreProcessor, WinType } from './ScoreProcessor';
import { WinValidator } from './WinValidator'

export class CommentProcessor {
    bot: any
    config: Object
    logger: any
    reportedComment: Comment
    submitterConfirmationComment: Comment
    submission: Submission

    points

    constructor(bot, config, logger = Logger.safeLogger()) {
        this.bot = bot
        this.config = config
        this.logger = logger
    }

    async processComment(comment: Comment): Promise<boolean> {
        this.reportedComment = comment
        this.submission = await this.bot.getPostFromComment(this.reportedComment)
        this.logger.verbose(`* Processing https://redd.it/${await this.submission.id}/ - '${this.reportedComment.body.substr(0, 50)}'`)

        // TODO: Refactor this nicely, move logic to better places
        if(await this.reportedComment.author.name === this.config['bot_username']) {
            const reports = this.reportedComment.mod_reports
            for(let report of reports) {
                const reason = report[0].toLowerCase()
                if(reason.includes('gis')) {
                    this.logger.info(`GIS correction requested for this post, updating points`)
                    const confirmationComment: Comment = await this.bot.getParentComment(this.reportedComment)
                    const submitter = await confirmationComment.author.name
                    const guessComment =  await this.bot.getParentComment(confirmationComment)
                    const guesser = await guessComment.author.name
                    new ScoreProcessor(this.bot, this.config, this.logger).correctGIS(this.reportedComment, guesser, submitter)
                }
            }
            return true
        }

        const winValidator = new WinValidator(this.bot, this.config, this.logger)
        if(await winValidator.checkCommentIsValidWin(this.reportedComment)) {
            this.logger.verbose(`${this.reportedComment.body} is a valid win!`)
            return winValidator.processWin(this.reportedComment)
        }

        return false
    }
}