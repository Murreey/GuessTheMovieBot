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
    guesserComment: Comment
    submitterConfirmationComment: Comment
    submission: Submission

    points

    constructor(bot, config, logger = Logger.safeLogger()) {
        this.bot = bot
        this.config = config
        this.logger = logger
    }

    async processComment(comment: Comment): Promise<boolean> {
        this.guesserComment = comment
        this.submission = await this.bot.getPostFromComment(this.guesserComment)
        this.logger.verbose(`* Processing https://redd.it/${await this.submission.id}/ - '${this.guesserComment.body.substr(0, 50)}'`)

        const winValidator = new WinValidator(this.bot, this.config, this.logger)
        if(await winValidator.checkCommentIsValidWin(this.guesserComment)) {
            this.logger.verbose(`${this.guesserComment.body} is a valid win!`)
            return winValidator.processWin(this.guesserComment)
        }

        return false
    }
}