import { AnyRelations, Assume, EmptyRelations } from "drizzle-orm";
import { DrizzleMySqlConfig, MySqlAsyncDatabase, MySqlAsyncPreparedQuery, MySqlAsyncSession, MySqlAsyncTransaction, MySqlDialect, MySqlQueryResultHKT } from "drizzle-orm/mysql-core";
import { MySqlCodecs } from "drizzle-orm/mysql-core/codecs";
import { Database } from "db0";
/**
 * What db0's mysql connectors resolve `Statement.run()` with: `success` plus
 * every own field of the driver's own result — mysql2's `ResultSetHeader`
 * (`affectedRows`, `insertId`, `changedRows`, `warningStatus`) or
 * planetscale's `{ rowsAffected, insertId }`. Nothing beyond that is common to
 * all drivers, so every field is optional and the rest stays reachable.
 */
type DB0MySqlRunResult = {
  success?: boolean;
  affectedRows?: number;
  rowsAffected?: number;
  changedRows?: number;
  insertId?: number | string;
} & Record<string, unknown>;
/**
 * Drizzle instantiates this with the row type a statement returns, and with
 * `never` for the statements that return no rows at all — an
 * `insert`/`update`/`delete` without `$returningId()`. Those resolve to the
 * connector's `run()` result (see {@link DB0MySqlRunResult}), everything else
 * to the rows themselves.
 */
interface DB0MySqlQueryResultHKT extends MySqlQueryResultHKT {
  type: [this["row"]] extends [never] ? DB0MySqlRunResult : Assume<this["row"], {
    [column: string]: any;
  }>[];
}
/** `drizzle-orm/mysql2` codecs, adjusted for db0's `mysql2` connectors. */
declare const db0Mysql2Codecs: MySqlCodecs;
/**
 * `drizzle-orm/planetscale-serverless` codecs, adjusted for db0's `planetscale`
 * connector.
 */
declare const db0PlanetscaleCodecs: MySqlCodecs;
/**
 * The codecs db0 uses for a MySQL connector when `config.codecs` is unset.
 *
 * Unknown connectors fall back to the `mysql2` set: every db0 MySQL connector
 * that is not PlanetScale speaks to a `mysql2` client. Pass `codecs` explicitly
 * for a client that decodes differently.
 */
declare function mysqlCodecsFor(connector: string | undefined): MySqlCodecs;
type DrizzleMySqlDatabase<TRelations extends AnyRelations = EmptyRelations> = MySqlAsyncDatabase<DB0MySqlQueryResultHKT, TRelations> & {
  /**
   * The db0 database this drizzle instance runs on.
   *
   * Drizzle drivers expose the underlying client as `$client`; db0's is the
   * `Database`, since the driver instance itself is only reachable
   * asynchronously through `db.getInstance()`.
   */
  $client: Database;
};
declare function drizzle<TRelations extends AnyRelations = EmptyRelations>(db: Database, config?: DrizzleMySqlConfig<TRelations>): DrizzleMySqlDatabase<TRelations>;
export { type DrizzleMySqlConfig, DrizzleMySqlDatabase, db0Mysql2Codecs, db0PlanetscaleCodecs, drizzle, mysqlCodecsFor };