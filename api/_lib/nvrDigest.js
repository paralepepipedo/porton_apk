const crypto = require('crypto');

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex');
}

function parseDigestHeader(header) {
  const result = {};
  const regex = /(\w+)=(?:"([^"]*)"|([^,\s]+))/g;
  let m;
  while ((m = regex.exec(header)) !== null) {
    result[m[1]] = m[2] !== undefined ? m[2] : m[3];
  }
  return result;
}

// Hace una petición HTTP con autenticación Digest (RFC 2617), igual a lo que
// hacia requests.auth.HTTPDigestAuth en el backend Flask original. Sin
// dependencias externas: usa solo crypto (nativo de Node) y fetch (nativo).
async function digestFetch(url, { method = 'GET', username, password } = {}) {
  const u = new URL(url);
  const pathWithQuery = u.pathname + u.search;

  const first = await fetch(url, { method });
  if (first.status !== 401) {
    return first;
  }

  const authHeader = first.headers.get('www-authenticate');
  if (!authHeader || !authHeader.toLowerCase().startsWith('digest')) {
    return first;
  }

  const params = parseDigestHeader(authHeader);
  const realm = params.realm;
  const nonce = params.nonce;
  const qop = params.qop;
  const opaque = params.opaque;

  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method}:${pathWithQuery}`);

  const nc = '00000001';
  const cnonce = crypto.randomBytes(8).toString('hex');

  let response, authValue;
  if (qop) {
    response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
    authValue = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${pathWithQuery}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"` +
      (opaque ? `, opaque="${opaque}"` : '');
  } else {
    response = md5(`${ha1}:${nonce}:${ha2}`);
    authValue = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${pathWithQuery}", response="${response}"` +
      (opaque ? `, opaque="${opaque}"` : '');
  }

  return fetch(url, { method, headers: { Authorization: authValue } });
}

module.exports = { digestFetch };
