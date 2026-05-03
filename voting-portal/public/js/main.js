// =========================================
// VotePortal — Main JS (Landing & Auth)
// =========================================

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(id);
  if (page) page.classList.add('active');
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  btn.disabled = true;
  btn.innerHTML = '<span>Signing in...</span>';

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
      })
    });
    const data = await res.json();
    if (data.success) {
      if (data.role === 'admin') {
        window.location.href = '/pages/admin.html';
      } else {
        window.location.href = '/pages/voter.html';
      }
    } else {
      errEl.textContent = data.message;
    }
  } catch {
    errEl.textContent = 'Connection error. Please try again.';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Sign In</span>';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('reg-btn');
  const errEl = document.getElementById('reg-error');
  errEl.textContent = '';
  btn.disabled = true;
  btn.innerHTML = '<span>Creating account...</span>';

  try {
    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
        role: 'voter',
        adminKey: document.getElementById('reg-adminkey').value
      })
    });
    const data = await res.json();
    if (data.success) {
      if (data.role === 'admin') {
        window.location.href = '/pages/admin.html';
      } else {
        window.location.href = '/pages/voter.html';
      }
    } else {
      errEl.textContent = data.message;
    }
  } catch {
    errEl.textContent = 'Connection error. Please try again.';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Create Account</span>';
  }
}

async function loadHeroStats() {
  try {
    const [elRes, candRes] = await Promise.all([
      fetch('/api/election'),
      fetch('/api/candidates')
    ]);
    const elData = await elRes.json();
    const candData = await candRes.json();

    const statusMap = { pending: 'Pending', active: 'Active 🟢', ended: 'Ended' };
    document.getElementById('stat-candidates').textContent = candData.candidates?.length ?? '—';
    document.getElementById('stat-status').textContent = statusMap[elData.election?.status] || '—';

    if (elData.election?.status !== 'pending') {
      const rRes = await fetch('/api/results');
      const rData = await rRes.json();
      if (rData.success) {
        document.getElementById('stat-voters').textContent = rData.totalVoters;
      }
    } else {
      document.getElementById('stat-voters').textContent = '—';
    }
  } catch {}
}

// Check if already logged in
async function checkSession() {
  try {
    const res = await fetch('/auth/me');
    const data = await res.json();
    if (data.loggedIn) {
      window.location.href = data.role === 'admin' ? '/pages/admin.html' : '/pages/voter.html';
    }
  } catch {}
}

// Init
checkSession();
loadHeroStats();
