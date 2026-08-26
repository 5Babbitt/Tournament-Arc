export default {
    async fetch(request, env, ctx) {
        // 1. Handle CORS Preflight
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                }
            });
        }

        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
        };

        const url = new URL(request.url);

        // 2. Handle POST /api/create
        if (url.pathname === "/api/create" && request.method === "POST") {
            try {
                const body = await request.json();
                const { title, candidates } = body;

                // Validation
                if (!title || !candidates || !Array.isArray(candidates) || candidates.length < 2) {
                    return new Response(JSON.stringify({ error: "Invalid title or candidates (minimum 2 required)." }), {
                        status: 400,
                        headers: corsHeaders
                    });
                }

                // Generate unique IDs and tokens
                const poll_id = Math.random().toString(36).substring(2, 9); // Simple short ID or use crypto.randomUUID()
                const admin_token = crypto.randomUUID();

                // Initial Open Poll State Model
                const pollState = {
                    title: title.trim(),
                    admin_token: admin_token,
                    status: "open",
                    candidates: candidates.map(c => c.trim()),
                    votes: []
                };

                // Save to Cloudflare KV
                await env.POLLS.put(poll_id, JSON.stringify(pollState));

                // Return credentials to frontend
                return new Response(JSON.stringify({ poll_id, admin_token }), {
                    status: 200,
                    headers: corsHeaders
                });

            } catch (err) {
                return new Response(JSON.stringify({ error: "Bad request or server error." }), {
                    status: 500,
                    headers: corsHeaders
                });
            }
        }

        if (url.pathname.startsWith("/api/poll/") && request.method === "GET") {
            try {
                // Extract poll_id from path: /api/poll/xyz123 -> ["", "api", "poll", "xyz123"]
                const pathParts = url.pathname.split("/");
                const poll_id = pathParts[3];

                if (!poll_id) {
                    return new Response(JSON.stringify({ error: "Missing poll ID." }), {
                        status: 400,
                        headers: corsHeaders
                    });
                }

                // Fetch from Cloudflare KV
                const pollDataStr = await env.POLLS.get(poll_id);

                if (!pollDataStr) {
                    return new Response(JSON.stringify({ error: "Poll not found or expired." }), {
                        status: 404,
                        headers: corsHeaders
                    });
                }

                return new Response(pollDataStr, {
                    status: 200,
                    headers: corsHeaders
                });

            } catch (err) {
                return new Response(JSON.stringify({ error: "Server error fetching poll." }), {
                    status: 500,
                    headers: corsHeaders
                });
            }
        }

        return new Response(JSON.stringify({ error: "Not Found" }), {
            status: 404,
            headers: corsHeaders
        });
    }
}