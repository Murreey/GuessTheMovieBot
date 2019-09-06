import * as fs from 'fs';
import * as Mustache from 'mustache';
import * as path from 'path';
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

        const scores = this.getScoreFile()
        const typeString = type === WinType.GUESSER ? 'guesses' : 'submissions'
        if(!scores[username]) scores[username] = {}
        if(!scores[username][typeString]) scores[username][typeString] = 0
        scores[username][typeString]++
        this.saveScoreFile(scores)
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
        const scores = this.getScoreFile()
        if(!scores[username]) scores[username] = {}
        if(!scores[username].points) scores[username].points = 0
        if(!scores[username].points) scores[username].total = 0
        scores[username].points += points
        scores[username].total = currentPoints + points
        this.saveScoreFile(scores)
        this.logger.verbose(`Added ${points} to ${username} - had ${currentPoints}, now has ${currentPoints + points} (css class ${this.getCssClass(newPoints)})`)
    }

    getScoreFileName(fileDate?: number) {
        // fileDate allows you to update scores for a specific month based on a timestamp.
        // Not used for now - will default to the date the bot gave the points.
        const date = fileDate ? new Date(fileDate) : new Date()
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        const path = './scores/'
        if(!fs.existsSync(path)) {
            fs.mkdirSync(path)
        }
        return `${path}${date.getUTCFullYear()}-${months[date.getUTCMonth()]}.json`
    }

    getScoreFile(fileDate?: number) {
        const file = this.getScoreFileName(fileDate)
        if(!fs.existsSync(file)) {
            fs.openSync(file, 'w')
        }
        const data = fs.readFileSync(file, "utf8")
        return data ? JSON.parse(data) : {}
    }

    saveScoreFile(scores, fileDate?: number) {
        const file = this.getScoreFileName(fileDate)
        if(!fs.existsSync(file)) {
            fs.openSync(file, 'w')
        }
        fs.writeFileSync(file, JSON.stringify(scores, null, 2))
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

    generateScoreComment(postID: string, guesser: string, submitter: string, foundOnGoogle: boolean): string {
        const replyTemplate = fs.readFileSync(path.resolve(__dirname, `../templates/${this.config['replyTemplate']}`), "UTF-8")
        const templateValues = {
            postID,
            guesser,
            guesser_points: this.winTypeToPoints(WinType.GUESSER, foundOnGoogle),
            poster: submitter,
            poster_points: this.winTypeToPoints(WinType.SUBMITTER, foundOnGoogle),
            subreddit: (this.config as any).subreddit,
            foundOnGoogle
        }

        return Mustache.render(replyTemplate, templateValues)
    }
}

export enum WinType {
    GUESSER,
    SUBMITTER
}