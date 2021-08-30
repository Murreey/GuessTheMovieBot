import fs from 'fs'
import path from 'path'

import DatabaseManager from '../src/scores/DatabaseManager'

(async () => {
    const scoreDir = path.resolve(__dirname, '../scores')
    const months = 'janfebmaraprmayjunjulaugsepoctnovdec'.match(/.{3}/g)
    const scores: {
        [username: string]: {
            total: number, guesses: number, submissions: number
        }
    } = fs
        .readdirSync(scoreDir)
        .filter(file => /^\d{4}-[a-z]{3}/.test(file))
        .sort((a, b) => {
            const [x, y] = [a, b].map(x => x.split('.')?.[0]?.split('-'))
            return parseInt(x[0]) - parseInt(y[0]) || months.indexOf(x[1]) - months.indexOf(y[1])
        })
        .map(file => JSON.parse(fs.readFileSync(path.resolve(scoreDir, file), 'utf-8')))
        .reduce((allScores, fileData) => {
            for(const user in fileData) {
                const scores = fileData[user]
                if(!allScores[user]) {
                    allScores[user] = {
                        points: 0,
                        guesses: 0,
                        submissions: 0,
                        ...scores
                    }
                } else {
                    allScores[user].guesses = (allScores[user]?.guesses || 0) + (scores.guesses || 0)
                    allScores[user].submissions = (allScores[user]?.submissions || 0) + (scores.submissions || 0)
                    allScores[user].total = scores?.total || 0
                }
            }

            return allScores
        }, {})

    const db = await DatabaseManager()

    for(const user in scores) {
       const score = scores[user]
       console.log(`Importing ${user}...`)
       const userID = await db.getUserID(user)
       await db.db.run(`INSERT OR REPLACE INTO legacy_imports (user_id, points, guesses, submissions) VALUES (?, ?, ?, ?)`, userID, score.total, score.guesses, score.submissions)
    }
})()