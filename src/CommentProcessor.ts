import { Comment, Submission } from 'snoowrap';
import { Logger } from './Logger';
import { ModCommandProcessor } from './ModCommandProcessor';
import { WinValidator } from './WinValidator';

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

        if(await this.reportedComment.author.name === this.config['bot_username']) {
            const reports = this.reportedComment.mod_reports
            const modCommandProcessor = new ModCommandProcessor(this.bot, this.config, this.logger)
            reports.forEach(report => modCommandProcessor.processReport(this.reportedComment, report))
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