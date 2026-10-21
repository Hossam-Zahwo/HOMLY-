import { ConnectorDependencies, LibImport } from "../_chunks/types.mjs";
import "../_chunks/utils.mjs";
import { Connector } from "db0";
import mysql from "mysql2/promise";
type ConnectorOptions = mysql.ConnectionOptions & {
  /**
   * Optionally provide the [`mysql2`](https://www.npmjs.com/package/mysql2) library
   * (the `mysql2/promise` entry) to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("mysql2/promise")>;
};
declare const CONNECTOR_DEPENDENCIES: ConnectorDependencies;
declare function mysqlConnector(opts: ConnectorOptions): Connector<mysql.Connection>;
export { CONNECTOR_DEPENDENCIES, ConnectorOptions, mysqlConnector as default };