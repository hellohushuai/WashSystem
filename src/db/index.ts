import Database from '@tauri-apps/plugin-sql'
import schema from './schema.sql?raw'

let dbPromise: Promise<Database> | null = null
let initialized = false

export async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load('sqlite:dry_cleaning.db')
  }
  return dbPromise
}

export async function initDb(): Promise<void> {
  if (initialized) return

  const database = await getDb()
  const statements = schema.split(';').filter(s => s.trim())

  for (const stmt of statements) {
    const trimmed = stmt.trim()
    if (trimmed) {
      try {
        await database.execute(trimmed)
      } catch (e) {
        // Ignore errors for CREATE TABLE IF NOT EXISTS and INSERT OR IGNORE
        console.debug('Schema statement result:', e)
      }
    }
  }
  initialized = true
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  bindValues?: unknown[]
): Promise<T[]> {
  try {
    const database = await getDb()
    return await database.select<T[]>(sql, bindValues)
  } catch (error) {
    console.error('Query error:', error)
    throw error
  }
}

export async function execute(
  sql: string,
  bindValues?: unknown[]
): Promise<{ rowsAffected: number; lastInsertId?: number | bigint }> {
  try {
    const database = await getDb()
    return await database.execute(sql, bindValues)
  } catch (error) {
    console.error('Execute error:', error)
    throw error
  }
}