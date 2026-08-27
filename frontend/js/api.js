const API_BASE = 'https://tournament-arc-api.owen-harbert2.workers.dev/api';

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
        return await apiCall('/create', 'POST', { title, candidates });
    },

    /**
     * GET /api/poll/:poll_id
     */
    getPoll: async (pollId) => {
        return await apiCall(`/poll/${pollId}`, 'GET');
    },

    /**
     * POST /api/vote
     * Payload: { poll_id, voter_name, ranking }
     */
    submitVote: async (pollId, voterName, ranking) => {
        return await apiCall('/vote', 'POST', { poll_id: pollId, voter_name: voterName, ranking });
    },

    /**
     * POST /api/close
     * Payload: { poll_id, admin_token }
     */
    closePoll: async (pollId, adminToken) => {
        return await apiCall('/close', 'POST', { poll_id: pollId, admin_token: adminToken });
    }
};
