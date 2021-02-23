import fs from 'fs'

export default () => {
  const fileName = getFileName()

  const getScoreData = (): ScoreData => {
    if(!fs.existsSync(fileName)) fs.openSync(fileName, 'w')
    const data = fs.readFileSync(fileName, "utf8")
    return JSON.parse(data) ?? {}
  }

  const initUserScore = (scores: ScoreData, username: string): ScoreData => {
    if(!scores[username]) {
      scores[username] = {
        points: 0,
        total: 0,
        submissions: 0,
        guesses: 0
      }
    }

    if(!scores[username].points) scores[username].points = 0
    if(!scores[username].total) scores[username].total = 0
    if(!scores[username].guesses) scores[username].guesses = 0
    if(!scores[username].submissions) scores[username].submissions = 0

    return scores
  }

  const saveScoreData = (newData: ScoreData) => {
    if(!fs.existsSync(fileName)) fs.openSync(fileName, 'w')
    fs.writeFileSync(fileName, JSON.stringify(newData, null, 2))
  }

  return {
    recordGuess: (username: string, pointsEarned: number, totalPoints: number) => {
      const scores = initUserScore(getScoreData(), username)
      scores[username].guesses++
      scores[username].points += pointsEarned
      scores[username].total = totalPoints
      saveScoreData(scores)
    },
    recordSubmission: (username: string, pointsEarned: number, totalPoints: number) => {
      const scores = initUserScore(getScoreData(), username)
      scores[username].submissions++
      scores[username].points += pointsEarned
      scores[username].total = totalPoints
      saveScoreData(scores)
    }
  }
}

type ScoreData = {
  [username: string]: UserScores
}

type UserScores = {
  points?: number,
  total?: number,
  submissions?: number,
  guesses?: number
}

const getFileName = () => {
  const date = new Date()
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
  const path = './scores/'
  if(!fs.existsSync(path)) fs.mkdirSync(path)
  return `${path}${date.getUTCFullYear()}-${months[date.getUTCMonth()]}.json`
}