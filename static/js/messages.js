/* HUBBLE v14 — my private messages */
H.routes.messages = async (p, root) => {
  const esc = H.esc;
  const w = H.el('<div class="screen"></div>'); root.appendChild(w);
  w.appendChild(H.topbar({ title: 'הודעות פרטיות' }));
  const grid = H.el(`<div class="two-col" id="mGrid">
    <div class="glass" id="pList"><input class="search" id="mQ" type="text" placeholder="חיפוש לפי שם, שם האב, מספר האב או מלל חופשי"><div class="list" id="mRows"></div></div>
    <div class="glass" id="pConv"><div class="empty" id="mEmpty">בחר שיחה מהרשימה</div></div>
    <div class="glass cardcol hidden" id="pCard"></div></div>`);
  w.appendChild(grid);
  H.suppressPmToast = true;

  let rows = [], cur = null, msgs = [], hasMore = false, other = null, att = '', q = '';
  const stateLabel = r => !r.open ? '' : r.state === 'hub' ? 'בהאב: ' + r.now_hub : r.state === 'home' ? 'פעיל' : 'כבוי';

  async function loadRows() {
    const res = await H.get('/api/messages?q=' + encodeURIComponent(q));
    rows = res.conversations; H.setUnread(res.unread);
    const box = H.$('#mRows', grid); box.innerHTML = '';
    rows.forEach(r => {
      const label = r.last_kind === 'group' ? 'קבוצה ' + r.group_name + ' · ' + r.last_sender + ': ' + r.last_text : r.last_text;
      const el = H.el(`<div class="r ${r.unread ? 'unread' : ''} ${cur === r.user_id ? 'act' : ''}" data-id="${r.user_id}">${H.avatar(r.photo, r.name, r.user_id)}
        <div class="info"><div class="n">${esc(r.name)}<span class="hubt">${esc(r.hub_name)}</span></div><div class="l">${esc(label)}</div></div>
        <div class="ind"><span class="st">${esc(stateLabel(r))}</span><span class="dot ${r.open ? 'g' : 'rd'}"></span>${r.unread ? '<span class="badge">' + r.unread + '</span>' : ''}</div></div>`);
      el.onclick = () => openConv(r.user_id);
      box.appendChild(el);
    });
    if (q && res.contacts && res.contacts.length) {
      box.appendChild(H.el('<div class="sec-h"><span>אנשי קשר תואמים</span></div>'));
      res.contacts.forEach(c => {
        const el = H.el(`<div class="r">${H.avatar(c.photo, c.name, c.user_id)}<div class="info"><div class="n">${esc(c.name)}</div><div class="l">${esc(c.company || c.desc)}</div></div><div class="ind"><span class="dot ${c.open ? 'g' : 'rd'}"></span></div></div>`);
        el.onclick = () => openConv(c.user_id); box.appendChild(el);
      });
    }
    if (!rows.length && !(res.contacts || []).length) box.innerHTML = '<div class="empty">' + (q ? 'לא נמצאו הודעות' : 'אין עדיין הודעות פרטיות') + '</div>';
  }

  const bubble = m => {
    const cls = m.kind === 'system' ? 'sys' : m.mine ? 'out' : 'in';
    const label = m.kind === 'group' ? '<span class="gl">קבוצה: ' + esc(m.group_name) + (m.mine ? '' : ' · ' + esc(m.sender_name)) + '</span>' : '';
    const hubLink = m.hub_link_id ? '<br><a class="hublink" data-hub="' + m.hub_link_id + '">כניסה להאב ' + esc(m.hub_name) + '</a>' : (m.hub_name && m.kind !== 'system' ? '<small>' + esc(m.hub_name) + '</small>' : '');
    return `<div class="bub ${cls}" data-id="${m.id}">${label}${esc(m.text)}${m.image ? '<img src="' + esc(m.image) + '">' : ''}${hubLink}<small>${H.fmt(m.ts)}${m.mine ? ' · <a class="mdel" style="cursor:pointer">מחק</a>' : ''}</small></div>`;
  };

  function renderConv() {
    const box = H.$('#pConv', grid);
    const name = other ? other.name : '';
    const canMsg = other && other.can_message;
    box.innerHTML = `<button class="back" id="mBack">→ חזרה לרשימה</button>
      <div class="r" style="cursor:default;flex-wrap:nowrap" id="cvHead">${H.avatar(other && other.card && other.card.photo_url, name, cur)}<div class="info"><div class="n">${esc(name)}</div><div class="l">${other && other.open ? esc(stateLabel({ open: other.open, state: other.state, now_hub: other.hub_name })) : 'סגור לתקשורת'}</div></div></div>
      <div class="chat" id="cvChat">${hasMore ? '<button class="more" id="cvMore">הצג הודעות קודמות</button>' : ''}${msgs.map(bubble).join('') || '<div class="empty">אין עדיין הודעות בשיחה זו</div>'}</div>
      <div id="cvAtt" class="${att ? '' : 'hidden'}" style="font-size:12px">${att ? '<img src="' + esc(att) + '" style="max-height:44px;border-radius:6px"> <a id="cvAttRm" style="cursor:pointer;color:#ff9a9d">×</a>' : ''}</div>
      <div class="comp"><label class="cb" title="צרף תמונה">${H.ic('img', 20)}<input type="file" id="cvImg" accept="image/*" hidden></label><input type="text" id="cvIn" placeholder="${canMsg ? 'כתוב הודעה...' : ''}" ${canMsg ? '' : 'disabled'}><button class="btn primary sm" id="cvSend" ${canMsg ? '' : 'disabled'}>שלח</button></div>
      ${canMsg ? '' : '<div class="notice">' + (other && other.i_am_viewer ? 'הכרטיס שלך סגור לתקשורת — אתה במצב צפייה בלבד' : 'איש הקשר סגור לתקשורת — אי אפשר לשלוח הודעה') + '</div>'}`;
    H.$('#mBack', box).onclick = () => { cur = null; grid.classList.remove('conv'); H.$('#pCard', grid).classList.add('hidden'); H.$('#pConv', grid).innerHTML = '<div class="empty">בחר שיחה מהרשימה</div>'; };
    const chat = H.$('#cvChat', box); chat.scrollTop = chat.scrollHeight;
    const more = H.$('#cvMore', box);
    if (more) more.onclick = async () => { const r = await H.get('/api/messages/thread/' + cur + '?limit=5&before=' + msgs[0].ts); msgs = r.messages.concat(msgs); hasMore = r.has_more; renderConv(); };
    H.$$('.hublink', box).forEach(a => a.onclick = () => H.go('hub', { hub_id: a.dataset.hub }));
    H.$$('.mdel', box).forEach(a => a.onclick = async () => { const id = a.closest('.bub').dataset.id; await H.del('/api/messages/' + id); msgs = msgs.filter(m => m.id !== id); renderConv(); loadRows(); });
    const inp = H.$('#cvIn', box);
    const send = async () => {
      const text = inp.value.trim(); if (!text && !att) return;
      try { const m = await H.post('/api/messages/send', { to_user_id: cur, text, image: att }); if (!msgs.find(x => x.id === m.id)) msgs.push(m); att = ''; renderConv(); loadRows(); H.$('#cvIn', grid).focus(); } catch (e) { H.toast(e.message); }
    };
    H.$('#cvSend', box).onclick = send; inp.onkeydown = e => { if (e.key === 'Enter') send(); };
    H.$('#cvImg', box).onchange = async e => { att = await H.readImage(e.target.files[0], 900); e.target.value = ''; const v = inp.value; renderConv(); H.$('#cvIn', grid).value = v; };
    const ar = H.$('#cvAttRm', box); if (ar) ar.onclick = () => { att = ''; const v = inp.value; renderConv(); H.$('#cvIn', grid).value = v; };
    renderCard();
  }
  function renderCard() {
    const box = H.$('#pCard', grid); box.classList.remove('hidden');
    const c = other.card || {};
    let h = H.cardHtml({ ...c, id: cur, display_name: other.name, photo_url: c.photo_url });
    h += '<div class="cv-row"><span>זמינות</span><span>' + (other.open ? 'פתוח לתקשורת' : 'סגור לתקשורת') + '</span></div>';
    if (other.is_contact) h += '<div class="cv-note">✓ באנשי הקשר שלך' + (other.groups.length ? ' · ' + esc(other.groups.map(g => g.name).join(', ')) : '') + '</div>';
    else h += '<div class="btn-row center" style="margin-top:12px"><button class="btn sm primary" id="cdSave" ' + (other.open ? '' : 'disabled') + '>שמור באנשי הקשר</button></div>';
    box.innerHTML = h;
    const sv = H.$('#cdSave', box); if (sv) sv.onclick = async () => { try { await H.post('/api/contacts', { user_id: cur }); H.toast('נשמר באנשי הקשר'); const r = await H.get('/api/messages/thread/' + cur + '?limit=5'); other = r.other; renderCard(); } catch (e) { H.toast(e.message); } };
  }
  async function openConv(uid) {
    cur = uid; att = '';
    try { const r = await H.get('/api/messages/thread/' + uid + '?limit=5'); msgs = r.messages; hasMore = r.has_more; other = r.other; }
    catch (e) { return H.toast(e.message); }
    grid.classList.add('conv'); renderConv(); loadRows(); H.sockGlobal.unread_changed.forEach(f => f());
  }
  let tq;
  H.$('#mQ', grid).oninput = e => { q = e.target.value.trim(); clearTimeout(tq); tq = setTimeout(loadRows, 250); };
  H.onSock('private_message', async m => {
    if (cur && m.other_user_id === cur) {
      if (!msgs.find(x => x.id === m.id)) msgs.push(m);
      if (!m.mine) { const r = await H.get('/api/messages/thread/' + cur + '?limit=5'); other = r.other; }
      renderConv();
    }
    loadRows();
  });
  H.onSock('private_message_deleted', d => { if (cur && d.other_user_id === cur) { msgs = msgs.filter(x => x.id !== d.id); renderConv(); } loadRows(); });
  await loadRows();
  if (p.open_user) openConv(p.open_user);
};
