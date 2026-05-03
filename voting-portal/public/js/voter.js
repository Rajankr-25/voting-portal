// =========================================
// VotePortal — Voter Dashboard JS
// =========================================

let currentUser = null;
let selectedCandidateId = null;
let selectedCandidateData = null;
let electionStatus = 'pending';

async function init() {
  const res = await fetch('/auth/me');
  const data = await res.json();
  if (!data.loggedIn || data.role !== 'voter') {
    window.location.href = '/';
    return;
  }
  currentUser = data;

  // Set UI
  const initial = data.name.charAt(0).toUpperCase();
  document.getElementById('voter-name').textContent = data.name;
  document.getElementById('voter-avatar').textContent = initial;
  document.getElementById('profile-avatar').textContent = initial;
  document.getElementById('profile-name').textContent = data.name;
  document.getElementById('profile-voted').textContent = data.hasVoted ? '✅ Voted' : '⏳ Not yet voted';
  document.getElementById('profile-voted-for').textContent = data.hasVoted && data.votedFor ? `${data.votedFor.name} (${data.votedFor.party})` : '—';

  if (data.hasVoted && data.votedFor) {
    document.getElementById('voted-banner').style.display = 'flex';
    document.getElementById('voted-for-name').textContent = `${data.votedFor.name} (${data.votedFor.party})`;
  }

  await loadElection();
  await loadCandidates();
}

async function loadElection() {
  try {
    const res = await fetch('/api/election');
    const data = await res.json();
    const el = data.election || { status: 'pending', title: 'Election', description: '' };
    electionStatus = el.status;

    document.getElementById('election-title').textContent = el.title || 'Election';
    document.getElementById('election-desc').textContent = el.description || '';

    const badgeEl = document.getElementById('election-badge');
    const dot = badgeEl.querySelector('.badge-dot');
    const txt = document.getElementById('election-status-text');

    dot.className = 'badge-dot ' + el.status;
    if (el.status === 'active') txt.textContent = 'Election Active';
    else if (el.status === 'ended') txt.textContent = 'Election Ended';
    else txt.textContent = 'Not Started';
  } catch {}
}

async function loadCandidates() {
  const grid = document.getElementById('candidates-grid');
  const inactiveEl = document.getElementById('election-inactive');
  const section = document.getElementById('candidates-section');

  try {
    const res = await fetch('/api/candidates');
    const data = await res.json();
    const candidates = data.candidates || [];

    if (electionStatus === 'pending') {
      inactiveEl.style.display = 'flex';
      section.style.display = 'none';
      document.getElementById('inactive-title').textContent = 'Election Not Started';
      document.getElementById('inactive-msg').textContent = 'The election has not started yet. Please check back later.';
      return;
    }

    if (electionStatus === 'ended') {
      inactiveEl.style.display = 'flex';
      section.style.display = 'none';
      document.getElementById('inactive-title').textContent = 'Election Ended';
      document.getElementById('inactive-msg').textContent = 'The election has concluded. Check the Results tab to see the outcome.';
      return;
    }

    inactiveEl.style.display = 'none';
    section.style.display = 'block';

    if (candidates.length === 0) {
      grid.innerHTML = '<div class="loading-spinner">No candidates registered yet.</div>';
      return;
    }

    const hasVoted = currentUser?.hasVoted;
    grid.innerHTML = candidates.map(c => `
      <div class="candidate-card" style="--c-color:${c.color}" onclick="${hasVoted ? '' : `selectCandidate('${c._id}', '${esc(c.name)}', '${esc(c.party)}', '${esc(c.symbol)}')`}">
        <div class="cand-top">
          <div class="cand-symbol">${c.symbol || '⭐'}</div>
          <div class="cand-meta">
            <h3>${c.name}</h3>
            <div class="cand-party">${c.party}</div>
          </div>
        </div>
        ${c.bio ? `<div class="cand-bio">${c.bio}</div>` : ''}
        ${c.agenda ? `<div class="cand-agenda">📋 ${c.agenda}</div>` : ''}
        <button class="vote-btn" style="background:${c.color}" ${hasVoted ? 'disabled' : ''}>
          ${hasVoted ? '✓ Vote Cast' : 'Vote for ' + c.name}
        </button>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = '<div class="loading-spinner">Failed to load candidates.</div>';
  }
}

function esc(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function selectCandidate(id, name, party, symbol) {
  selectedCandidateId = id;
  document.getElementById('confirm-name').textContent = name;
  document.getElementById('confirm-party').textContent = party;
  document.getElementById('confirm-symbol').textContent = symbol || '⭐';
  document.getElementById('vote-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('vote-modal').style.display = 'none';
  selectedCandidateId = null;
}

async function confirmVote() {
  if (!selectedCandidateId) return;
  const msgEl = document.getElementById('vote-msg');

  try {
    const res = await fetch('/voter/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId: selectedCandidateId })
    });
    const data = await res.json();
    closeModal();

    if (data.success) {
      showMessage(msgEl, data.message, 'success');
      currentUser.hasVoted = true;
      await init();
    } else {
      showMessage(msgEl, data.message, 'error');
    }
  } catch {
    showMessage(msgEl, 'Failed to cast vote. Please try again.', 'error');
    closeModal();
  }
}

async function loadResults() {
  const container = document.getElementById('results-content');
  try {
    const res = await fetch('/api/results');
    const data = await res.json();

    if (!data.success) {
      container.innerHTML = `
        <div class="info-card">
          <div class="info-icon">🔒</div>
          <h3>Results Not Available</h3>
          <p>${data.message}</p>
        </div>`;
      return;
    }

    const total = data.totalVotes || 1;
    container.innerHTML = `
      <div class="results-summary">
        <div class="summary-box"><div class="val">${data.totalVotes}</div><div class="lbl">Total Votes</div></div>
        <div class="summary-box"><div class="val">${data.totalVoters}</div><div class="lbl">Registered Voters</div></div>
        <div class="summary-box"><div class="val">${data.totalVoters ? Math.round((data.totalVotes/data.totalVoters)*100) : 0}%</div><div class="lbl">Turnout</div></div>
      </div>
      <div class="results-list">
        ${data.candidates.map((c, i) => {
          const pct = total > 0 ? Math.round((c.voteCount / total) * 100) : 0;
          return `
            <div class="result-item ${i === 0 && c.voteCount > 0 ? 'winner' : ''}">
              <div class="result-header">
                <div class="result-cand">
                  <div class="result-sym">${c.symbol || '⭐'}</div>
                  <div>
                    <div class="result-name">${c.name} ${i === 0 && c.voteCount > 0 ? '<span class="winner-badge">🏆 LEADING</span>' : ''}</div>
                    <div class="result-party">${c.party}</div>
                  </div>
                </div>
                <div class="result-votes">${c.voteCount}</div>
              </div>
              <div class="result-bar-bg">
                <div class="result-bar" style="width:${pct}%;background:${c.color || '#6366f1'}"></div>
              </div>
              <div class="result-pct">${pct}%</div>
            </div>`;
        }).join('')}
      </div>`;
  } catch {
    container.innerHTML = '<div class="loading-spinner">Failed to load results.</div>';
  }
}

function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

  if (tab === 'results') loadResults();
}

async function logout() {
  await fetch('/auth/logout', { method: 'POST' });
  window.location.href = '/';
}

function showMessage(el, msg, type) {
  el.textContent = msg;
  el.className = 'vote-message ' + type;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

init();
