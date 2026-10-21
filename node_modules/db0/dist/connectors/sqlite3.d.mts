import { ConnectorDependencies, LibImport } from "../_chunks/types.mjs";
import "../_chunks/utils.mjs";
import { Connector } from "db0";
import sqlite3 from "sqlite3";
interface ConnectorOptions {
  cwd?: string;
  path?: string;
  name?: string;
  /**
   * Optionally provide the [`sqlite3`](https://www.npmjs.com/package/sqlite3) library
   * to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("sqlite3")>;
}
declare const CONNECTOR_DEPENDENCIES: ConnectorDependencies;
declare function nodeSqlite3Connector(opts: ConnectorOptions): Connector<sqlite3.Database>;
export { CONNECTOR_DEPENDENCIES, ConnectorOptions, nodeSqlite3Connector as default };