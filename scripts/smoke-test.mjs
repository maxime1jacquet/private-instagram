import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';

const base = new URL(process.argv[2] || 'http://127.0.0.1:18080');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname),
  'Ce test crée puis supprime des comptes : utiliser un serveur local isolé.');
const accounts = [];

async function request(path, { method = 'GET', token, data } = {}) {
  // Keep auth checks below PocketBase's default limit of 2 requests per 3 seconds.
  if (path.includes('/auth-')) await setTimeout(1600);
  return fetch(new URL(path, base), {
    method,
    headers: { ...(token ? { Authorization: token } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) },
    body: data ? JSON.stringify(data) : undefined,
    signal: AbortSignal.timeout(10000),
  });
}

try {
  let healthy = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await request('/api/health')).ok) { healthy = true; break; }
    } catch { /* Container still starting. */ }
    await setTimeout(1000);
  }
  assert(healthy, 'PocketBase ne répond pas après 60 secondes.');
  for (const path of ['/', '/auth/login', '/auth/register', '/account', '/voyages', '/voyages/fixturetrip0001', '/voyages/fixturetrip0001/etapes/fixturepost0001']) {
    const response = await request(path);
    assert.equal(response.status, 200, 'Route SPA inaccessible: ' + path);
    assert.match(await response.text(), /<app-root/);
  }
  assert.equal((await request('/_/')).status, 200, 'Dashboard PocketBase inaccessible.');
  const unknownApi = await request('/api/does-not-exist');
  assert.equal(unknownApi.status, 404, 'Le fallback SPA ne doit pas masquer les erreurs API.');

  for (let i = 0; i < 2; i++) {
    const email = 'starter-' + randomUUID() + '@example.test';
    const name = 'Member-' + randomUUID();
    const password = randomUUID() + '-Password';
    const create = await request('/api/collections/users/records', {
      method: 'POST', data: { name, email, password, passwordConfirm: password },
    });
    assert.equal(create.status, 200, 'Inscription impossible.');
    const user = await create.json();
    const login = await request('/api/collections/users/auth-with-password', {
      method: 'POST', data: { identity: name.toLowerCase(), password },
    });
    assert.equal(login.status, 200, 'Connexion impossible.');
    const { token } = await login.json();
    accounts.push({ id: user.id, token });
    assert.equal((await request('/api/collections/users/auth-with-password', {
      method: 'POST', data: { identity: email, password },
    })).status, 400, 'La connexion par e-mail doit être refusée.');
    assert.equal((await request('/api/collections/users/auth-with-password', {
      method: 'POST', data: { identity: name, password: 'Wrong-password' },
    })).status, 400, 'Un mauvais mot de passe doit être refusé.');
    assert.equal((await request('/api/collections/users/records', {
      method: 'POST', data: {
        name: name.toLowerCase(), email: 'duplicate-' + randomUUID() + '@example.test',
        password, passwordConfirm: password,
      },
    })).status, 400, 'Un prénom déjà utilisé doit être refusé.');
  }
  const [a, b] = accounts;
  const collection = '/api/collections/users/records';
  assert.equal((await request(collection + '/' + a.id)).status, 404);
  assert.equal((await request(collection + '/' + a.id, { token: a.token })).status, 200);
  assert.equal((await request(collection + '/' + b.id, { token: a.token })).status, 404);
  assert.equal((await request(collection + '/' + b.id, {
    method: 'PATCH', token: a.token, data: { name: 'Not allowed' },
  })).status, 404);
  assert.equal((await request(collection + '/' + b.id, {
    method: 'DELETE', token: a.token,
  })).status, 404);
  const ownList = await request(collection, { token: a.token });
  assert.equal((await ownList.json()).items.length, 1);
  const refresh = await request('/api/collections/users/auth-refresh', { method: 'POST', token: a.token });
  assert.equal(refresh.status, 200);
  console.log('OK: routes SPA, dashboard, inscription, connexion, session et isolation des utilisateurs.');
} finally {
  for (const account of accounts) {
    const response = await request('/api/collections/users/records/' + account.id, {
      method: 'DELETE', token: account.token,
    });
    assert.equal(response.status, 204, 'Nettoyage du compte de test impossible.');
  }
}
