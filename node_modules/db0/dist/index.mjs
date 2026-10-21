import { sqlTemplate } from "./_chunks/template.mjs";
const sqlite = Object.freeze({
	json: true,
	booleans: false,
	arrays: false,
	dates: false,
	uuids: false,
	transactions: true
});
const postgresql = Object.freeze({
	json: true,
	booleans: true,
	arrays: true,
	dates: true,
	uuids: true,
	transactions: true
});
const mysql = Object.freeze({
	json: true,
	booleans: true,
	arrays: false,
	dates: true,
	uuids: false,
	transactions: true
});
const dialectCapabilities = Object.freeze({
	sqlite,
	libsql: sqlite,
	postgresql,
	mysql
});
function getCapabilities(dialect, overrides) {
	return overrides ? Object.freeze({
		...dialectCapabilities[dialect],
		...overrides
	}) : dialectCapabilities[dialect];
}
const SQL_SELECT_RE = /^select/i;
const SQL_RETURNING_RE = /[\s]returning[\s]/i;
const DIALECTS_WITH_RET = /* @__PURE__ */ new Set(["postgresql", "sqlite"]);
const DISPOSED_ERR = "This database instance has been disposed and cannot be used.";
function createDatabase(connector) {
	const capabilities = getCapabilities(connector.dialect, connector.capabilityOverrides);
	let _disposed = false;
	const checkDisposed = () => {
		if (_disposed) {
			const err = /* @__PURE__ */ new Error(DISPOSED_ERR);
			Error.captureStackTrace?.(err, checkDisposed);
			throw err;
		}
	};
	return {
		get connector() {
			return connector.name;
		},
		get dialect() {
			return connector.dialect;
		},
		get capabilities() {
			return capabilities;
		},
		get disposed() {
			return _disposed;
		},
		getInstance() {
			checkDisposed();
			return connector.getInstance();
		},
		exec: (sql) => {
			checkDisposed();
			return Promise.resolve(connector.exec(sql));
		},
		prepare: (sql) => {
			checkDisposed();
			return connector.prepare(sql);
		},
		sql: async (strings, ...values) => {
			checkDisposed();
			const [sql, params] = sqlTemplate(strings, ...values);
			if (SQL_SELECT_RE.test(sql) || DIALECTS_WITH_RET.has(connector.dialect) && SQL_RETURNING_RE.test(sql)) return {
				rows: await connector.prepare(sql).all(...params),
				success: true
			};
			else return await connector.prepare(sql).run(...params);
		},
		dispose: () => {
			if (_disposed) return Promise.resolve();
			_disposed = true;
			try {
				return Promise.resolve(connector.dispose?.());
			} catch (error) {
				return Promise.reject(error);
			}
		},
		[Symbol.asyncDispose]() {
			return this.dispose();
		}
	};
}
const connectors = Object.freeze({
	"better-sqlite3": "db0/connectors/better-sqlite3",
	"bun-sqlite": "db0/connectors/bun-sqlite",
	"bun": "db0/connectors/bun-sqlite",
	"cloudflare-d1": "db0/connectors/cloudflare-d1",
	"cloudflare-hyperdrive-mysql": "db0/connectors/cloudflare-hyperdrive-mysql",
	"cloudflare-hyperdrive-postgresql": "db0/connectors/cloudflare-hyperdrive-postgresql",
	"libsql-core": "db0/connectors/libsql/core",
	"libsql-http": "db0/connectors/libsql/http",
	"libsql-node": "db0/connectors/libsql/node",
	"libsql": "db0/connectors/libsql/node",
	"libsql-web": "db0/connectors/libsql/web",
	"mysql2": "db0/connectors/mysql2",
	"neon": "db0/connectors/neon",
	"node-sqlite": "db0/connectors/node-sqlite",
	"sqlite": "db0/connectors/node-sqlite",
	"pglite": "db0/connectors/pglite",
	"planetscale": "db0/connectors/planetscale",
	"postgresql": "db0/connectors/postgresql",
	"sqlite3": "db0/connectors/sqlite3"
});
const connectorDependencies = Object.freeze({
	"better-sqlite3": { lib: {
		name: "better-sqlite3",
		version: "^11 || ^12 || ^13"
	} },
	"cloudflare-hyperdrive-mysql": { lib: {
		name: "mysql2",
		import: "mysql2/promise",
		version: "^3"
	} },
	"cloudflare-hyperdrive-postgresql": { lib: {
		name: "pg",
		version: "^8"
	} },
	"libsql-http": { lib: {
		name: "@libsql/client",
		import: "@libsql/client/http",
		version: "^0.14 || ^0.15 || ^0.16 || ^0.17"
	} },
	"libsql-node": { lib: {
		name: "@libsql/client",
		version: "^0.14 || ^0.15 || ^0.16 || ^0.17"
	} },
	"libsql": { lib: {
		name: "@libsql/client",
		version: "^0.14 || ^0.15 || ^0.16 || ^0.17"
	} },
	"libsql-web": { lib: {
		name: "@libsql/client",
		import: "@libsql/client/http",
		version: "^0.14 || ^0.15 || ^0.16 || ^0.17"
	} },
	"mysql2": { lib: {
		name: "mysql2",
		import: "mysql2/promise",
		version: "^3"
	} },
	"neon": { lib: {
		name: "@neondatabase/serverless",
		version: "^1"
	} },
	"pglite": { lib: {
		name: "@electric-sql/pglite",
		version: "^0.3 || ^0.4 || ^0.5"
	} },
	"planetscale": { lib: {
		name: "@planetscale/database",
		version: "^1"
	} },
	"postgresql": { lib: {
		name: "pg",
		version: "^8"
	} },
	"sqlite3": { lib: {
		name: "sqlite3",
		version: "^5 || ^6"
	} }
});
export { connectorDependencies, connectors, createDatabase, dialectCapabilities, getCapabilities };
