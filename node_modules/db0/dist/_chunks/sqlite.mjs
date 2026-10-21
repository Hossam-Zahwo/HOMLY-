import { assertNoCasingOption, attachCache, getRowConverter, trackSelectedFields, useJitMappers } from "./_utils.mjs";
import { NoopLogger, sql } from "drizzle-orm";
import { SQLiteAsyncDatabase, SQLiteAsyncPreparedQuery, SQLiteAsyncSession, SQLiteAsyncTransaction, SQLiteDialect } from "drizzle-orm/sqlite-core";
import { DefaultLogger } from "drizzle-orm/logger";
var DB0SQLiteSession = class extends SQLiteAsyncSession {
	db;
	relations;
	logger;
	cache;
	forbidJsonb;
	constructor(db, dialect, relations, options = {}) {
		super(dialect, "async");
		this.db = db;
		this.relations = relations;
		this.logger = options.logger ?? new NoopLogger();
		this.cache = options.cache;
		this.forbidJsonb = options.forbidJsonb;
	}
	prepareQuery(query, mode, _prepare, executeMethod, mapper, queryMetadata, cacheConfig) {
		const stmt = this.db.prepare(query.sql);
		const toArray = getRowConverter(mapper);
		const asRows = (rows) => mode === "arrays" ? rows.map((row) => toArray(row)) : rows;
		return new SQLiteAsyncPreparedQuery("async", executeMethod, {
			all: (params) => stmt.all(...params).then(asRows),
			get: (params) => stmt.get(...params).then((row) => row ? mode === "arrays" ? toArray(row) : row : void 0),
			run: (params) => stmt.run(...params),
			values: (params) => stmt.all(...params).then((rows) => rows.map((row) => toArray(row)))
		}, query, mapper, mode, this.logger, this.cache, queryMetadata, cacheConfig);
	}
	async transaction(transaction, config) {
		const tx = new DB0SQLiteTransaction("async", this.dialect, this, this.relations, 0, this.forbidJsonb);
		await this.run(sql.raw(`begin${config?.behavior ? " " + config.behavior : ""}`));
		try {
			const result = await transaction(tx);
			await this.run(sql`commit`);
			return result;
		} catch (error_) {
			return rollbackAndRethrow(() => this.run(sql`rollback`), error_);
		}
	}
};
var DB0SQLiteTransaction = class DB0SQLiteTransaction extends SQLiteAsyncTransaction {
	db0Dialect;
	db0Session;
	constructor(resultKind, db0Dialect, db0Session, relations, nestedIndex = 0, forbidJsonb) {
		super(resultKind, db0Dialect, db0Session, relations, nestedIndex, forbidJsonb);
		this.db0Dialect = db0Dialect;
		this.db0Session = db0Session;
	}
	async transaction(transaction) {
		const savepointName = `sp${this.nestedIndex + 1}`;
		const tx = new DB0SQLiteTransaction("async", this.db0Dialect, this.db0Session, this._.relations, this.nestedIndex + 1, this.forbidJsonb);
		await this.db0Session.run(sql.raw(`savepoint ${savepointName}`));
		try {
			const result = await transaction(tx);
			await this.db0Session.run(sql.raw(`release savepoint ${savepointName}`));
			return result;
		} catch (error_) {
			return rollbackAndRethrow(() => this.db0Session.run(sql.raw(`rollback to savepoint ${savepointName}`)), error_);
		}
	}
};
async function rollbackAndRethrow(rollback, error) {
	try {
		await rollback();
	} catch (rollbackError) {
		if (error instanceof Error && error.cause === void 0) try {
			error.cause = rollbackError;
		} catch {}
	}
	throw error;
}
const NO_JSONB_CONNECTORS = /* @__PURE__ */ new Set(["cloudflare-d1"]);
function drizzle(db, config) {
	assertNoCasingOption(config);
	const dialect = trackSelectedFields(new SQLiteDialect({ useJitMappers: useJitMappers(config?.jit) }));
	let logger;
	if (config?.logger === true) logger = new DefaultLogger();
	else if (config?.logger !== false && config?.logger !== void 0) logger = config.logger;
	const relations = config?.relations ?? {};
	const forbidJsonb = config?.forbidJsonb ?? NO_JSONB_CONNECTORS.has(db.connector);
	const session = new DB0SQLiteSession(db, dialect, relations, {
		logger,
		cache: config?.cache,
		forbidJsonb
	});
	const drizzleDb = new SQLiteAsyncDatabase("async", dialect, session, relations, forbidJsonb);
	drizzleDb.$client = db;
	attachCache(drizzleDb, config?.cache);
	return drizzleDb;
}
export { drizzle };
