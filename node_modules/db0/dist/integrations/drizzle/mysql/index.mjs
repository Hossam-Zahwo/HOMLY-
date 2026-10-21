import { assertNoCasingOption, attachCache, getRowConverter, trackSelectedFields, useJitMappers } from "../../../_chunks/_utils.mjs";
import { NoopLogger, sql } from "drizzle-orm";
import { DefaultLogger } from "drizzle-orm/logger";
import { MySqlAsyncDatabase, MySqlAsyncPreparedQuery, MySqlAsyncSession, MySqlAsyncTransaction, MySqlDialect } from "drizzle-orm/mysql-core";
import { refineCodecs } from "drizzle-orm/codecs";
import { castToText } from "drizzle-orm/mysql-core/codecs";
import { mysql2Codecs } from "drizzle-orm/mysql2/codecs";
import { planetscaleServerlessCodecs } from "drizzle-orm/planetscale-serverless/codecs";
var DB0MySqlSession = class extends MySqlAsyncSession {
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
	prepareQuery(query, mode, mapper, queryMetadata, cacheConfig) {
		const toArray = getRowConverter(mapper);
		const stmt = this.db.prepare(query.sql);
		const rowsExpected = returnsRows(mode, queryMetadata);
		const executor = rowsExpected ? async (params = []) => {
			const rows = await stmt.all(...params);
			return mode === "arrays" ? rows.map((row) => toArray(row)) : rows;
		} : (params = []) => stmt.run(...params);
		return new MySqlAsyncPreparedQuery(executor, rowsExpected ? async function* (params) {
			yield* await executor(params);
		} : async function* () {
			throw new Error(`[db0] [drizzle] \`iterator()\` is not supported for \`${queryMetadata?.type ?? "raw"}\` statements: they resolve to the driver's result metadata (affected rows, insert id), not to rows. Await the query (or call \`.execute()\`) instead.`);
		}, query, mapper, mode, this.logger, this.cache, queryMetadata, cacheConfig);
	}
	async transaction(transaction, config) {
		const tx = new DB0MySqlTransaction(this.dialect, this, this.relations, 0);
		if (config) {
			const setTransactionConfigSql = this.getSetTransactionSQL(config);
			if (setTransactionConfigSql) await tx.execute(setTransactionConfigSql);
			const startTransactionSql = this.getStartTransactionSQL(config);
			await (startTransactionSql ? tx.execute(startTransactionSql) : tx.execute(sql`begin`));
		} else await tx.execute(sql`begin`);
		try {
			const result = await transaction(tx);
			await tx.execute(sql`commit`);
			return result;
		} catch (error) {
			return rollbackAndRethrow(() => tx.execute(sql`rollback`), error);
		}
	}
};
var DB0MySqlTransaction = class DB0MySqlTransaction extends MySqlAsyncTransaction {
	db0Dialect;
	db0Session;
	constructor(db0Dialect, db0Session, relations, nestedIndex) {
		super(db0Dialect, db0Session, relations, nestedIndex);
		this.db0Dialect = db0Dialect;
		this.db0Session = db0Session;
	}
	async transaction(transaction) {
		const savepointName = `sp${this.nestedIndex + 1}`;
		const tx = new DB0MySqlTransaction(this.db0Dialect, this.db0Session, this._.relations, this.nestedIndex + 1);
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
const MYSQL_AS_TEXT = {
	bigint: { cast: castToText },
	"bigint:number": { cast: castToText },
	"bigint:string": { cast: castToText },
	date: { cast: castToText },
	"date:string": { cast: castToText },
	datetime: { cast: castToText },
	"datetime:string": { cast: castToText },
	timestamp: { cast: castToText },
	"timestamp:string": { cast: castToText }
};
const db0Mysql2Codecs = refineCodecs(mysql2Codecs, MYSQL_AS_TEXT);
const db0PlanetscaleCodecs = refineCodecs(planetscaleServerlessCodecs, MYSQL_AS_TEXT);
function mysqlCodecsFor(connector) {
	switch (connector) {
		case "planetscale": return db0PlanetscaleCodecs;
		default: return db0Mysql2Codecs;
	}
}
function drizzle(db, config) {
	assertNoCasingOption(config);
	const dialect = trackSelectedFields(new MySqlDialect({
		useJitMappers: useJitMappers(config?.jit),
		codecs: config?.codecs ?? mysqlCodecsFor(db.connector)
	}));
	let logger;
	if (config?.logger === true) logger = new DefaultLogger();
	else if (config?.logger !== false && config?.logger !== void 0) logger = config.logger;
	const relations = config?.relations ?? {};
	const session = new DB0MySqlSession(db, dialect, relations, {
		logger,
		cache: config?.cache
	});
	const drizzleDb = new MySqlAsyncDatabase(dialect, session, relations);
	drizzleDb.$client = db;
	attachCache(drizzleDb, config?.cache);
	return drizzleDb;
}
export { db0Mysql2Codecs, db0PlanetscaleCodecs, drizzle, mysqlCodecsFor };
