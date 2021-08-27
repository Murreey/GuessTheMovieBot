import fs from 'fs'
import path from 'path'

import DatabaseManager from '../src/scores/DatabaseManager'

(async () => {
    const scoreDir = path.resolve(__dirname, '../scores')
    const scores: {
        [username: string]: {
            total: number, guesses: number, submissions: number
        }
    } = fs
        .readdirSync(scoreDir)
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
                    if(scores.total > (allScores[user]?.total || 0)) {
                        allScores[user].total = scores.total
                    }
                }
            }

            return allScores
        }, {})

    const db = await DatabaseManager()

    for(const user in scores) {
       const score = scores[user]
       console.log(`Importing ${user}...`)
       const userID = await db.getUserID(user)
       await db.db.run(`INSERT OR IGNORE INTO legacy_imports (user_id, points, guesses, submissions) VALUES (?, ?, ?, ?)`, userID, score.total, score.guesses, score.submissions)
    }
})()