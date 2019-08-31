import * as fs from 'fs';
import * as Mustache from 'mustache';
import * as path from 'path';
import { Logger } from './Logger';
import { ScoreProcessor } from './ScoreProcessor';
import { RedditBot } from './RedditBot';

export class ScoreboardCreator {
    bot: RedditBot
    config: any
    logger: any

    constructor(bot, config, logger = Logger.safeLogger()) {
        this.bot = bot
        this.config = config
        this.logger = logger
    }

    createScoreboard(): ScoreboardData {
        const rawScores = this.getScores()
        const scores = this.sortScores(rawScores)
        scores.month = new Date().toLocaleString('en-GB', { month: 'long' })
        scores.year = new Date().toLocaleString('en-GB', { year: 'numeric' })
        return scores
    }

    postScoreboard(scoreboard: ScoreboardData) {
        const postTemplate
         = fs.readFileSync(path.resolve(__dirname, `../templates/scoreboard_template.md`), "UTF-8")
        const title = `/r/GuessTheMovie ${scoreboard.month} ${scoreboard.year} Leaderboard`
        const body = Mustache.render(postTemplate
            , scoreboard)
        this.bot.makePost({
            title,
            body,
            sticky: true
        })
    }

    sortScores(rawScores): ScoreboardData {
        const players = Object.keys(rawScores).map(key => ({ username: key, scores: rawScores[key] }))
        const scoreType = ['points', 'guesses', 'submissions']

        const scores: ScoreboardData = {}
        for(let type of scoreType) {
            const sorted = [...players]
                .filter(player => player.scores[type])
                .sort((a, b) => b.scores[type] - a.scores[type])
                .map(player => ({ username: player.username, score: player.scores[type] }))
                .slice(0, 5)

            scores[type] = sorted
        }

        return scores;
    }

    // Only creates for current month atm
    getScores() {
        const scoreProcessor = new ScoreProcessor(this.bot, this.config, this.logger)
        return scoreProcessor.getScoreFile()
    }

}

interface ScoreboardData {
    points?: Score[]
    guesses?: Score[]
    submissions?: Score[]
    month?: String
    year?: String
}

interface Score {
    username: String,
    score: number
}