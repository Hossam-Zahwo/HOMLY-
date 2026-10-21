import { AnyRelations, EmptyRelations } from "drizzle-orm";
import { DrizzleSQLiteConfig as DrizzleSQLiteConfig$1, SQLiteAsyncDatabase, SQLiteAsyncPreparedQuery, SQLiteAsyncSession, SQLiteAsyncTransaction, SQLiteDialect } from "drizzle-orm/sqlite-core";
import { Database } from "db0";
/**
 * What db0's sqlite connectors resolve `Statement.run()` with.
 *
 * `Statement["run"]` is declared as `{ success: boolean }`, but every connector
 * passes its driver's own result through: better-sqlite3, node:sqlite and
 * bun:sqlite add `changes` and `lastInsertRowid`, cloudflare-d1 returns D1's
 * `{ success, meta }`, and the libsql connectors return libsql's `ResultSet`
 * (`rowsAffected`, `lastInsertRowid` — and no `success` at all). So neither
 * `success` nor any driver field can be promised, and the fields a given driver
 * does add have to stay reachable.
 */
type DB0SQLiteRunResult = {
  success?: boolean;
  changes?: number;
  rowsAffected?: number;
  lastInsertRowid?: number | bigint;
} & Record<string, unknown>;
type DB0DrizzleSQLiteConfig<TRelations extends AnyRelations = EmptyRelations> = DrizzleSQLiteConfig$1<TRelations> & {
  /**
   * Make the relational query builder emit `json_*` helpers instead of
   * `jsonb_*`, for SQLite builds without JSONB support (added in SQLite 3.45).
   *
   * Defaults to `true` for the `cloudflare-d1` connector and `false` otherwise.
   */
  forbidJsonb?: boolean | undefined;
};
type DrizzleSQLiteDatabase<TRelations extends AnyRelations = EmptyRelations> = SQLiteAsyncDatabase<"async", DB0SQLiteRunResult, TRelations> & {
  /**
   * The db0 database this drizzle instance runs on.
   *
   * Drizzle drivers expose the underlying client as `$client`; db0's is the
   * `Database`, since the driver instance itself is only reachable
   * asynchronously through `db.getInstance()`.
   */
  $client: Database;
};
declare function drizzle<TRelations extends AnyRelations = EmptyRelations>(db: Database, config?: DB0DrizzleSQLiteConfig<TRelations>): DrizzleSQLiteDatabase<TRelations>;
export { DB0DrizzleSQLiteConfig, type DrizzleSQLiteConfig$1 as DrizzleSQLiteConfig, DrizzleSQLiteDatabase, drizzle };