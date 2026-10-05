/* HUBBLE v14 — my contacts and groups */
H.routes.contacts = async (p, root) => {
  const esc = H.esc;
  const w = H.el('<div class="screen"></div>'); root.appendChild(w);
  w.appendChild(H.topbar({ title: 'אנשי הקשר שלי' }));
  const grid = H.el(`<div class="two-col cts" id="cGrid">
    <div class="glass" id="pList">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><div class="filter-row" style="margin:0;flex:1"><span class="pill active" data-t="contacts">אנשי קשר</span><span class="pill" data-t="groups">קבוצות</span></div><button class="fab" id="cNewGrp" title="קבוצה חדשה" style="width:42px;height:42px">${H.ic('plus', 22)}</button></div>
      <input class="search" id="cQ" type="text" placeholder="חיפוש לפי שם, חברה, האב, קבוצה או מלל חופשי">
      <div class="list" id="cRows"></div></div>
    <div class="glass" id="pDet"><button class="back" id="cBack">→ חזרה לרשימה</button><div id="cDet"><div class="empty">בחר איש קשר או קבוצה</div></div></div></div>`);
  w.appendChild(grid);
  let tab = 'contacts', q = '', contacts = [], groups = [], sel = null;
  const stateLabel = c => !c.open ? 'לא ניתן לאתר' : c.state === 'hub' ? 'בהאב: ' + c.now_hub : c.state === 'home' ? 'פעיל' : 'כבוי';

  async function load() { [contacts, groups] = await Promise.all([H.get('/api/contacts'), H.get('/api/contact-groups')]); renderList(); if (sel) renderDet(); }
  function renderList() {
    const box = H.$('#cRows', grid); box.innerHTML = ''; const ql = q.toLowerCase();
    if (tab === 'contacts') {
      const list = contacts.filter(c => !ql || (c.name + ' ' + c.company + ' ' + c.desc + ' ' + c.hub_name + ' ' + c.groups.map(g => g.name).join(' ')).toLowerCase().includes(ql));
      list.forEach(c => {
        const el = H.el(`<div class="r ${sel && sel.type === 'c' && sel.id === c.id ? 'act' : ''}">${H.avatar(c.photo, c.name, c.user_id)}<div class="info"><div class="n">${esc(c.name)}${c.hub_name ? '<span class="hubt">' + esc(c.hub_name) + '</span>' : ''}</div><div class="l">${esc(c.desc || c.company)}</div></div>
          <div class="ind"><span class="st">${esc(stateLabel(c))}</span><span class="dot ${c.open ? 'g' : 'rd'}"></span></div></div>`);
        el.onclick = () => { sel = { type: 'c', id: c.id }; grid.classList.add('det'); renderList(); renderDet(); };
        box.appendChild(el);
      });
      if (!list.length) box.innerHTML = '<div class="empty">' + (q ? 'לא נמצאו אנשי קשר' : 'אין לך אנשי קשר. שמור אנשים מתוך האב') + '</div>';
    } else {
      const list = groups.filter(g => !ql || g.name.toLowerCase().includes(ql));
      list.forEach(g => {
        const el = H.el(`<div class="r ${sel && sel.type === 'g' && sel.id === g.id ? 'act' : ''}"><span class="av" style="background:#8e5bd8">${H.ic('users', 18)}</span><div class="info"><div class="n">${esc(g.name)}</div><div class="l">${g.contact_ids.length} אנשי קשר</div></div></div>`);
        el.onclick = () => { sel = { type: 'g', id: g.id }; grid.classList.add('det'); renderList(); renderDet(); };
        box.appendChild(el);
      });
      if (!list.length) box.innerHTML = '<div class="empty">אין קבוצות. לחץ על ה-+ ליצירת קבוצה</div>';
    }
  }
  async function renderDet() {
    const box = H.$('#cDet', grid);
    if (!sel) { box.innerHTML = '<div class="empty">בחר איש קשר או קבוצה</div>'; return; }
    if (sel.type === 'c') {
      const c = contacts.find(x => x.id === sel.id); if (!c) { sel = null; return renderDet(); }
      let h = H.cardHtml({ ...(c.card || {}), id: c.user_id, display_name: c.name, photo_url: c.photo });
      h += '<div class="cv-row"><span>סטטוס כעת</span><span>' + esc(stateLabel(c)) + '</span></div>';
      if (c.hub_name) h += '<div class="cv-note">נשמר מההאב: ' + esc(c.hub_name) + '</div>';
      h += '<div class="grp">קבוצות</div>' + (groups.length ? groups.map(g => '<label class="r" style="cursor:pointer"><input type="checkbox" data-g="' + g.id + '" ' + (g.contact_ids.includes(c.id) ? 'checked' : '') + '><span class="n">' + esc(g.name) + '</span></label>').join('') : '<div class="note info">אין קבוצות עדיין</div>');
      h += '<div class="btn-row center" style="margin-top:14px"><button class="btn primary sm" id="dMsg" ' + (c.open ? '' : 'disabled') + '>שלח הודעה פרטית</button><button class="btn danger sm" id="dDel">הסר מאנשי הקשר</button></div>';
      box.innerHTML = h;
      H.$$('[data-g]', box).forEach(cb => cb.onchange = async () => { if (cb.checked) await H.post('/api/contact-groups/' + cb.dataset.g + '/members', { contact_ids: [c.id] }); else await H.del('/api/contact-groups/' + cb.dataset.g + '/members/' + c.id); load(); });
      H.$('#dMsg', box).onclick = () => H.go('messages', { open_user: c.user_id });
      H.$('#dDel', box).onclick = async () => { if (await H.confirm('להסיר את ' + esc(c.name) + ' מאנשי הקשר?', 'הסרה', true)) { await H.del('/api/contacts/' + c.id); sel = null; grid.classList.remove('det'); load(); } };
    } else {
      const g = groups.find(x => x.id === sel.id); if (!g) { sel = null; return renderDet(); }
      const members = g.contact_ids.map(id => contacts.find(c => c.id === id)).filter(Boolean);
      box.innerHTML = `<h2 style="margin:0 0 8px;font-size:19px">${esc(g.name)} <span class="cnt">${members.length}</span></h2>
        <div class="members">${members.map(m => `<div class="r" data-id="${m.id}" style="cursor:default">${H.avatar(m.photo, m.name, m.user_id, 'sm')}<div class="info"><div class="n">${esc(m.name)}</div></div><span class="dot ${m.open ? 'g' : 'rd'}"></span><button class="btn sm danger" data-rm="${m.id}">הסר</button></div>`).join('') || '<div class="empty">אין חברים בקבוצה. הוסף מתוך אנשי הקשר</div>'}</div>
        <div id="whereBox"></div>
        <div class="grp">הודעה לכל הקבוצה</div><textarea class="field-in" id="gMsg" placeholder="כתוב הודעה לכל חברי הקבוצה (כל אחד יקבל אותה בהודעה פרטית, בשם הקבוצה)..." style="min-height:70px"></textarea>
        <div class="btn-row center" style="margin-top:10px"><button class="btn primary sm" id="gSend">שלח לקבוצה</button><button class="btn sm" id="gWhere">איפה הם עכשיו</button><button class="btn danger sm" id="gDel">מחק קבוצה</button></div>`;
      H.$$('[data-rm]', box).forEach(b => b.onclick = async () => { await H.del('/api/contact-groups/' + g.id + '/members/' + b.dataset.rm); load(); });
      H.$('#gSend', box).onclick = async () => {
        const text = H.$('#gMsg', box).value.trim(); if (!text) return H.toast('נא להזין הודעה');
        try { const r = await H.post('/api/contact-groups/' + g.id + '/message', { text }); H.$('#gMsg', box).value = ''; H.toast('נשלח ל-' + r.sent + ' אנשים' + (r.skipped ? ' (' + r.skipped + ' דולגו — סגורים לתקשורת)' : '')); } catch (e) { H.toast(e.message); }
      };
      H.$('#gWhere', box).onclick = async () => { const r = await H.get('/api/contact-groups/' + g.id + '/where'); H.$('#whereBox', box).innerHTML = '<div class="where">' + (r.map(x => '<div><b>' + esc(x.name) + ':</b> ' + esc(x.label) + '</div>').join('') || '<div>אין חברים</div>') + '</div>'; };
      H.$('#gDel', box).onclick = async () => { if (await H.confirm('למחוק את הקבוצה "' + esc(g.name) + '"? אנשי הקשר יישארו.', 'מחיקה', true)) { await H.del('/api/contact-groups/' + g.id); sel = null; grid.classList.remove('det'); load(); } };
    }
  }
  H.$$('.pill', grid).forEach(pl => pl.onclick = () => { tab = pl.dataset.t; sel = null; grid.classList.remove('det'); H.$$('.pill', grid).forEach(x => x.classList.toggle('active', x === pl)); H.$('#cDet', grid).innerHTML = '<div class="empty">בחר איש קשר או קבוצה</div>'; renderList(); });
  H.$('#cQ', grid).oninput = e => { q = e.target.value.trim(); renderList(); };
  H.$('#cBack', grid).onclick = () => grid.classList.remove('det');
  H.$('#cNewGrp', grid).onclick = async () => {
    const name = await H.prompt('קבוצה חדשה', 'שם הקבוצה'); if (!name) return;
    try { const g = await H.post('/api/contact-groups', { name }); tab = 'groups'; H.$$('.pill', grid).forEach(x => x.classList.toggle('active', x.dataset.t === 'groups')); sel = { type: 'g', id: g.id }; grid.classList.add('det'); await load(); } catch (e) { H.toast(e.message); }
  };
  H.onSock('private_message', () => load());
  await load();
};
