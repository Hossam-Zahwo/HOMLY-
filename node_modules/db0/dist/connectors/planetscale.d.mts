import { ConnectorDependencies, LibImport } from "../_chunks/types.mjs";
import "../_chunks/utils.mjs";
import { Connector } from "db0";
import { Client, Config } from "@planetscale/database";
type ConnectorOptions = Config & {
  /**
   * Optionally provide the [`@planetscale/database`](https://www.npmjs.com/package/@planetscale/database)
   * library to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("@planetscale/database")>;
};
declare const CONNECTOR_DEPENDENCIES: ConnectorDependencies;
declare function planetscaleConnector(opts: ConnectorOptions): Connector<Client>;
export { CONNECTOR_DEPENDENCIES, ConnectorOptions, planetscaleConnector as default };