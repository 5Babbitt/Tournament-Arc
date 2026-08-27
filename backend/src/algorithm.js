export function calculateBlacksMethod(candidates, votes) {
    const numCandidates = candidates.length;
    const pairwise = {}; 
    
    candidates.forEach(a => {
        candidates.forEach(b => {
            if (a !== b) pairwise[`${a}|${b}`] = 0;
        });
    });

    // Count head-to-head matchups
    votes.forEach(vote => {
        const ranking = vote.ranking;
        for (let i = 0; i < ranking.length; i++) {
            for (let j = i + 1; j < ranking.length; j++) {
                const higher = ranking[i];
                const lower = ranking[j];
                if (pairwise[`${higher}|${lower}`] !== undefined) {
                    pairwise[`${higher}|${lower}`]++;
                }
            }
        }
    });

    // Step 1: Check for a Condorcet Winner
    let condorcetWinner = null;
    for (const candidate of candidates) {
        let undefeated = true;
        for (const opponent of candidates) {
            if (candidate === opponent) continue;
            const winsAgainst = pairwise[`${candidate}|${opponent}`] || 0;
            const losesTo = pairwise[`${opponent}|${candidate}`] || 0;
            if (winsAgainst <= losesTo) {
                undefeated = false;
                break;
            }
        }
        if (undefeated) {
            condorcetWinner = candidate;
            break;
        }
    }

    // Step 2: Calculate Borda Count Scores
    const bordaScores = {};
    candidates.forEach(c => bordaScores[c] = 0);

    votes.forEach(vote => {
        const ranking = vote.ranking;
        ranking.forEach((candidate, index) => {
            if (bordaScores[candidate] !== undefined) {
                bordaScores[candidate] += (numCandidates - 1 - index);
            }
        });
    });

    let winner = null;
    let winning_method = "";

    if (condorcetWinner) {
        winner = condorcetWinner;
        winning_method = "Condorcet Winner";
    } else {
        // Fallback to highest Borda score, accounting for ties
        let maxScore = -1;
        let tiedWinners = [];
        
        for (const [candidate, score] of Object.entries(bordaScores)) {
            if (score > maxScore) {
                maxScore = score;
                tiedWinners = [candidate]; 
            } else if (score === maxScore) {
                tiedWinners.push(candidate); 
            }
        }
        
        winner = tiedWinners.join(" & ");
        winning_method = tiedWinners.length > 1 ? "Borda Count (Tie)" : "Borda Count";
    }

    return {
        winner,
        winning_method,
        borda_scores: bordaScores
    };
}