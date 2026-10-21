import { BoundableStatement } from "../_chunks/statement.mjs";
import { importLib, interopDefault, lazyInstance } from "../_chunks/utils.mjs";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";
const CONNECTOR_DEPENDENCIES = { lib: {
	name: "sqlite3",
	version: "^5 || ^6"
} };
const CONNECTOR_NAME = "sqlite3";
function nodeSqlite3Connector(opts) {
	const _activeStatements = /* @__PURE__ */ new Set();
	const getDB = lazyInstance(async () => {
		const lib = interopDefault(await importLib(CONNECTOR_NAME, "sqlite3", opts.lib, () => import("sqlite3")));
		if (opts.name === ":memory:") return new lib.Database(":memory:");
		const filePath = resolve(opts.cwd || ".", opts.path || `.data/${opts.name || "db"}.sqlite3`);
		mkdirSync(dirname(filePath), { recursive: true });
		return new lib.Database(filePath);
	});
	const query = async (sql) => {
		const db = await getDB();
		return new Promise((resolve, reject) => {
			db.exec(sql, (err) => {
				if (err) return reject(err);
				resolve({ success: true });
			});
		});
	};
	return {
		name: "sqlite3",
		dialect: "sqlite",
		getInstance: () => getDB(),
		exec: (sql) => query(sql),
		prepare: (sql) => {
			const stmt = new StatementWrapper(sql, getDB());
			_activeStatements.add(stmt);
			return stmt;
		},
		dispose: async () => {
			await Promise.all([..._activeStatements].map((s) => s.finalize().catch((error) => {
				console.warn("[db0] [sqlite3] failed to finalize statement", error);
			})));
			_activeStatements.clear();
			const db = await getDB.current;
			getDB.reset();
			if (db) await new Promise((resolve, reject) => db.close?.((error) => error ? reject(error) : resolve()));
		}
	};
}
var StatementWrapper = class extends BoundableStatement {
	#onError;
	constructor(sql, db) {
		super(db.then((db) => db.prepare(sql, (err) => {
			if (err && this.#onError) return this.#onError(err);
		})));
		this._statement.catch(() => {});
	}
	async all(...params) {
		const statement = await this._statement;
		return await new Promise((resolve, reject) => {
			this.#onError = reject;
			statement.all(...params, (err, rows) => err ? reject(err) : resolve(rows));
		});
	}
	async run(...params) {
		const statement = await this._statement;
		await new Promise((resolve, reject) => {
			this.#onError = reject;
			statement.run(...params, (err) => err ? reject(err) : resolve());
		});
		return { success: true };
	}
	async get(...params) {
		const statement = await this._statement;
		return await new Promise((resolve, reject) => {
			this.#onError = reject;
			statement.get(...params, (err, row) => err ? reject(err) : resolve(row));
		});
	}
	async finalize() {
		(await this._statement).finalize();
	}
};
export { CONNECTOR_DEPENDENCIES, nodeSqlite3Connector as default };
