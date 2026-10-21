import { ConnectorDependencies, LibImport } from "../_chunks/types.mjs";
import "../_chunks/utils.mjs";
import { Connector } from "db0";
import * as pg from "@neondatabase/serverless";
/**
 * Optionally provide the [`@neondatabase/serverless`](https://www.npmjs.com/package/@neondatabase/serverless)
 * library to avoid dynamically importing it.
 */
type WithLib = {
  lib?: LibImport<typeof import("@neondatabase/serverless")>;
};
type ConnectorOptions = ({
  url?: string;
} | pg.ClientConfig) & WithLib;
declare const CONNECTOR_DEPENDENCIES: ConnectorDependencies;
declare function neonConnector(opts?: ConnectorOptions): Connector<pg.Client>;
export { CONNECTOR_DEPENDENCIES, ConnectorOptions, neonConnector as default };