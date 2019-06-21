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

    async correctGIS(guesser: string, submitter: string, foundOnGoogle: boolean) {
        this.logger.verbose(`- Guesser ${guesser} has ${await this.bot.getUserPoints(guesser)}`)
        this.logger.verbose(`- Submitter ${submitter} has ${await this.bot.getUserPoints(submitter)}`)
        const guesserCorrection = this.winTypeToPoints(WinType.GUESSER, foundOnGoogle) - this.winTypeToPoints(WinType.GUESSER, !foundOnGoogle)
        const submitterCorrection = this.winTypeToPoints(WinType.SUBMITTER, foundOnGoogle) - this.winTypeToPoints(WinType.SUBMITTER, !foundOnGoogle)
        this.logger.verbose(`- Correction required is: `)
        this.logger.verbose(`- Guesser gets ${guesserCorrection} points`)
        this.logger.verbose(`- Submitter gets ${submitterCorrection} points`)
        await this.addPoints(guesser, guesserCorrection)
        await this.addPoints(submitter, submitterCorrection)

        return true
    }

    async addPoints(username: string, points: number) {
        const currentPoints = await this.bot.getUserPoints(username)
        let newPoints = currentPoints + points
        if(newPoints < 0) {
            newPoints = 0
        }
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