import { api } from './api.js';

// Application State
const state = {
  pollId: null,
  adminToken: null,
  candidates: [],
  // You can add more state variables here if needed
};
const MAX_CANDIDATES = 20;

let sortableInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  setupEventListeners();

  // Parse URL for a poll ID
  const urlParams = new URLSearchParams(window.location.search);
  const pollId = urlParams.get("poll");

  if (pollId) {
	state.pollId = pollId;
	// Check if we have an admin token for this poll in localStorage
	state.adminToken = localStorage.getItem(`admin_${pollId}`);

	loadPollData(pollId);
  } else {
	// No poll ID, show creation screen
	showView("createView");
  }
}

function showView(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
    });
    // Show the target view
    document.getElementById(viewId).classList.remove('hidden');
}

function setupEventListeners() {
    // --- Create View ---
    document.getElementById('addCandidateBtn').addEventListener('click', handleAddCandidateRow);
    document.getElementById('createBtn').addEventListener('click', handleCreatePoll);
    
    // Event Delegation for removing candidate rows dynamically
    document.getElementById('candidateInputs').addEventListener('click', (e) => {
        if (e.target.classList.contains('removeBtn')) {
            handleRemoveCandidateRow(e.target);
        }
    });

    // --- Vote View ---
    document.getElementById('submitVoteBtn').addEventListener('click', handleSubmitVote);
    document.getElementById('closePollBtn').addEventListener('click', handleClosePoll);
}

// Dynamic UI Functions (Create View)
function handleAddCandidateRow() {
	const existingRows = candidateInputs.querySelectorAll('.candidateRow');

	if (existingRows.length >= MAX_CANDIDATES){
		console.warn("Too many candidates")
		return
	}

	const row = document.createElement('div')
	row.className = 'candidateRow'

	const input = document.createElement('input')
	input.type = 'text'
	input.className = 'candidateVal'
	input.placeholder = `Candidate ${existingRows.length + 1}`

	const removeBtn = document.createElement('button')
	removeBtn.type = 'button'
	removeBtn.className = 'removeBtn'
	removeBtn.textContent = '✕'

	row.append(input, removeBtn)
	candidateInputs.appendChild(row)
}

function handleRemoveCandidateRow(buttonElement) {
    const row = buttonElement.closest('.candidateRow');
    row.remove();
}

// API Interaction & Logic Handlers
async function handleCreatePoll() {
    // TODO: 
    // 1. Grab poll title and all candidate values from the DOM.
    // 2. Validate inputs (e.g., no empty fields, at least 2 candidates).
    // 3. POST to /api/create (using your api.js).
    // 4. Save the returned admin_token to localStorage: localStorage.setItem(`admin_${poll_id}`, token).
    // 5. Update URL to include ?poll=new_id (using window.history.pushState or window.location.href).
    // 6. Call loadPollData(new_id).

	const pollTitle = document.getElementById('pollTitle').value.trim();
    const expiry = parseInt(document.getElementById('pollExpiry').value, 10);
    const candidateInputs = document.querySelectorAll('.candidateVal');

	const candidates = Array.from(candidateInputs)
		.map(input => input.value.trim())
		.filter(val => val.length > 0)

	if (!pollTitle) {
		alert('Please enter poll title')
		return
	}

	console.log(candidateInputs)
	console.log(candidates)
	console.log(candidates.length)

	if (candidates.length < 2 || candidates.length > 20) {
        alert('You must provide between 2 to 20 candidates.')
        return
    }

	try {
		// POST to /api/create 
		const response = await api.createPoll(pollTitle, candidates, expiry)
		const { poll_id, admin_token } = response

		localStorage.setItem(`admin_${poll_id}`, admin_token)

		state.pollId = poll_id
		state.adminToken = admin_token

		const newUrl = `${window.location.pathname}?poll=${poll_id}`
		window.history.pushState({ pollID: poll_id }, '', newUrl)

		await loadPollData(poll_id)
	} catch (error) {
		console.error('Failed to create poll:', error)
		alert(`Error creating poll: ${error.message}`)
	}
}

async function loadPollData(pollId) {
    // TODO: 
    // 1. Show a loading state if desired.
    // 2. GET /api/poll/:poll_id
    // 3. If 404 -> Show an error or redirect to home.
    // 4. If status === 'open' -> Populate #sortableList, initSortable(), toggle Admin button visibility based on state.adminToken, and showView('voteView').
    // 5. If status === 'closed' -> Populate results table and showView('resultsView').
	try {
		document.getElementById('votePollTitle').innerText = 'Loading poll...';
		showView('voteView'); // Briefly show vote view as a container while loading
		
		// GET /api/poll/:poll_id using your api client
		const pollData = await api.getPoll(pollId);

		if (pollData.status === 'open') {
			document.getElementById('votePollTitle').innerText = pollData.title
			
			// Populate #sortableList with candidates
            const sortableList = document.getElementById('sortableList');
            sortableList.innerHTML = ''; // Clear previous items if any

            pollData.candidates.forEach(candidate => {
                const li = document.createElement('li');
                li.innerText = candidate;
                sortableList.appendChild(li);
            });

            // Initialize SortableJS for drag-and-drop ranking
            initSortable();

			// Toggle Admin button visibility: Only show if user's adminToken matches this poll
            const closeBtn = document.getElementById('closePollBtn');
            if (state.adminToken) {
                closeBtn.classList.remove('hidden');
            } else {
                closeBtn.classList.add('hidden');
            }
			
			// Show the voting view
            showView('voteView');
		} else if (pollData.status === 'closed') {
			document.getElementById('winnerName').innerText = pollData.winner || 'Tied / No Winner'
			document.getElementById('winningMethod').innerText = pollData.winning_method || 'Unknown'
		
			const tableBody = document.getElementById('resultsTableBody')
			tableBody.innerHTML = ''

			const sortedScores = Object.entries(pollData.borda_scores || {})
				.sort(([, scoreA], [, scoreB]) => scoreB - scoreA)

			sortedScores.forEach(([candidate, score], index) => {
				const tableRow = document.createElement('tr')
				tableRow.innerHTML = `
					<td>${index + 1}</td>
					<td>${escapeHTML(candidate)}</td>
					<td>${score}</td>
				`
				tableBody.appendChild(tableRow)
			})

			showView('resultsView')
		}
	} catch (error) {
		console.error('Error loading poll:', error)
		alert('This poll could not be found, has expired, or the link is invalid.');
		
		window.history.pushState({}, '', window.location.pathname)
		showView('createView')
	}
}

async function handleSubmitVote() {
    // TODO:
    // 1. Grab voter name.
    // 2. Extract current ranking from the DOM (e.g., looping through #sortableList children).
    // 3. POST to /api/vote.
    // 4. Show success message to the user.
	const voterName = document.getElementById('voterName').value.trim();
    
    if (!voterName) {
        alert('Please enter your name before submitting your vote.');
        return;
    }

    // Extract current order from the DOM list elements
    const sortableList = document.getElementById('sortableList');
    const ranking = Array.from(sortableList.children).map(li => li.innerText.trim());

    if (ranking.length === 0) {
        alert('No candidates available to rank.');
        return;
    }

    try {
        await api.submitVote(state.pollId, voterName, ranking);
        alert('Your vote has been successfully cast!');
        document.getElementById('voterName').value = ''; // Reset name input
    } catch (error) {
        console.error('Failed to submit vote:', error);
        alert(`Error submitting vote: ${error.message}`);
    }
}

async function handleClosePoll() {
    // TODO:
    // 1. Confirm with the user (e.g., window.confirm).
    // 2. POST to /api/close using state.pollId and state.adminToken.
    // 3. Once successful, pass the returned results to a function that renders the results table.
    // 4. showView('resultsView').

	if (!window.confirm('Are you sure you want to close this poll? New votes will no longer be accepted.')) {
        return;
    }

    try {
        const results = await api.closePoll(state.pollId, state.adminToken);

        // Populate results fields directly with returned calculation data
        document.getElementById('winnerName').innerText = results.winner || 'Tied / No Winner';
        document.getElementById('winningMethod').innerText = results.winning_method || 'Unknown';

        const tableBody = document.getElementById('resultsTableBody');
        tableBody.innerHTML = '';

        const sortedScores = Object.entries(results.borda_scores || {})
            .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);

        sortedScores.forEach(([candidate, score], index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${escapeHTML(candidate)}</td>
                <td>${score}</td>
            `;
            tableBody.appendChild(tr);
        });

        showView('resultsView');
    } catch (error) {
        console.error('Failed to close poll:', error);
        alert(`Error closing poll: ${error.message}`);
    }
}

// Sortable List
function initSortable() {
    // TODO:
    // 1. Get the #sortableList element.
    // 2. Instantiate new Sortable(element, { animation: 150, ghostClass: 'sortable-ghost' });

	const sortableList = document.getElementById('sortableList');
    
    if (sortableInstance) {
        sortableInstance.destroy();
    }

    sortableInstance = new Sortable(sortableList, {
        animation: 150,
        ghostClass: 'sortable-ghost'
    });
}

// Helper function to safely escape HTML and prevent basic XSS
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}