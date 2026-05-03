// =========================================
// VotePortal — Admin Dashboard JS
// =========================================

let adminData = null;

async function init() {
  const res = await fetch('/auth/me');
  const data = await res.json();
  if (!data.loggedIn || data.role !== 'admin') {
    window.location.href = '/';
    return;
  }
  document.getElementById('admin-name').textContent = data.name;
  await loadOverview();
  await loadAdminCandidates();
  await loadElectionSettings();
}

// ---- Overview ----
async function loadOverview() {
  try {
    const res = await fetch('/api/admin/stats');
    const data = await res.json();
    if (!data.success) return;

    adminData = data;
    const { stats, election, candidates } = data;

    document.getElementById('election-title-overview').textContent = election.title || 'General Election';
    document.getElementById('stat-total-voters').textContent = stats.totalVoters;
    document.getElementById('stat-voted').textContent = stats.votedCount;
    document.getElementById('stat-turnout').textContent = stats.turnout + '%';
    document.getElementById('stat-candidates-count').textContent = candidates.length;

    // Badge
    const badge = document.getElementById('overview-badge');
    const dot = badge.querySelector('.badge-dot');
    const txt = document.getElementById('overview-status');
    dot.className = 'badge-dot ' + election.status;
    txt.textContent = election.status === 'active' ? 'Election Active' : election.status === 'ended' ? 'Election Ended' : 'Not Started';

    // Chart
    renderOverviewChart(candidates, stats.totalVotes);
  } catch (err) {
    console.error('loadOverview error:', err);
  }
}

function renderOverviewChart(candidates, total) {
  const container = document.getElementById('overview-chart');
  if (!candidates.length || total === 0) {
    container.innerHTML = `<div class="info-card"><p>No votes cast yet.</p></div>`;
    return;
  }
  container.innerHTML = `<div class="results-list">${candidates.map((c, i) => {
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
          <div class="result-votes">${c.voteCount} votes</div>
        </div>
        <div class="result-bar-bg">
          <div class="result-bar" style="width:${pct}%;background:${c.color || '#6366f1'}"></div>
        </div>
        <div class="result-pct">${pct}%</div>
      </div>`;
  }).join('')}</div>`;
}

// ---- Election Settings ----
async function loadElectionSettings() {
  try {
    const res = await fetch('/api/election');
    const data = await res.json();
    const el = data.election || { status: 'pending', title: '', description: '' };

    document.getElementById('el-title').value = el.title || '';
    document.getElementById('el-desc').value = el.description || '';

    // Status box
    const indicator = document.getElementById('status-indicator');
    const label = document.getElementById('status-label');
    const detail = document.getElementById('status-detail');
    indicator.className = 'status-indicator ' + el.status;

    if (el.status === 'active') {
      label.textContent = '🟢 Election is ACTIVE';
      detail.textContent = el.startedAt ? 'Started: ' + new Date(el.startedAt).toLocaleString() : '';
    } else if (el.status === 'ended') {
      label.textContent = '🔴 Election has ENDED';
      detail.textContent = el.endedAt ? 'Ended: ' + new Date(el.endedAt).toLocaleString() : '';
    } else {
      label.textContent = '⏳ Election is PENDING';
      detail.textContent = 'Start the election when ready.';
    }

    // Button states
    const btnStart = document.getElementById('btn-start');
    const btnStop = document.getElementById('btn-stop');
    btnStart.disabled = el.status === 'active';
    btnStop.disabled = el.status !== 'active';
    btnStart.style.opacity = el.status === 'active' ? '0.4' : '1';
    btnStop.style.opacity = el.status !== 'active' ? '0.4' : '1';
  } catch (err) {
    console.error('loadElectionSettings error:', err);
  }
}

async function updateElectionSettings() {
  const title = document.getElementById('el-title').value;
  const description = document.getElementById('el-desc').value;
  const msgEl = document.getElementById('election-msg');

  try {
    const res = await fetch('/admin/election', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description })
    });
    const data = await res.json();
    if (data.success) {
      showMessage(msgEl, 'Election settings saved!', 'success');
      await loadOverview();
    } else {
      showMessage(msgEl, data.message, 'error');
    }
  } catch {
    showMessage(msgEl, 'Failed to save settings.', 'error');
  }
}

async function controlElection(action) {
  const msgEl = document.getElementById('election-msg');
  if (action === 'reset') {
    if (!confirm('⚠️ This will clear ALL votes and reset voter records. This cannot be undone. Are you sure?')) return;
  }

  try {
    const res = await fetch('/admin/election/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    if (data.success) {
      const msgs = { start: 'Election started successfully! ✅', stop: 'Election ended. 🔴', reset: 'All data reset. ↺' };
      showMessage(msgEl, msgs[action], 'success');
      await loadElectionSettings();
      await loadOverview();
    } else {
      showMessage(msgEl, data.message, 'error');
    }
  } catch {
    showMessage(msgEl, 'Failed to update election.', 'error');
  }
}

// ---- Candidates ----
async function loadAdminCandidates() {
  const grid = document.getElementById('admin-candidates-grid');
  try {
    const res = await fetch('/api/candidates');
    const data = await res.json();
    const candidates = data.candidates || [];

    if (!candidates.length) {
      grid.innerHTML = `<div class="info-card" style="grid-column:1/-1"><div class="info-icon">👥</div><h3>No Candidates Yet</h3><p>Add candidates using the button above.</p></div>`;
      return;
    }

    grid.innerHTML = candidates.map(c => `
      <div class="admin-cand-card" style="--c-color:${c.color}">
        <div class="admin-cand-top">
          <div class="admin-cand-info">
            <h3>${c.name}</h3>
            <span>${c.party}</span>
          </div>
          <div class="admin-cand-sym">${c.symbol || '⭐'}</div>
        </div>
        ${c.bio ? `<p style="font-size:0.83rem;color:var(--text-muted);margin-bottom:0.75rem">${c.bio}</p>` : ''}
        <div class="cand-votes-admin">${c.voteCount}</div>
        <div class="cand-votes-lbl">votes received</div>
        <button class="delete-btn" onclick="deleteCandidate('${c._id}', '${esc(c.name)}')">🗑 Remove Candidate</button>
      </div>
    `).join('');
  } catch {
    grid.innerHTML = '<div class="loading-spinner">Failed to load candidates.</div>';
  }
}

function toggleAddForm() {
  const form = document.getElementById('add-form-card');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function addCandidate() {
  const msgEl = document.getElementById('add-cand-msg');
  const name = document.getElementById('c-name').value.trim();
  const party = document.getElementById('c-party').value.trim();
  const symbol = document.getElementById('c-symbol').value.trim() || '⭐';
  const color = document.getElementById('c-color').value;
  const bio = document.getElementById('c-bio').value.trim();
  const agenda = document.getElementById('c-agenda').value.trim();

  if (!name || !party) {
    showMessage(msgEl, 'Name and party are required.', 'error');
    return;
  }

  try {
    const res = await fetch('/admin/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, party, symbol, color, bio, agenda })
    });
    const data = await res.json();
    if (data.success) {
      showMessage(msgEl, `${name} added successfully!`, 'success');
      ['c-name','c-party','c-symbol','c-bio','c-agenda'].forEach(id => document.getElementById(id).value = '');
      document.getElementById('c-color').value = '#4f46e5';
      await loadAdminCandidates();
      await loadOverview();
      setTimeout(() => toggleAddForm(), 1500);
    } else {
      showMessage(msgEl, data.message, 'error');
    }
  } catch {
    showMessage(msgEl, 'Failed to add candidate.', 'error');
  }
}

async function deleteCandidate(id, name) {
  if (!confirm(`Remove "${name}" from the election? This cannot be undone.`)) return;
  try {
    const res = await fetch(`/admin/candidates/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      await loadAdminCandidates();
      await loadOverview();
    } else {
      alert(data.message);
    }
  } catch {
    alert('Failed to delete candidate.');
  }
}

// ---- Voters ----
async function loadVoters() {
  const tbody = document.getElementById('voters-tbody');
  try {
    const res = await fetch('/admin/voters');
    const data = await res.json();
    const voters = data.voters || [];

    if (!voters.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;opacity:0.5">No registered voters yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = voters.map((v, i) => `
      <tr>
        <td style="color:var(--text-muted)">${i + 1}</td>
        <td><strong>${v.name}</strong></td>
        <td style="color:var(--text-muted)">${v.email}</td>
        <td><span class="voted-pill ${v.hasVoted ? 'yes' : 'no'}">${v.hasVoted ? '✓ Voted' : 'Not voted'}</span></td>
        <td style="color:var(--text-muted)">${v.votedFor ? v.votedFor.name + ' (' + v.votedFor.party + ')' : '—'}</td>
        <td style="color:var(--text-muted)">${new Date(v.registeredAt).toLocaleDateString()}</td>
      </tr>
    `).join('');
  } catch {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--danger)">Failed to load voters.</td></tr>`;
  }
}

// ---- Results ----
async function loadResults() {
  const container = document.getElementById('admin-results-content');
  try {
    const res = await fetch('/api/admin/stats');
    const data = await res.json();
    if (!data.success) return;

    const { stats, candidates, election } = data;
    const total = stats.totalVotes || 0;

    if (election.status === 'pending') {
      container.innerHTML = `<div class="info-card"><div class="info-icon">⏳</div><h3>Election Not Started</h3><p>Start the election to see live results.</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="results-summary">
        <div class="summary-box"><div class="val">${stats.totalVotes}</div><div class="lbl">Total Votes</div></div>
        <div class="summary-box"><div class="val">${stats.totalVoters}</div><div class="lbl">Registered Voters</div></div>
        <div class="summary-box"><div class="val">${stats.turnout}%</div><div class="lbl">Turnout</div></div>
        <div class="summary-box"><div class="val">${stats.votedCount}</div><div class="lbl">Votes Cast</div></div>
      </div>
      <div class="results-list">
        ${candidates.map((c, i) => {
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
                <div class="result-votes">${c.voteCount} votes</div>
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

// ---- Tab Switching ----
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

  if (tab === 'overview') loadOverview();
  if (tab === 'election') loadElectionSettings();
  if (tab === 'candidates') loadAdminCandidates();
  if (tab === 'voters') loadVoters();
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

function esc(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Auto-refresh every 30s when on results/overview
setInterval(() => {
  const activeTab = document.querySelector('.tab-content.active');
  if (!activeTab) return;
  const id = activeTab.id;
  if (id === 'tab-overview') loadOverview();
  if (id === 'tab-results') loadResults();
}, 30000);

init();
