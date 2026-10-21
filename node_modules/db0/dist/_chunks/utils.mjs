async function importLib(connector, name, lib, load) {
	if (lib) return typeof lib === "function" ? await lib() : lib;
	try {
		return await load();
	} catch (cause) {
		throw new Error(`[db0] [${connector}] Cannot import \`${name}\`. Make sure it is installed or provide it via the \`lib\` option.`, { cause });
	}
}
function interopDefault(mod) {
	return mod?.default ?? mod;
}
function lazyInstance(factory) {
	const get = (() => get.current ??= factory().catch((error) => {
		get.current = void 0;
		throw error;
	}));
	get.current = void 0;
	get.reset = () => {
		get.current = void 0;
	};
	return get;
}
export { importLib, interopDefault, lazyInstance };
