/* HUBBLE v14 — home: hub list, search, filters, create menu, share, enter */
H.routes.home = async (p, root) => {
  await H.refreshMe();
  const me = H.me;
  const w = H.el('<div class="screen"></div>');
  w.appendChild(H.topbar({ home: true }));
  const noCard = !me.active_card;
  const lay = H.el(`<div class="main-layout">
    <div class="content">
      <div class="search-cluster">
        <button class="fab" id="hmNew" title="פתיחת האב חדש">${H.ic('plus', 28)}</button>
        <div class="sbox">
          <input class="search" id="hmQ" type="text" placeholder="חיפוש האב לפי שם, מספר או בעל ההאב">
          <div class="filter-row" id="hmFilters">
            <span class="pill active" data-f="all">הכל</span><span class="pill" data-f="favorites">מועדפים</span>
            <span class="pill" data-f="near">קרובים</span><span class="pill" data-f="mine">שלי</span>
          </div>
        </div>
      </div>
      <div id="hmList"></div>
    </div>
    <div class="sidebar">
      <div class="nav-item ${noCard ? 'blink' : ''}" id="nvCards"><span class="nl">${H.ic('cards', 20)}<span>הכרטיסים שלי</span></span></div>
      ${noCard ? '<div class="note" style="margin:0 4px">אנא הגדר כרטיס אישי</div>' : ''}
      <div class="nav-item" id="nvMsgs"><span class="nl">${H.ic('mail', 20)}<span>הודעות פרטיות שלי</span></span><span class="badge ${me.unread ? '' : 'hidden'}" data-unread>${me.unread || 0}</span></div>
      <div class="nav-item" id="nvCts"><span class="nl">${H.ic('book', 20)}<span>אנשי הקשר שלי</span></span></div>
    </div>
  </div>`);
  w.appendChild(lay);
  root.appendChild(w);

  H.$('#nvCards', w).onclick = () => H.go('cards');
  H.$('#nvMsgs', w).onclick = () => H.go('messages');
  H.$('#nvCts', w).onclick = () => H.go('contacts');

  /* + menu */
  let menu = null;
  const closeMenu = () => { if (menu) { menu.remove(); menu = null; } };
  H.$('#hmNew', w).onclick = e => {
    e.stopPropagation();
    if (menu) return closeMenu();
    menu = H.el(`<div class="newmenu"><button class="btn" data-t="social">חברתי</button><button class="btn" data-t="business">עסקי</button><button class="btn" data-t="professional">מקצועי</button></div>`);
    H.$('.search-cluster', w).appendChild(menu);
    H.$$('button', menu).forEach(b => b.onclick = () => {
      closeMenu();
      if (!H.me.cards_count) { H.toast('נא ליצור כרטיס אישי לפני פתיחת האב'); return H.go('cards'); }
      H.go('setup', { type: b.dataset.t });
    });
  };
  const docClick = () => closeMenu();
  document.addEventListener('click', docClick);

  /* list */
  let filter = 'all', q = '', pos = null, rows = [], timer = null, poll = null;
  const actIcon = r => {
    const n = r.level === 0 ? 1 : r.level === 1 ? 2 : 3;
    return '<span class="activity" title="' + (r.level === 0 ? 'פעילות קלה' : r.level === 1 ? 'פעילות בינונית' : 'פעילות גבוהה') + '">' +
      Array.from({ length: n }, () => '<span class="walker ' + (r.level === 2 ? 'fast' : '') + '" style="color:#8fd0ff;display:inline-flex">' + H.ic('walk', 17) + '</span>').join('') +
      '<span class="st">' + r.live_count + '</span></span>';
  };
  const render = () => {
    const box = H.$('#hmList', w);
    if (!rows.length) { box.innerHTML = '<div class="empty">' + (q || filter !== 'all' ? 'לא נמצאו האבים' : 'עדיין אין האבים. לחץ על ה-+ כדי לפתוח את הראשון') + '</div>'; return; }
    box.innerHTML = '';
    rows.forEach(r => {
      const sub = [r.tagline && r.tagline_visible ? r.tagline : '', '#' + r.serial, r.owner_name ? 'מאת ' + r.owner_name : ''].filter(Boolean).join(' · ');
      const el = H.el(`<div class="hub-row" data-id="${r.hub_id}">
        <button class="star-btn" title="מועדף">${H.starSvg(r.is_favorite)}</button>
        <div class="hub-name-block"><p class="hub-name">${H.esc(r.name)}</p><p class="hub-tagline">${H.esc(sub)}</p></div>
        <div class="hub-type-block"><span class="badge-type ${r.hub_type}">${H.typeLabel(r.hub_type)}</span>${actIcon(r)}</div>
        <div class="hub-actions">
          ${r.is_mine ? '<span class="mine-tools"><button class="btn sm" data-a="manage">ניהול</button><button class="btn sm" data-a="edit">עריכה</button><button class="btn sm danger" data-a="close">סגירה</button></span>' : ''}
          <button class="btn sm" data-a="share">שיתוף</button>
          <button class="btn primary sm" data-a="enter">כניסה</button>
        </div></div>`);
      H.$('.star-btn', el).onclick = async () => { const res = await H.post('/api/hubs/' + r.hub_id + '/favorite'); r.is_favorite = res.is_favorite; if (filter === 'favorites') load(); else H.$('.star-btn', el).innerHTML = H.starSvg(r.is_favorite); };
      H.$$('[data-a]', el).forEach(b => b.onclick = () => act(b.dataset.a, r));
      box.appendChild(el);
    });
  };
  const load = async () => {
    const qs = new URLSearchParams({ filter, q });
    if (pos) { qs.set('lat', pos.lat); qs.set('lng', pos.lng); }
    try { rows = await H.get('/api/hubs?' + qs); render(); } catch (e) { H.toast(e.message); }
  };
  const act = async (a, r) => {
    if (a === 'enter') return H.go('hub', { hub_id: r.hub_id });
    if (a === 'manage') return H.go('manage', { hub_id: r.hub_id });
    if (a === 'edit') return H.go('setup', { hub_id: r.hub_id, type: r.hub_type });
    if (a === 'close') {
      if (await H.confirm('לסגור את ההאב "' + H.esc(r.name) + '"? כל הנוכחים יוצאו ממנו.', 'סגירת האב', true)) { await H.post('/api/hubs/' + r.hub_id + '/close'); load(); }
      return;
    }
    if (a === 'share') return shareDialog(r);
  };
  async function shareDialog(r) {
    const [cts, grs] = await Promise.all([H.get('/api/contacts'), H.get('/api/contact-groups')]);
    if (!cts.length) return H.toast('אין לך אנשי קשר');
    let h = '<p>בחר למי לשלוח הזמנה בהודעה פרטית:</p><div class="picker">';
    if (grs.length) h += '<div class="grp">קבוצות</div>' + grs.map(g => '<label class="r"><input type="checkbox" data-g="' + g.id + '"><span class="n">' + H.esc(g.name) + ' (' + g.contact_ids.length + ')</span></label>').join('');
    h += '<div class="grp">אנשי קשר</div>' + cts.map(c => '<label class="r"><input type="checkbox" data-c="' + c.id + '">' + H.avatar(c.photo, c.name, c.id, 'sm') + '<span class="n">' + H.esc(c.name) + '</span><span class="dot ' + (c.open ? 'g' : 'rd') + '"></span></label>').join('') + '</div>';
    H.modal({
      title: 'שיתוף ההאב "' + H.esc(r.name) + '"', body: h, actions: [{ label: 'ביטול' },
        {
          label: 'שלח הזמנה', cls: 'primary', onClick: async (close, box) => {
            const contact_ids = H.$$('[data-c]:checked', box).map(x => x.dataset.c), group_ids = H.$$('[data-g]:checked', box).map(x => x.dataset.g);
            if (!contact_ids.length && !group_ids.length) { H.toast('לא נבחרו נמענים'); return false; }
            try { const res = await H.post('/api/hubs/' + r.hub_id + '/share', { contact_ids, group_ids }); H.toast('ההזמנה נשלחה ל-' + res.sent + ' אנשים'); } catch (e) { H.toast(e.message); return false; }
          }
        }]
    });
  }
  H.$('#hmQ', w).oninput = e => { q = e.target.value.trim(); clearTimeout(timer); timer = setTimeout(load, 250); };
  H.$$('#hmFilters .pill', w).forEach(pl => pl.onclick = async () => {
    filter = pl.dataset.f;
    H.$$('#hmFilters .pill', w).forEach(x => x.classList.toggle('active', x === pl));
    if (filter === 'near' && !pos) pos = await H.getPosition(5000);
    load();
  });
  H.onSock('hub_closed', load);
  H.onSock('private_message', () => { });
  load();
  poll = setInterval(load, 20000);
  H.cleanup = () => { clearInterval(poll); clearTimeout(timer); document.removeEventListener('click', docClick); };
};
