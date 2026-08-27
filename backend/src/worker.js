import { calculateBlacksMethod } from './algorithm.js';

async function handleCreate(request, env, corsHeaders) {
    try {
        const body = await request.json();
        const { title, candidates } = body;

        if (!title || !candidates || !Array.isArray(candidates) || candidates.length < 2) {
            return new Response(JSON.stringify({ error: "Invalid title or candidates (minimum 2 required)." }), {
                status: 400,
                headers: corsHeaders
            });
        }

        const poll_id = Math.random().toString(36).substring(2, 9);
        const admin_token = crypto.randomUUID();

        const pollState = {
            title: title.trim(),
            admin_token: admin_token,
            status: "open",
            candidates: candidates.map(c => c.trim()),
            votes: []
        };

        await env.POLLS.put(poll_id, JSON.stringify(pollState));

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

async function handleGetPoll(url, env, corsHeaders) {
    try {
        const pathParts = url.pathname.split("/");
        const poll_id = pathParts[3];

        if (!poll_id) {
            return new Response(JSON.stringify({ error: "Missing poll ID." }), {
                status: 400,
                headers: corsHeaders
            });
        }

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

async function handleVote(request, env, corsHeaders) {
    try {
        const body = await request.json();
        const { poll_id, voter_name, ranking } = body;

        if (!poll_id || !voter_name || !Array.isArray(ranking)) {
            return new Response(JSON.stringify({ error: "Invalid vote payload." }), {
                status: 400,
                headers: corsHeaders
            });
        }

        const pollDataStr = await env.POLLS.get(poll_id);
        if (!pollDataStr) {
            return new Response(JSON.stringify({ error: "Poll not found or expired." }), {
                status: 404,
                headers: corsHeaders
            });
        }

        const pollData = JSON.parse(pollDataStr);

        if (pollData.status !== "open") {
            return new Response(JSON.stringify({ error: "This poll is closed and no longer accepting votes." }), {
                status: 400,
                headers: corsHeaders
            });
        }

        pollData.votes.push({ 
            voter_name: voter_name.trim(), 
            ranking 
        });

        await env.POLLS.put(poll_id, JSON.stringify(pollData));

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: corsHeaders
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: "Server error saving vote." }), {
            status: 500,
            headers: corsHeaders
        });
    }
}

// Handler for closing the poll and computing results
async function handleClosePoll(request, env, corsHeaders) {
    try {
        const body = await request.json();
        const { poll_id, admin_token } = body;

        if (!poll_id || !admin_token) {
            return new Response(JSON.stringify({ error: "Missing poll ID or admin token." }), {
                status: 400,
                headers: corsHeaders
            });
        }

        const pollDataStr = await env.POLLS.get(poll_id);
        if (!pollDataStr) {
            return new Response(JSON.stringify({ error: "Poll not found or expired." }), {
                status: 404,
                headers: corsHeaders
            });
        }

        const pollData = JSON.parse(pollDataStr);

        // Verify admin token security check
        if (pollData.admin_token !== admin_token) {
            return new Response(JSON.stringify({ error: "Unauthorized: Invalid admin token." }), {
                status: 403,
                headers: corsHeaders
            });
        }

        // Run Black's Method algorithm on the collected votes
        const results = calculateBlacksMethod(pollData.candidates, pollData.votes);

        // Construct closed state model
        const closedState = {
            title: pollData.title,
            status: "closed",
            closed_at: Math.floor(Date.now() / 1000),
            winner: results.winner,
            winning_method: results.winning_method,
            borda_scores: results.borda_scores,
            total_votes: pollData.votes.length
        };

        // Save to KV with native 24-hour expiration TTL (86400 seconds)
        await env.POLLS.put(poll_id, JSON.stringify(closedState), { expirationTtl: 86400 });

        return new Response(JSON.stringify(closedState), {
            status: 200,
            headers: corsHeaders
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: "Server error closing poll." }), {
            status: 500,
            headers: corsHeaders
        });
    }
}

export default {
    async fetch(request, env, ctx) {
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

        if (url.pathname === "/api/create" && request.method === "POST") {
            return handleCreate(request, env, corsHeaders);
        }

        if (url.pathname.startsWith("/api/poll/") && request.method === "GET") {
            return handleGetPoll(url, env, corsHeaders);
        }

        if (url.pathname === "/api/vote" && request.method === "POST") {
            return handleVote(request, env, corsHeaders);
        }

        if (url.pathname === "/api/close" && request.method === "POST") {
            return handleClosePoll(request, env, corsHeaders);
        }

        return new Response(JSON.stringify({ error: "Not Found" }), {
            status: 404,
            headers: corsHeaders
        });
    }
};