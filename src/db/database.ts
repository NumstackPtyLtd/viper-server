import BetterSqlite3 from 'better-sqlite3'
import { runMigrations } from './migrations.js'

let db: BetterSqlite3.Database | null = null

export function getDatabase(path: string = './data/viper.db'): BetterSqlite3.Database {
  if (db) return db
  db = new BetterSqlite3(path)
  db.pragma('journal_mode = WAL')
  runMigrations(db)
  return db
}
