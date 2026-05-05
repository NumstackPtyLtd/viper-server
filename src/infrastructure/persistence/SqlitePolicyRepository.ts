import type Database from 'better-sqlite3'
import type { PolicyRepository, PolicyRow, PolicyListParams } from '../../domain/ports/PolicyRepository.js'

export class SqlitePolicyRepository implements PolicyRepository {
  constructor(private readonly db: Database.Database) {}

  list(params: PolicyListParams): PolicyRow[] {
    const conditions = ['org_id = ?']
    const args: unknown[] = [params.org_id]
    if (params.resource_type) { conditions.push('resource_type = ?'); args.push(params.resource_type) }
    if (params.target_type) { conditions.push('target_type = ?'); args.push(params.target_type) }
    if (params.target_id) { conditions.push('target_id = ?'); args.push(params.target_id) }
    return this.db.prepare(`SELECT * FROM policies WHERE ${conditions.join(' AND ')} ORDER BY priority DESC, created_at DESC`).all(...args) as PolicyRow[]
  }

  getById(id: string): PolicyRow | null {
    return this.db.prepare('SELECT * FROM policies WHERE id = ?').get(id) as PolicyRow | undefined ?? null
  }

  create(p: PolicyRow): void {
    this.db.prepare(
      'INSERT INTO policies (id, org_id, name, description, resource_type, resource_id, target_type, target_id, effect, priority, conditions, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(p.id, p.org_id, p.name, p.description, p.resource_type, p.resource_id, p.target_type, p.target_id, p.effect, p.priority, p.conditions, p.enabled)
  }

  update(id: string, data: Partial<PolicyRow>): void {
    const sets: string[] = ["updated_at = datetime('now')"]
    const args: unknown[] = []
    for (const [key, val] of Object.entries(data)) {
      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        sets.push(`${key} = ?`); args.push(val)
      }
    }
    args.push(id)
    this.db.prepare(`UPDATE policies SET ${sets.join(', ')} WHERE id = ?`).run(...args)
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM policies WHERE id = ?').run(id)
  }

  findForTarget(orgId: string, targetType: string, targetId: string | null, resourceType: string): PolicyRow[] {
    if (targetId) {
      return this.db.prepare(`
        SELECT * FROM policies
        WHERE org_id = ? AND resource_type = ? AND enabled = 1
          AND (
            (target_type = ? AND target_id = ?)
            OR (target_type = ? AND target_id IS NULL)
          )
        ORDER BY priority DESC
      `).all(orgId, resourceType, targetType, targetId, targetType) as PolicyRow[]
    }
    return this.db.prepare(`
      SELECT * FROM policies
      WHERE org_id = ? AND resource_type = ? AND enabled = 1
        AND target_type = ? AND target_id IS NULL
      ORDER BY priority DESC
    `).all(orgId, resourceType, targetType) as PolicyRow[]
  }
}
