import * as fs from 'fs';
import * as Mustache from 'mustache';
import * as path from 'path';
import { Logger } from './Logger';
import { RedditBot } from './RedditBot';
import { Comment } from 'snoowrap'

export class ScoreProcessor {
    bot: RedditBot
    config: any
    logger: any

    defaultPoints

    constructor(bot, config, logger = Logger.safeLogger()) {
        this.bot = bot
        this.config = config
        this.logger = logger

        this.defaultPoints =  {
            guesser: {
                normal: 6,
                google: 1
            },
            submitter: {
                normal: 3,
                google: 2
            }
        }
    }

    async processWin(username: string, type: WinType, foundOnGoogle: boolean) {
        const pointsToAward = this.winTypeToPoints(type, foundOnGoogle)
        await this.addPoints(username, pointsToAward)
    }

    // TODO: refactor and make nice
    async correctGIS(botReply: any, guesser: string, submitter: string) {
        this.logger.verbose(`- Guesser ${guesser} has ${await this.bot.getUserPoints(guesser)}`)
        this.logger.verbose(`- Submitter ${submitter} has ${await this.bot.getUserPoints(submitter)}`)
        const guesserCorrection = this.winTypeToPoints(WinType.GUESSER, false) - this.winTypeToPoints(WinType.GUESSER, true)
        const submitterCorrection = this.winTypeToPoints(WinType.SUBMITTER, false) - this.winTypeToPoints(WinType.SUBMITTER, true)
        this.logger.verbose(`- Correction required is: `)
        this.logger.verbose(`- Guesser +${guesserCorrection} points`)
        this.logger.verbose(`- Submitter +${submitterCorrection} points`)
        this.addPoints(guesser, guesserCorrection)
        this.addPoints(guesser, submitterCorrection)

        const replyTemplate = fs.readFileSync(path.resolve(__dirname, "../reply_template_beta.md"), "UTF-8")
        const templateValues = {
            guesser,
            guesser_points: await new ScoreProcessor(this.bot, this.config, this.logger).winTypeToPoints(WinType.GUESSER, false),
            poster: submitter,
            poster_points: await new ScoreProcessor(this.bot, this.config, this.logger).winTypeToPoints(WinType.SUBMITTER, false),
            subreddit: (this.config as any).subreddit
        }

        const updatedReply = Mustache.render(replyTemplate, templateValues)

        if(!this.bot.readonly) {
            botReply.edit(updatedReply)
        }

        this.bot.removeReports(botReply)

        return true
    }

    async addPoints(username: string, points: number) {
        const currentPoints = await this.bot.getUserPoints(username)
        const newPoints = currentPoints + points
        await this.bot.setUserFlair(username, newPoints, this.getCssClass(newPoints))
        this.logger.verbose(`Added ${points} to ${username} - had ${currentPoints}, now has ${currentPoints + points} (css class ${this.getCssClass(newPoints)})`)
    }

    getCssClass(points: number): string {
        const thresholds = [1, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000]
        for(let i = 0; i < thresholds.length; i++) {
            if(points < thresholds[i]) {
                return "points points-" + thresholds[i - 1]
            }
        }
    }

    winTypeToPoints(winType: WinType, foundOnGoogle: boolean): number {
        const type = WinType[winType].toLowerCase() // Converts enum int to lowercase string representation
        const googled = foundOnGoogle ? 'google' : 'normal'

        if(this.config && this.config.points && this.config.points[type] && this.config.points[type][googled]) {
            return this.config.points[type][googled]
        }

        return this.defaultPoints[type][googled]
    }
}

export enum WinType {
    GUESSER,
    SUBMITTER
}