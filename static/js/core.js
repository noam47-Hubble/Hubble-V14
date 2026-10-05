/* HUBBLE v14 — core: helpers, API, router, socket, shared UI pieces */
(function () {
  const H = window.H = { me: null, routes: {}, sock: null, screen: null, cleanup: null, beforeLeave: null, sockScreen: {}, sockGlobal: {} };

  /* ---------- tiny helpers ---------- */
  H.$ = (sel, root) => (root || document).querySelector(sel);
  H.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  H.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  H.el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const pad = n => String(n).padStart(2, '0');
  H.fmt = ts => { const d = new Date(ts * 1000); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  H.COLORS = ['#2D8CE6', '#7F77DD', '#1D9E75', '#D85A30', '#BA7517', '#D4537E', '#378ADD', '#639922'];
  H.colorOf = id => H.COLORS[[...String(id || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0) % H.COLORS.length];

  /* ---------- icons ---------- */
  const P = {
    star: '<polygon points="12 2 15.1 8.6 22 9.3 16.8 14 18.2 21 12 17.5 5.8 21 7.2 14 2 9.3 8.9 8.6 12 2"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    cards: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    pin: '<line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/>',
    clip: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    img: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/>',
    walk: '<circle cx="13" cy="4" r="2"/><path d="M7 21l3-7-2-3 3-3 3 3h3"/><path d="M10 14l3 3v4"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/>',
    map: '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    hand: '<path d="M11 17l2 2a1 1 0 0 0 3-3"/><path d="M14 14l2.5 2.5a1 1 0 0 0 3-3L15 9"/><path d="M3 11l4-4 4 1 3-1 3 3"/><path d="M3 11l5 5a1 1 0 0 0 3-3"/>',
    board: '<rect x="3" y="3" width="18" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    chatoff: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="4" y1="4" x2="20" y2="20"/>',
    back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2H18a4 4 0 0 0 4-4c0-5.5-4.5-9.4-10-9.4z"/>',
    pinloc: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
    lines: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="16" y2="12"/><line x1="4" y1="18" x2="12" y2="18"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .6 2.9a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.5 2.9.6a2 2 0 0 1 1.8 2.1z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  };
  H.ic = (name, size = 20, extra = '') => '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' + extra + '>' + (P[name] || '') + '</svg>';
  H.starSvg = on => '<svg viewBox="0 0 24 24" width="22" height="22" fill="' + (on ? '#f4c273' : 'none') + '" stroke="' + (on ? '#e8a33d' : '#9db0d6') + '" stroke-width="2"><polygon points="12 2 15.1 8.6 22 9.3 16.8 14 18.2 21 12 17.5 5.8 21 7.2 14 2 9.3 8.9 8.6 12 2"/></svg>';

  /* ---------- avatar ---------- */
  H.avatar = (photo, name, id, cls) => {
    const ch = H.esc(String(name || '?').trim()[0] || '?');
    if (photo) return '<div class="av ' + (cls || '') + '" style="background-image:url(\'' + H.esc(photo) + '\')"></div>';
    return '<div class="av ' + (cls || '') + '" style="background:' + H.colorOf(id || name) + '">' + ch + '</div>';
  };

  /* ---------- images (resize → data URL) ---------- */
  H.readImage = (file, maxDim = 900, quality = 0.82) => new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const fr = new FileReader();
    fr.onerror = reject;
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(fr.result);
      img.onload = () => {
        let { width: w, height: h } = img;
        const k = Math.min(1, maxDim / Math.max(w, h));
        if (k >= 1 && file.size < 300000) return resolve(fr.result);
        w = Math.round(w * k); h = Math.round(h * k);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });

  /* ---------- API ---------- */
  H.api = async (method, url, body) => {
    const opt = { method, headers: {}, credentials: 'same-origin' };
    if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    let r;
    try { r = await fetch(url, opt); } catch (e) { const er = new Error('אין חיבור לשרת'); er.data = {}; throw er; }
    let data = {};
    try { data = await r.json(); } catch (e) { /* empty */ }
    if (!r.ok) { const er = new Error(data.error || 'שגיאה'); er.data = data; er.status = r.status; throw er; }
    return data;
  };
  H.get = url => H.api('GET', url);
  H.post = (url, b) => H.api('POST', url, b || {});
  H.put = (url, b) => H.api('PUT', url, b || {});
  H.del = url => H.api('DELETE', url);

  /* ---------- toast / modal ---------- */
  let tt;
  H.toast = (msg, ms = 3200) => {
    const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), ms);
  };
  H.modal = (opts) => {
    const ov = H.el('<div class="ov"><div class="modal ' + (opts.wide ? 'wide' : '') + ' ' + (opts.cls || '') + '"></div></div>');
    const box = ov.firstElementChild;
    let html = '';
    if (opts.title) html += '<h2>' + opts.title + '</h2>';
    if (typeof opts.body === 'string') html += opts.body;
    box.innerHTML = html;
    if (opts.body && typeof opts.body !== 'string') box.appendChild(opts.body);
    const host = H.screenRoot && H.screenRoot.classList.contains('hubscr') ? H.screenRoot : document.getElementById('app');
    const close = () => { ov.remove(); if (opts.onClose) opts.onClose(); };
    if (opts.actions) {
      const bar = H.el('<div class="m-actions"></div>');
      opts.actions.forEach(a => {
        const b = H.el('<button class="btn ' + (a.cls || '') + '">' + a.label + '</button>');
        b.onclick = async () => { if (a.onClick) { const r = await a.onClick(close, box); if (r === false) return; } if (a.close !== false) close(); };
        bar.appendChild(b);
      });
      box.appendChild(bar);
    }
    if (opts.dismiss !== false) ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
    host.appendChild(ov);
    return { el: box, ov, close };
  };
  H.confirm = (msg, okLabel = 'אישור', danger = false, title = '') => new Promise(res => {
    H.modal({
      title, body: '<p>' + msg + '</p>', dismiss: true, onClose: () => res(false),
      actions: [{ label: 'ביטול', onClick: () => { res(false); } },
        { label: okLabel, cls: danger ? 'danger solid' : 'primary', onClick: (close) => { res(true); } }]
    });
  });
  H.prompt = (title, placeholder = '', initial = '') => new Promise(res => {
    let done = false;
    const m = H.modal({
      title, body: '<input class="field-in" id="pmIn" type="text" placeholder="' + H.esc(placeholder) + '" value="' + H.esc(initial) + '">',
      onClose: () => { if (!done) res(null); },
      actions: [{ label: 'ביטול', onClick: () => { } },
        { label: 'אישור', cls: 'primary', onClick: (close, box) => { done = true; res(box.querySelector('#pmIn').value.trim()); } }]
    });
    const inp = m.el.querySelector('#pmIn'); inp.focus();
    inp.onkeydown = e => { if (e.key === 'Enter') { done = true; res(inp.value.trim()); m.close(); } };
  });

  /* ---------- sockets ---------- */
  H.connectSocket = () => {
    if (H.sock) return H.sock;
    H.sock = io({ transports: ['websocket', 'polling'] });
    H.sock.onAny((ev, ...args) => {
      (H.sockGlobal[ev] || []).forEach(f => { try { f(...args); } catch (e) { console.error(e); } });
      (H.sockScreen[ev] || []).forEach(f => { try { f(...args); } catch (e) { console.error(e); } });
    });
    return H.sock;
  };
  H.onSock = (ev, fn) => { (H.sockScreen[ev] = H.sockScreen[ev] || []).push(fn); };
  H.onSockGlobal = (ev, fn) => { (H.sockGlobal[ev] = H.sockGlobal[ev] || []).push(fn); };
  H.emit = (ev, data) => { H.connectSocket().emit(ev, data || {}); };

  /* ---------- me / unread ---------- */
  H.refreshMe = async () => { H.me = await H.get('/api/me'); return H.me; };
  H.setUnread = n => {
    if (H.me) H.me.unread = n;
    H.$$('[data-unread]').forEach(b => { b.textContent = n; b.classList.toggle('hidden', !n); });
  };
  H.onSockGlobal('private_message', m => {
    if (!m.mine && H.me) {
      H.setUnread((H.me.unread || 0) + 1);
      if (!H.suppressPmToast) H.toast('הודעה פרטית חדשה' + (m.sender_name ? ' מ' + m.sender_name : ''));
    }
  });
  H.onSockGlobal('unread_changed', async () => { try { const r = await H.get('/api/messages/unread-count'); H.setUnread(r.unread); } catch (e) { } });

  /* ---------- router ---------- */
  H.go = async (name, params) => {
    if (H.beforeLeave) {
      const f = H.beforeLeave; H.beforeLeave = null;
      const ok = await f(name, params);
      if (ok === false) { H.beforeLeave = f; return; }
    }
    if (H.cleanup) { try { H.cleanup(); } catch (e) { console.error(e); } H.cleanup = null; }
    H.sockScreen = {};
    H.suppressPmToast = false;
    H.screen = name; H.params = params || {};
    const root = document.getElementById('app'); root.innerHTML = '';
    H.screenRoot = root;
    window.scrollTo(0, 0);
    try { await H.routes[name](params || {}, root); } catch (e) { console.error(e); H.toast(e.message || 'שגיאה'); }
  };

  /* ---------- top bar ---------- */
  H.userBox = () => {
    const m = H.me || {}; const c = m.active_card;
    const nm = c ? c.display_name : (m.reg_name || '');
    const cap = c ? (c.type === 'business' ? 'כרטיס עסקי' : 'כרטיס חברתי') + (c.is_viewer ? ' · צופה' : '') : 'אין כרטיס פעיל';
    return '<div class="userbox"><p class="un">' + H.esc(nm) + '</p><p class="uc ' + (c ? '' : 'warn') + '">' + H.esc(cap) + '</p></div>';
  };
  // opts: {title, home:true (logo+exit), tools: html}
  H.topbar = (opts = {}) => {
    const bar = H.el('<div class="topbar"></div>');
    const right = opts.home
      ? '<div class="logo-stack"><button class="logo-circle" id="tbLogo" title="Hubble"><img src="/static/img/logo.png" alt="Hubble"></button><button class="exit-link" id="tbExit">יציאה</button></div>'
      : '<button class="logo-circle" id="tbLogo" title="חזרה למסך הבית"><img src="/static/img/logo.png" alt="Hubble"></button>';
    bar.innerHTML = '<div class="tz tr">' + right + '</div>' +
      '<div class="tz tc">' + (opts.title ? '<span class="screen-title">' + opts.title + '</span>' : '<span class="wordmark">HUBBLE</span>') + '</div>' +
      '<div class="tz tl">' + (opts.tools || '') + H.userBox() + '</div>';
    H.$('#tbLogo', bar).onclick = () => H.go('home');
    const ex = H.$('#tbExit', bar);
    if (ex) ex.onclick = async () => {
      if (!(await H.confirm('לצאת מהמערכת?', 'יציאה'))) return;
      await H.post('/api/logout'); if (H.sock) { H.sock.disconnect(); H.sock = null; }
      H.me = null; H.go('login');
    };
    return bar;
  };

  /* ---------- hub presence / deep link helpers ---------- */
  H.getPosition = (timeout = 8000) => new Promise(res => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      () => res(null), { enableHighAccuracy: true, timeout, maximumAge: 15000 });
  });

  H.typeLabel = t => ({ professional: 'מקצועי', business: 'עסקי', social: 'חברתי' }[t] || t);

  /* ---------- boot ---------- */
  H.boot = async () => {
    const q = new URLSearchParams(location.search);
    H.deepLink = q.get('hub') ? { hub: q.get('hub'), code: q.get('code') || '' } : null;
    try { await H.refreshMe(); } catch (e) { H.me = { registered: false }; }
    H.connectSocket();
    if (!H.me.registered) return H.go('login');
    H.afterLogin();
  };
  H.afterLogin = () => {
    if (H.deepLink) {
      const d = H.deepLink; H.deepLink = null; history.replaceState(null, '', '/');
      return H.go('hub', { hub_id: d.hub, code: d.code });
    }
    H.go('home');
  };
})();
