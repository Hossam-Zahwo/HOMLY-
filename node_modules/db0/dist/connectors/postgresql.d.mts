import { ConnectorDependencies, LibImport } from "../_chunks/types.mjs";
import "../_chunks/utils.mjs";
import { Connector } from "db0";
import pg from "pg";
/**
 * Optionally provide the [`pg`](https://www.npmjs.com/package/pg) library
 * to avoid dynamically importing it.
 */
type WithLib = {
  lib?: LibImport<typeof import("pg")>;
};
type ConnectorOptions = ({
  url: string;
} | pg.ClientConfig) & WithLib;
declare const CONNECTOR_DEPENDENCIES: ConnectorDependencies;
declare function postgresqlConnector(opts: ConnectorOptions): Connector<pg.Client>;
export { CONNECTOR_DEPENDENCIES, ConnectorOptions, postgresqlConnector as default };