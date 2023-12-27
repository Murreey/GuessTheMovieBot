import sqlite3 from 'sqlite3'
import { Database } from 'sqlite'
import { Score, SpeedRecord, TimeRange } from '../../../types'

const singleQuery = <T>(query: string, column?: string) => async (db: Database<sqlite3.Database, sqlite3.Statement>, timeRange: TimeRange): Promise<T> => {
  const result = await db.get<T>(query, timeRange.from.getTime(), timeRange.to.getTime())
  return column ? result?.[column] : result
}
const multiQuery = <T>(query: string) => async (db: Database<sqlite3.Database, sqlite3.Statement>, timeRange: TimeRange, limit = 5) => await db.all<T[]>(query, timeRange.from.getTime(), timeRange.to.getTime(), limit)

export const getAllScores = multiQuery<Score>(`
  SELECT username, SUM(points) AS score
  FROM wins
  INNER JOIN points ON wins.post_id = points.post_id
  INNER JOIN users ON points.user_id = users.user_id
  AND wins.created_at >= ? AND wins.created_at < ?
  GROUP BY users.user_id
  ORDER BY score DESC
  LIMIT ?
`)

export const getTopGuessers = multiQuery<Score>(`
  SELECT username, COUNT(post_id) AS score
  FROM wins
  INNER JOIN users ON wins.guesser_id = users.user_id
  WHERE solved_at >= ? AND solved_at < ?
  GROUP BY guesser_id
  ORDER BY score DESC
  LIMIT ?
`)

export const getTopSubmitters = multiQuery<Score>(`
  SELECT username, COUNT(post_id) AS score
  FROM wins
  INNER JOIN users ON wins.submitter_id = users.user_id
  WHERE solved_at >= ? AND solved_at < ?
  GROUP BY submitter_id
  ORDER BY score DESC
  LIMIT ?
`)

export const getNewScorersInTimeRange = multiQuery<Score>(`
  SELECT username, SUM(points) AS score
  FROM wins
  INNER JOIN points ON wins.post_id = points.post_id
  INNER JOIN users ON points.user_id = users.user_id
  WHERE wins.created_at >= ?1 AND wins.created_at < ?2
  AND username NOT IN (
    SELECT username
    FROM wins
    INNER JOIN points ON wins.post_id = points.post_id
    INNER JOIN users ON points.user_id = users.user_id
    WHERE wins.created_at < ?1
  )
  GROUP BY users.user_id
  ORDER BY score DESC
  LIMIT ?3
`)

export const fastestSolve = singleQuery<SpeedRecord>(`
  SELECT post_id AS postId, username, (solved_at - created_at) AS time
  FROM wins
  INNER JOIN users ON wins.guesser_id = users.user_id
  WHERE solved_at >= ? AND solved_at < ?
  ORDER BY time ASC
  LIMIT 1
`)

export const longestSolve = singleQuery<SpeedRecord>(`
  SELECT post_id AS postId, username, (solved_at - created_at) AS time
  FROM wins
  INNER JOIN users ON wins.guesser_id = users.user_id
  WHERE solved_at >= ? AND solved_at < ?
  ORDER BY time DESC
  LIMIT 1
`)

export const totalGamesSolved = singleQuery<number>(`
  SELECT COUNT(*) AS total
  FROM wins
  WHERE solved_at >= ? AND solved_at < ?
`, 'total')

export const totalSubmitters = singleQuery<number>(`
  SELECT COUNT(DISTINCT submitter_id) AS total
  FROM wins
  WHERE created_at >= ? AND created_at < ?
`, 'total')

export const totalGuessers = singleQuery<number>(`
  SELECT COUNT(DISTINCT guesser_id) AS total
  FROM wins
  WHERE solved_at >= ? AND solved_at < ?
`, 'total')