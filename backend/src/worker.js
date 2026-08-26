export default {
    async fetch(request, env, ctx) {
        // 1. Handle CORS preflight requests
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                }
            });
        }

        // 2. Setup standard response headers
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
        };

        // 3. Basic Router
        const url = new URL(request.url);
        
        if (url.pathname === "/api/create" && request.method === "POST") {
            // Your logic here...
            return new Response(JSON.stringify({ message: "Poll Created" }), { headers: corsHeaders });
        }

        return new Response("Not Found", { status: 404, headers: corsHeaders });
    }
};