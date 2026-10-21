import { ConnectorDependencies, LibImport } from "../_chunks/types.mjs";
import "../_chunks/utils.mjs";
import { Connector } from "db0";
import pg from "pg";
type OmitPgConfig = Omit<pg.ClientConfig, "user" | "database" | "password" | "port" | "host" | "connectionString">;
type ConnectorOptions = {
  bindingName: string;
  /**
   * Optionally provide the [`pg`](https://www.npmjs.com/package/pg) library
   * to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("pg")>;
} & OmitPgConfig;
declare const CONNECTOR_DEPENDENCIES: ConnectorDependencies;
declare function cloudflareHyperdrivePostgresqlConnector(opts: ConnectorOptions): Connector<pg.Client>;
export { CONNECTOR_DEPENDENCIES, ConnectorOptions, cloudflareHyperdrivePostgresqlConnector as default };