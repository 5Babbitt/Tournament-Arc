const API_BASE = 'https://your-worker-name.your-subdomain.workers.dev/api'

async function apiCall(endpoint, method = 'GET', payload = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (payload && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(payload);
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        
        // Handle HTTP errors (e.g., 404 Not Found, 500 Internal Server Error)
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP Error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`API Call failed for ${endpoint}:`, error);
        throw error; // Re-throw so app.js can catch it and update the UI
    }
}

export const api = {
    /**
     * POST /api/create
     * Payload: { title, candidates }
     */
    createPoll: async (title, candidates) => {
        // TODO: Call apiCall() with POST and payload
        // Return { poll_id, admin_token }
    },

    /**
     * GET /api/poll/:poll_id
     */
    getPoll: async (pollId) => {
        // TODO: Call apiCall() with GET
        // Return poll state object
    },

    /**
     * POST /api/vote
     * Payload: { poll_id, voter_name, ranking }
     */
    submitVote: async (pollId, voterName, ranking) => {
        // TODO: Call apiCall() with POST and payload
    },

    /**
     * POST /api/close
     * Payload: { poll_id, admin_token }
     */
    closePoll: async (pollId, adminToken) => {
        // TODO: Call apiCall() with POST and payload
        // Return final calculated results
    }
};
