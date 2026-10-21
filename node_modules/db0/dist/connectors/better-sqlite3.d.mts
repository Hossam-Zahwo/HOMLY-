import { ConnectorDependencies, LibImport } from "../_chunks/types.mjs";
import "../_chunks/utils.mjs";
import BetterSqlite3 from "better-sqlite3";
import { Connector } from "db0";
interface ConnectorOptions {
  cwd?: string;
  path?: string;
  name?: string;
  /**
   * Optionally provide the [`better-sqlite3`](https://www.npmjs.com/package/better-sqlite3)
   * library to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("better-sqlite3")>;
}
declare const CONNECTOR_DEPENDENCIES: ConnectorDependencies;
declare function sqliteConnector(opts: ConnectorOptions): Connector<BetterSqlite3.Database>;
export { CONNECTOR_DEPENDENCIES, ConnectorOptions, sqliteConnector as default };