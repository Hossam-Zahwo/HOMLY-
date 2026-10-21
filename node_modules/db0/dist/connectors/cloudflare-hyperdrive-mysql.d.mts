import { ConnectorDependencies, LibImport } from "../_chunks/types.mjs";
import "../_chunks/utils.mjs";
import { Connector } from "db0";
import mysql from "mysql2/promise";
type OmitMysqlConfig = Omit<mysql.ConnectionOptions, "user" | "database" | "password" | "password1" | "password2" | "password3" | "port" | "host" | "uri" | "localAddress" | "socketPath" | "insecureAuth" | "passwordSha1" | "disableEval">;
type ConnectorOptions = {
  bindingName: string;
  /**
   * Optionally provide the [`mysql2`](https://www.npmjs.com/package/mysql2) library
   * (the `mysql2/promise` entry) to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("mysql2/promise")>;
} & OmitMysqlConfig;
declare const CONNECTOR_DEPENDENCIES: ConnectorDependencies;
declare function cloudflareHyperdriveMysqlConnector(opts: ConnectorOptions): Connector<mysql.Connection>;
export { CONNECTOR_DEPENDENCIES, ConnectorOptions, cloudflareHyperdriveMysqlConnector as default };