import * as fs from 'fs';
import * as Mustache from 'mustache';
import * as path from 'path';
import { Logger } from "./Logger";
import { Comment } from "snoowrap";
import { RedditBot } from "./RedditBot";
import { ScoreProcessor, WinType } from "./ScoreProcessor"

export class ModCommandProcessor {
    bot: RedditBot;
    config: object;
    logger: any

    constructor(bot, config, logger = Logger.safeLogger()) {
        this.bot = bot
        this.config = config
        this.logger = logger
    }

    // This seems super sketchy but I kind of like it?
    // Also too over-engineered for what it's doing but it's expandable for future.
    async processCommand(comment: Comment, command: Command) {
        if(this[command]) return await this[command](comment)
    }

    reportsToCommands(comment: Comment) {
        const reports = comment.mod_reports || []
        const commands: Command[] = []
        reports.forEach(report => {
            const command = this.getCommand(report[0])
            if(command && !commands.includes(command)) commands.push(command)
        })

        return commands
    }

    getCommand(report) {
        report = report ? report.toLowerCase() : ''
        if(report.includes('gis')) return Command.CORRECT_GIS
        if(report.includes('correct')) return Command.CONFIRM
    }

    async correctGISError(comment, scoreProcessor?: ScoreProcessor) {
        this.logger.info(`GIS correction requested for this post, updating points`)
        const confirmationComment: any = await this.bot.getParentComment(comment)
        const submitter = await confirmationComment.author.name
        const guessComment = await this.bot.getParentComment(confirmationComment)
        const guesser = await guessComment.author.name
        scoreProcessor = scoreProcessor || new ScoreProcessor(this.bot, this.config, this.logger)
        await scoreProcessor.correctGIS(comment, guesser, submitter)

        const replyTemplate = fs.readFileSync(path.resolve(__dirname, `../${this.config['replyTemplate']}`), "UTF-8")
        const templateValues = {
            guesser,
            guesser_points: await scoreProcessor.winTypeToPoints(WinType.GUESSER, false),
            poster: submitter,
            poster_points: await scoreProcessor.winTypeToPoints(WinType.SUBMITTER, false),
            subreddit: (this.config as any).subreddit
        }

        const updatedReply = Mustache.render(replyTemplate, templateValues)

        if(!this.bot.readonly) {
            comment.edit(updatedReply)
        }

        this.bot.removeReports(comment)

        return true
    }
}

export enum Command {
    CORRECT_GIS = 'correctGISError',
    CONFIRM = 'confirm'
}