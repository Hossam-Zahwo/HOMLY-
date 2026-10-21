function getCloudflareEnv() {
	return globalThis.__env__ || import("cloudflare:workers").then((mod) => mod.env);
}
async function getHyperdrive(bindingName) {
	const binding = (await getCloudflareEnv())[bindingName];
	if (!binding) throw new Error(`[db0] [hyperdrive] binding \`${bindingName}\` not found`);
	return binding;
}
export { getHyperdrive };
