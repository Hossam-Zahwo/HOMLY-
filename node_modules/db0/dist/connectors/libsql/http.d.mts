import { ConnectorDependencies, LibImport } from "../../_chunks/types.mjs";
import "../../_chunks/utils.mjs";
import { Connector } from "db0";
import { Client, Config } from "@libsql/client";
type ConnectorOptions = Config & {
  /**
   * Optionally provide the [`@libsql/client`](https://www.npmjs.com/package/@libsql/client)
   * library (the `@libsql/client/http` entry) to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("@libsql/client/http")>;
};
declare const CONNECTOR_DEPENDENCIES: ConnectorDependencies;
declare function libSqlConnector(opts: ConnectorOptions): Connector<Client>;
export { CONNECTOR_DEPENDENCIES, ConnectorOptions, libSqlConnector as default };