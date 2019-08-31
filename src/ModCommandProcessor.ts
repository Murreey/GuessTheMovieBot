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
        const confirmationComment: Comment = await this.bot.getParentComment(comment)
        const submitter = await confirmationComment.author.name
        const guessComment = await this.bot.getParentComment(confirmationComment)
        const guesser = await guessComment.author.name

        const body = await comment.body
        let guesserOldPoints
        try {
            guesserOldPoints = parseInt((/\[\+(\d)]\(\/\/ "green"\)/i).exec(body)[1])
        } catch {
            this.logger.error("Couldn't get old points from previous score comment. Check the formatting?")
            this.logger.verbose('Bot comment was:')
            this.logger.verbose(body)
            return false
        }

        scoreProcessor = scoreProcessor || new ScoreProcessor(this.bot, this.config, this.logger)
        // Figure out if the existing comment is giving full points (not found) or half points (found on google)
        // Whatever the previous Google find was, we're inverting that to either give or dock points
        const previouslyMarkedAsFound = guesserOldPoints === await scoreProcessor.winTypeToPoints(WinType.GUESSER, true)
        this.logger.verbose(`Checking if original bot comment detected the image on Google:`)
        this.logger.verbose(`${previouslyMarkedAsFound ? 'It did! Giving extra points to correct error.' : 'Nope! Docking points.'}`)
        await scoreProcessor.correctGIS(guesser, submitter, !previouslyMarkedAsFound)

        const replyTemplate = fs.readFileSync(path.resolve(__dirname, `../templates/${this.config['replyTemplate']}`), "UTF-8")
        const templateValues = {
            guesser,
            guesser_points: await scoreProcessor.winTypeToPoints(WinType.GUESSER, !previouslyMarkedAsFound),
            poster: submitter,
            poster_points: await scoreProcessor.winTypeToPoints(WinType.SUBMITTER, !previouslyMarkedAsFound),
            subreddit: (this.config as any).subreddit,
            foundOnGoogle: !previouslyMarkedAsFound
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