import { BoundableStatement } from "../_chunks/statement.mjs";
import { importLib, interopDefault, lazyInstance } from "../_chunks/utils.mjs";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";
const CONNECTOR_DEPENDENCIES = { lib: {
	name: "better-sqlite3",
	version: "^11 || ^12 || ^13"
} };
const CONNECTOR_NAME = "better-sqlite3";
function sqliteConnector(opts) {
	const getDB = lazyInstance(async () => {
		const Database = interopDefault(await importLib(CONNECTOR_NAME, "better-sqlite3", opts.lib, () => import("better-sqlite3")));
		if (opts.name === ":memory:") return new Database(":memory:");
		const filePath = resolve(opts.cwd || ".", opts.path || `.data/${opts.name || "db"}.sqlite3`);
		mkdirSync(dirname(filePath), { recursive: true });
		return new Database(filePath);
	});
	return {
		name: "sqlite",
		dialect: "sqlite",
		getInstance: () => getDB(),
		exec: async (sql) => (await getDB()).exec(sql),
		prepare: (sql) => new StatementWrapper(async () => (await getDB()).prepare(sql)),
		dispose: async () => {
			const db = await getDB.current;
			getDB.reset();
			db?.close?.();
		}
	};
}
var StatementWrapper = class extends BoundableStatement {
	async all(...params) {
		return (await this._statement()).all(...params);
	}
	async run(...params) {
		const res = (await this._statement()).run(...params);
		return {
			success: res.changes > 0,
			...res
		};
	}
	async get(...params) {
		return (await this._statement()).get(...params);
	}
};
export { CONNECTOR_DEPENDENCIES, sqliteConnector as default };
