import { BoundableStatement } from "../_chunks/statement.mjs";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { Database } from "bun:sqlite";
function bunSqliteConnector(opts) {
	let _db;
	const getDB = () => {
		if (_db) return _db;
		if (opts.name === ":memory:") _db = new Database(":memory:");
		else {
			const filePath = resolve(opts.cwd || ".", opts.path || `.data/${opts.name || "db"}.bun.sqlite`);
			mkdirSync(dirname(filePath), { recursive: true });
			_db = new Database(filePath);
		}
		return _db;
	};
	return {
		name: "sqlite",
		dialect: "sqlite",
		getInstance: () => getDB(),
		exec: (sql) => getDB().exec(sql),
		prepare: (sql) => new StatementWrapper(getDB().prepare(sql)),
		dispose: () => {
			_db?.close?.();
			_db = void 0;
		}
	};
}
var StatementWrapper = class extends BoundableStatement {
	all(...params) {
		return Promise.resolve(this._statement.all(...params));
	}
	run(...params) {
		const res = this._statement.run(...params);
		return Promise.resolve({
			success: true,
			...res
		});
	}
	get(...params) {
		return Promise.resolve(this._statement.get(...params));
	}
};
export { bunSqliteConnector as default };
