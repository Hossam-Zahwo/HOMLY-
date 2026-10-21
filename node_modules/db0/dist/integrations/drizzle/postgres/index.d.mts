import { AnyRelations, Assume, EmptyRelations } from "drizzle-orm";
import { DrizzlePgConfig, PgAsyncDatabase, PgAsyncPreparedQuery, PgAsyncSession, PgAsyncTransaction, PgDialect, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { PgCodecs } from "drizzle-orm/pg-core/codecs";
import { Database } from "db0";
/**
 * What db0's postgres connectors resolve `Statement.run()` with: `success`
 * plus every own field of the driver's own result object — `rowCount`,
 * `command` and `rows` (node-postgres, neon, hyperdrive), `affectedRows`
 * (pglite), `rowsAffected` (planetscale). Nothing beyond that is common to all
 * drivers, so every field is optional and the rest stays reachable.
 */
type DB0PgRunResult = {
  success?: boolean;
  rowCount?: number | null;
  affectedRows?: number;
  rowsAffected?: number;
  command?: string;
  rows?: Record<string, unknown>[];
} & Record<string, unknown>;
/**
 * Drizzle instantiates this with the row type a statement returns, and with
 * `never` for the statements that return no rows at all — a non-returning
 * `insert`/`update`/`delete`. Those resolve to the connector's `run()` result
 * (see {@link DB0PgRunResult}), everything else to the rows themselves.
 */
interface DB0PgQueryResultHKT extends PgQueryResultHKT {
  type: [this["row"]] extends [never] ? DB0PgRunResult : Assume<this["row"], {
    [column: string]: any;
  }>[];
}
/** `drizzle-orm/node-postgres` codecs, adjusted for db0's `pg` connectors. */
declare const db0NodePgCodecs: PgCodecs;
/** `drizzle-orm/pglite` codecs, adjusted for db0's `pglite` connector. */
declare const db0PgliteCodecs: PgCodecs;
/** `drizzle-orm/neon-serverless` codecs, adjusted for db0's `neon` connector. */
declare const db0NeonCodecs: PgCodecs;
/**
 * The codecs db0 uses for a Postgres connector when `config.codecs` is unset.
 *
 * Unknown connectors fall back to the `pg` set: every db0 Postgres connector
 * that is not PGlite or Neon speaks to a plain `pg` client. Pass `codecs`
 * explicitly for a client that decodes differently.
 */
declare function pgCodecsFor(connector: string | undefined): PgCodecs;
type DrizzlePgDatabase<TRelations extends AnyRelations = EmptyRelations> = PgAsyncDatabase<DB0PgQueryResultHKT, TRelations> & {
  /**
   * The db0 database this drizzle instance runs on.
   *
   * Drizzle drivers expose the underlying client as `$client`; db0's is the
   * `Database`, since the driver instance itself is only reachable
   * asynchronously through `db.getInstance()`.
   */
  $client: Database;
};
declare function drizzle<TRelations extends AnyRelations = EmptyRelations>(db: Database, config?: DrizzlePgConfig<TRelations>): DrizzlePgDatabase<TRelations>;
export { type DrizzlePgConfig, DrizzlePgDatabase, db0NeonCodecs, db0NodePgCodecs, db0PgliteCodecs, drizzle, pgCodecsFor };