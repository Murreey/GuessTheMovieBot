import { Logger } from './Logger';
import { RedditBot } from './RedditBot';

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