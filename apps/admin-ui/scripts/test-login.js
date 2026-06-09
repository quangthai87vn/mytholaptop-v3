// Test script for login/auth flow
const http = require('http');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const data = options.body ? JSON.stringify(options.body) : null;
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {},
    };
    if (data) {
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(data);
    }
    if (options.cookie) {
      reqOptions.headers['Cookie'] = options.cookie;
    }
    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        const setCookie = res.headers['set-cookie'];
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body), setCookie });
        } catch {
          resolve({ status: res.statusCode, body, setCookie });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  // ── Test 1: Login ──────────────────────────────────────────────
  console.log('=== TEST 1: Login (correct credentials) ===');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@mtl.vn', password: 'Mtl@2026!' },
  });
  console.log('Status:', loginRes.status);
  console.log('Body:', JSON.stringify(loginRes.body, null, 2));
  if (loginRes.setCookie) {
    console.log('Set-Cookie:', loginRes.setCookie);
  }

  // Extract session cookie
  let sessionCookie = null;
  if (loginRes.setCookie) {
    sessionCookie = loginRes.setCookie.map(function(c) { return c.split(';')[0]; }).join('; ');
  }

  // ── Test 2: /api/auth/me WITH session ────────────────────────────
  if (sessionCookie) {
    console.log('\n=== TEST 2: /api/auth/me (with session) ===');
    const meRes = await fetch('http://localhost:3000/api/auth/me', {
      cookie: sessionCookie,
    });
    console.log('Status:', meRes.status);
    console.log('Body:', JSON.stringify(meRes.body, null, 2));
    const bodyStr = JSON.stringify(meRes.body);
    const safe = !bodyStr.includes('password_hash') &&
                 !bodyStr.includes('apiKey');
    console.log('Safe (no secrets):', safe ? 'YES ✅' : 'NO ❌');
  } else {
    console.log('\n=== TEST 2: SKIP (no session cookie)');
  }

  // ── Test 3: /api/auth/me WITHOUT session ──────────────────────
  console.log('\n=== TEST 3: /api/auth/me (NO session) ===');
  const meRes2 = await fetch('http://localhost:3000/api/auth/me');
  console.log('Status:', meRes2.status, meRes2.status === 401 ? '✅ (401 expected)' : '❌ (should be 401)');
  console.log('Body:', JSON.stringify(meRes2.body, null, 2));

  // ── Test 4: POST /api/tasks WITHOUT session ──────────────────
  console.log('\n=== TEST 4: POST /api/tasks (NO session) ===');
  const taskRes = await fetch('http://localhost:3000/api/tasks', {
    method: 'POST',
    body: { title: 'Test Task', status: 'todo', priority: 'high' },
  });
  console.log('Status:', taskRes.status, taskRes.status === 401 ? '✅ (401 expected)' : '❌ (should be 401)');
  console.log('Body:', JSON.stringify(taskRes.body, null, 2));

  // ── Test 5: POST /api/tasks WITH session ──────────────────────
  if (sessionCookie) {
    console.log('\n=== TEST 5: POST /api/tasks (with session) ===');
    const taskRes2 = await fetch('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: { title: 'Test Task from API', status: 'todo', priority: 'high' },
      cookie: sessionCookie,
    });
    console.log('Status:', taskRes2.status, taskRes2.status === 201 ? '✅ (201 expected)' : '⚠️ ' + taskRes2.status);
    console.log('Body:', JSON.stringify(taskRes2.body, null, 2));
  }

  // ── Test 6: Logout ────────────────────────────────────────────
  if (sessionCookie) {
    console.log('\n=== TEST 6: Logout ===');
    const logoutRes = await fetch('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      cookie: sessionCookie,
    });
    console.log('Status:', logoutRes.status);
    console.log('Body:', JSON.stringify(logoutRes.body, null, 2));
    console.log('Clear-Cookie:', logoutRes.setCookie ? 'YES ✅' : 'NO');

    // ── Test 7: /api/auth/me AFTER logout ──────────────────────
    console.log('\n=== TEST 7: /api/auth/me AFTER logout ===');
    const afterLogout = await fetch('http://localhost:3000/api/auth/me', {
      cookie: sessionCookie,
    });
    console.log('Status:', afterLogout.status, afterLogout.status === 401 ? '✅ (401 expected)' : '❌');
    console.log('Body:', JSON.stringify(afterLogout.body, null, 2));
  }

  console.log('\n=== DONE ===');
}

main().catch(function(err) {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
