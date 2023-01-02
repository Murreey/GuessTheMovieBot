import fs from 'fs'
import path from 'path'
import sqlite3 from 'sqlite3'
import { Database, open } from 'sqlite'
import { Scores } from '../Scores'
import { TimeRange } from '../../types'
import { fastestSolve, getAllScores, getTopGuessers, getTopSubmitters, longestSolve } from './queries/high-scores'

const defaultTimeRange: TimeRange = {
  // Bit lazy, but is essentially 'no time range',
  // without needing to have two queries.
  // `to` is the far future (rather than now)
  // because it is created at the same time as
  // the instance, not when the query is run.
  // This will stop working in the year 3000, but
  // by then we'll all live underwater anyway.
  from: new Date('2000-01-01'),
  to: new Date('3000-01-01'),
}

export default async () => {
  let db: Database<sqlite3.Database, sqlite3.Statement>

  try {
    db = await open({
      filename: path.resolve(__dirname, '../../../database.db'),
      driver: sqlite3.cached.Database
    })

    await db.exec('PRAGMA journal_mode = WAL;')
    await db.exec('PRAGMA foreign_keys = ON;')

    await db.exec(fs.readFileSync(path.resolve(__dirname, '../../../scripts/create-database.sql'), 'utf-8'))

    process.on('SIGINT', async () => { await db?.close(); db = null; process.exit(0) })
    process.on('SIGTERM', async () => { await db?.close(); db = null; process.exit(0) })
  } catch (ex) {
    console.error(ex)
    db = null
  }

  const getUserID = async (username: string): Promise<number> => {
    await db.run('INSERT OR IGNORE INTO users (username) VALUES (?)', username.toString())
    return (await db.get('SELECT user_id FROM users WHERE username = ?', username.toString())).user_id
  }

  return {
    db,
    getUserID,
    recordWin: async (postID: string, postCreatedAt: number, postSolvedAt: number, guesser: string, submitter: string, scores: Scores) => {
      const guesserID = await getUserID(guesser)
      const submitterID = await getUserID(submitter)
      await db.run(
        'INSERT OR REPLACE INTO wins (post_id, guesser_id, submitter_id, created_at, solved_at) VALUES (?, ?, ?, ?, ?)',
        postID, guesserID, submitterID, postCreatedAt, postSolvedAt
      )
      await db.run(
        'INSERT OR REPLACE INTO points (post_id, user_id, points) VALUES (?, ?, ?)',
        postID, guesserID, scores.guesser
      )
      await db.run(
        'INSERT OR REPLACE INTO points (post_id, user_id, points) VALUES (?, ?, ?)',
        postID, submitterID, scores.submitter
      )
    },
    deleteWin: async (postID: string) => {
      await db.run('DELETE FROM wins WHERE post_id = ?', postID)
    },
    editPoints: async (postID: string, scores: Scores) => {
      await db.run(`
        UPDATE points
        SET points = ?
        WHERE EXISTS
          (SELECT post_id FROM wins WHERE wins.guesser_id = points.user_id)
        AND post_id = ?`,
      scores.guesser, postID
      )
      await db.run(`
        UPDATE points
        SET points = ?
        WHERE EXISTS
          (SELECT post_id FROM wins WHERE wins.submitter_id = points.user_id)
        AND post_id = ?`,
      scores.submitter, postID
      )
    },
    getUserScore: async (username: string, timeRange?: Partial<TimeRange>): Promise<number> => {
      timeRange = { ...defaultTimeRange, ...timeRange }

      const data = await db.get(`
        SELECT SUM(points.points) AS total FROM wins
        INNER JOIN points ON wins.post_id = points.post_id
        INNER JOIN users ON points.user_id = users.user_id
        WHERE users.username = ?
        AND wins.solved_at >= ?
        AND wins.solved_at < ?`, username.toString(), timeRange.from.getTime(), timeRange.to.getTime())

      let result = data?.total ?? 0

      if (timeRange.from.getTime() === defaultTimeRange.from.getTime()) {
        const legacyData = await db.get(`
          SELECT points FROM legacy_imports
          INNER JOIN users ON legacy_imports.user_id = users.user_id
          WHERE users.username = ?`, username.toString())

        result += (legacyData?.points ?? 0)
      }

      return result
    },
    getUserSubmissionCount: async (username: string, timeRange?: Partial<TimeRange>): Promise<number> => {
      timeRange = { ...defaultTimeRange, ...timeRange }

      const data = await db.get(`
        SELECT COUNT(wins.post_id) as count FROM wins
        LEFT JOIN users ON wins.submitter_id = users.user_id
        WHERE users.username = ?
        AND wins.solved_at >= ?
        AND wins.solved_at < ?`, username.toString(), timeRange.from.getTime(), timeRange.to.getTime())

      let result = data?.count ?? 0

      if (timeRange.from.getTime() === defaultTimeRange.from.getTime()) {
        const legacyData = await db.get(`
          SELECT submissions FROM legacy_imports
          INNER JOIN users ON legacy_imports.user_id = users.user_id
          WHERE users.username = ?`, username.toString())

        result += (legacyData?.submissions ?? 0)
      }

      return result
    },
    getUserGuessCount: async (username: string, timeRange?: Partial<TimeRange>): Promise<number> => {
      timeRange = { ...defaultTimeRange, ...timeRange }

      const data = await db.get(`
        SELECT COUNT(wins.post_id) as count FROM wins
        LEFT JOIN users ON wins.guesser_id = users.user_id
        WHERE users.username = ?
        AND wins.solved_at >= ?
        AND wins.solved_at < ?`, username.toString(), timeRange.from.getTime(), timeRange.to.getTime())

      let result = data?.count ?? 0

      if (timeRange.from.getTime() === defaultTimeRange.from.getTime()) {
        const legacyData = await db.get(`
          SELECT guesses FROM legacy_imports
          INNER JOIN users ON legacy_imports.user_id = users.user_id
          WHERE users.username = ?`, username.toString())

        result += (legacyData?.guesses ?? 0)
      }

      return result
    },
    getHighScores: async (timeRange: TimeRange, limit = 5) => ({
      scores: await getAllScores(db, timeRange, limit),
      guessers: await getTopGuessers(db, timeRange, limit),
      submitters: await getTopSubmitters(db, timeRange, limit),
      fastest: await fastestSolve(db, timeRange),
      slowest: await longestSolve(db, timeRange)
    })
  }
}