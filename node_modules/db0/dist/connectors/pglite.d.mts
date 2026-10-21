import { ConnectorDependencies, LibImport } from "../_chunks/types.mjs";
import "../_chunks/utils.mjs";
import { Connector } from "db0";
import { PGlite, PGliteInterfaceExtensions, PGliteOptions } from "@electric-sql/pglite";
type ConnectorOptions = PGliteOptions & {
  /**
   * Optionally provide the [`@electric-sql/pglite`](https://www.npmjs.com/package/@electric-sql/pglite)
   * library to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("@electric-sql/pglite")>;
};
declare const CONNECTOR_DEPENDENCIES: ConnectorDependencies;
declare function pgliteConnector<TOptions extends ConnectorOptions>(opts?: TOptions): Connector<PGlite & PGliteInterfaceExtensions<TOptions["extensions"]>>;
export { CONNECTOR_DEPENDENCIES, ConnectorOptions, pgliteConnector as default };