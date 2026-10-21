import { assertNoCasingOption, attachCache, getRowConverter, trackSelectedFields, useJitMappers } from "../../../_chunks/_utils.mjs";
import { NoopLogger, sql } from "drizzle-orm";
import { DefaultLogger } from "drizzle-orm/logger";
import { refineCodecs } from "drizzle-orm/codecs";
import { PgAsyncDatabase, PgAsyncPreparedQuery, PgAsyncSession, PgAsyncTransaction, PgDialect } from "drizzle-orm/pg-core";
import { castToText } from "drizzle-orm/pg-core/codecs";
import { nodePgCodecs } from "drizzle-orm/node-postgres/codecs";
import { pgliteCodecs } from "drizzle-orm/pglite/codecs";
import { neonServerlessCodecs } from "drizzle-orm/neon-serverless/codecs";
var DB0PgSession = class extends PgAsyncSession {
	db;
	relations;
	logger;
	cache;
	constructor(db, dialect, relations, options = {}) {
		super(dialect);
		this.db = db;
		this.relations = relations;
		this.logger = options.logger ?? new NoopLogger();
		this.cache = options.cache;
	}
	prepareQuery(query, mode, _name, mapper, queryMetadata, cacheConfig) {
		const toArray = getRowConverter(mapper);
		const stmt = this.db.prepare(query.sql);
		const executor = returnsRows(mode, queryMetadata) ? async (params = []) => {
			const rows = await stmt.all(...params);
			return mode === "arrays" ? rows.map((row) => toArray(row)) : rows;
		} : (params = []) => stmt.run(...params);
		return new PgAsyncPreparedQuery(executor, query, mapper, mode, this.logger, this.cache, queryMetadata, cacheConfig);
	}
	async transaction(transaction, config) {
		const tx = new DB0PgTransaction(this.dialect, this, this.relations);
		await tx.execute(sql`begin${config ? sql` ${transactionConfigSQL(config)}` : void 0}`);
		try {
			const result = await transaction(tx);
			await tx.execute(sql`commit`);
			return result;
		} catch (error) {
			return rollbackAndRethrow(() => tx.execute(sql`rollback`), error);
		}
	}
};
var DB0PgTransaction = class DB0PgTransaction extends PgAsyncTransaction {
	db0Dialect;
	db0Session;
	constructor(db0Dialect, db0Session, relations, nestedIndex = 0) {
		super(db0Dialect, db0Session, relations, nestedIndex, false);
		this.db0Dialect = db0Dialect;
		this.db0Session = db0Session;
	}
	async transaction(transaction) {
		const savepointName = `sp${this.nestedIndex + 1}`;
		const tx = new DB0PgTransaction(this.db0Dialect, this.db0Session, this._.relations, this.nestedIndex + 1);
		await tx.execute(sql.raw(`savepoint ${savepointName}`));
		try {
			const result = await transaction(tx);
			await tx.execute(sql.raw(`release savepoint ${savepointName}`));
			return result;
		} catch (error_) {
			return rollbackAndRethrow(() => tx.execute(sql.raw(`rollback to savepoint ${savepointName}`)), error_);
		}
	}
};
function returnsRows(mode, queryMetadata) {
	return mode !== "raw" || queryMetadata === void 0 || queryMetadata.type === "select";
}
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
function transactionConfigSQL(config) {
	const chunks = [];
	if (config.isolationLevel) chunks.push(`isolation level ${config.isolationLevel}`);
	if (config.accessMode) chunks.push(config.accessMode);
	if (typeof config.deferrable === "boolean") chunks.push(config.deferrable ? "deferrable" : "not deferrable");
	return sql.raw(chunks.join(" "));
}
const PG_DATE_TIME_AS_TEXT = {
	date: { cast: castToText },
	"date:string": { cast: castToText },
	interval: { cast: castToText },
	timestamp: { cast: castToText },
	"timestamp:string": { cast: castToText },
	timestamptz: { cast: castToText },
	"timestamptz:string": { cast: castToText }
};
const db0NodePgCodecs = refineCodecs(nodePgCodecs, PG_DATE_TIME_AS_TEXT);
const db0PgliteCodecs = refineCodecs(pgliteCodecs, PG_DATE_TIME_AS_TEXT);
const db0NeonCodecs = refineCodecs(neonServerlessCodecs, PG_DATE_TIME_AS_TEXT);
function pgCodecsFor(connector) {
	switch (connector) {
		case "pglite": return db0PgliteCodecs;
		case "neon": return db0NeonCodecs;
		default: return db0NodePgCodecs;
	}
}
function drizzle(db, config) {
	assertNoCasingOption(config);
	const dialect = trackSelectedFields(new PgDialect({
		useJitMappers: useJitMappers(config?.jit),
		codecs: config?.codecs ?? pgCodecsFor(db.connector)
	}));
	let logger;
	if (config?.logger === true) logger = new DefaultLogger();
	else if (config?.logger !== false && config?.logger !== void 0) logger = config.logger;
	const relations = config?.relations ?? {};
	const session = new DB0PgSession(db, dialect, relations, {
		logger,
		cache: config?.cache
	});
	const drizzleDb = new PgAsyncDatabase(dialect, session, relations);
	drizzleDb.$client = db;
	attachCache(drizzleDb, config?.cache);
	return drizzleDb;
}
export { db0NeonCodecs, db0NodePgCodecs, db0PgliteCodecs, drizzle, pgCodecsFor };
