import { Connector, Database, SQLDialect } from "./_chunks/types.mjs";
type TracedOperation = "query";
/**
 * Name of the tracing channel every query is traced on.
 *
 * Subscribers can use it instead of hardcoding the string:
 * `tracingChannel<TraceContext>(QUERY_CHANNEL)`.
 */
declare const QUERY_CHANNEL = "db0.query";
interface TraceContext {
  query: string;
  method: "exec" | "sql" | "prepare.all" | "prepare.run" | "prepare.get";
  connector: Database["connector"];
  dialect: SQLDialect;
}
/**
 * Wrap a database instance with tracing functionality.
 */
declare function withTracing<TConnector extends Connector = Connector>(db: Database<TConnector>): Database<TConnector>;
export { QUERY_CHANNEL, TraceContext, TracedOperation, withTracing };