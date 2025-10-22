// Network connectivity test for Supabase
export default async function handler(req, res) {
	// Set CORS headers
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");

	if (req.method === "OPTIONS") {
		return res.status(200).end();
	}

	try {
		const hostname = "db.zcxkzwbldehrfbsyrccy.supabase.co";
		const port = 5432;

		// Test 1: Try to resolve DNS
		let dnsResult = "NOT_TESTED";
		try {
			const dns = await import("node:dns");
			const { promisify } = await import("node:util");
			const lookup = promisify(dns.lookup);

			const address = await lookup(hostname);
			dnsResult = `RESOLVED: ${address.address} (${address.family === 4 ? "IPv4" : "IPv6"})`;
		} catch (dnsError) {
			dnsResult = `DNS_ERROR: ${dnsError.message}`;
		}

		// Test 2: Try basic HTTP request to Supabase REST API
		let httpResult = "NOT_TESTED";
		try {
			const supabaseUrl = `https://${hostname.replace("db.", "")}/rest/v1/`;
			const response = await fetch(supabaseUrl, {
				method: "GET",
				headers: {
					apikey: process.env.SUPABASE_ANON_KEY || "test",
				},
			});
			httpResult = `HTTP_${response.status}: ${response.statusText}`;
		} catch (httpError) {
			httpResult = `HTTP_ERROR: ${httpError.message}`;
		}

		// Test 3: Check environment variables format
		const dbUrl = process.env.DATABASE_URL || "";
		const urlParts = {
			protocol: "UNKNOWN",
			hostname: "UNKNOWN",
			port: "UNKNOWN",
			database: "UNKNOWN",
			username: "UNKNOWN",
		};

		if (dbUrl.startsWith("postgresql://")) {
			try {
				const url = new URL(dbUrl);
				urlParts.protocol = url.protocol;
				urlParts.hostname = url.hostname;
				urlParts.port = url.port || "5432";
				urlParts.database = url.pathname.substring(1);
				urlParts.username = url.username;
			} catch (urlError) {
				urlParts.error = urlError.message;
			}
		}

		return res.json({
			success: true,
			tests: {
				dns_resolution: dnsResult,
				http_connectivity: httpResult,
				database_url_parsing: urlParts,
			},
			environment: {
				NODE_ENV: process.env.NODE_ENV,
				DATABASE_URL_present: !!process.env.DATABASE_URL,
				DATABASE_URL_length: dbUrl.length,
				DATABASE_URL_preview: `${dbUrl.substring(0, 50)}...`,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: "Network test failed",
			details: error.message,
			timestamp: new Date().toISOString(),
		});
	}
}
