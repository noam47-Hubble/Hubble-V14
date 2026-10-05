/* HUBBLE v14 — hub management (owner only) */
H.routes.manage = async (p, root) => {
  const hubId = p.hub_id;
  const w = H.el('<div class="screen"></div>'); root.appendChild(w);
  w.appendChild(H.topbar({ title: 'ניהול ההאב' }));
  const pg = H.el('<div class="manage-wrap"></div>'); w.appendChild(pg);
  let data;
  try { data = await H.get('/api/hubs/' + hubId + '/manage'); } catch (e) { pg.innerHTML = '<div class="gate-box">' + H.esc(e.message) + '</div>'; return; }
  const full = await H.get('/api/hubs/' + hubId + '/full');
  let code = full.presence_code;

  const personRow = (e, acts) => `<div class="mrow" data-uid="${e.user_id}"><div style="display:flex;align-items:center;gap:10px;min-width:0">${H.avatar((e.card || {}).photo_url, e.display_name, e.user_id, 'sm')}<div style="min-width:0"><div class="t">${H.esc(e.display_name)}</div><div class="h">${H.esc([(e.card || {}).title, (e.card || {}).company].filter(Boolean).join(' · '))}${e.is_physical ? ' · נוכח פיזית' : ''}</div></div></div><div class="acts">${acts}</div></div>`;

  const render = () => {
    const h = data.hub;
    const link = location.origin + '/?hub=' + h.hub_id + (code ? '&code=' + code : '');
    const mode = h.presence_mode;
    pg.innerHTML = `
      <h1 class="title" style="margin-bottom:2px">${H.esc(h.name)}</h1>
      <p class="lead" style="margin-bottom:14px">#${H.esc(h.serial)} · האב ${H.typeLabel(h.hub_type)}</p>
      <div class="btn-row center" style="margin-bottom:14px"><button class="btn" id="mgEdit">עריכת ההאב</button><button class="btn" id="mgEnter">כניסה להאב</button></div>

      <div class="grp">אישור נרשמים</div>
      <div class="mrow"><div><div class="t">אישור משתמשים אוטומטי</div><div class="h">כשהאפשרות כבויה — כל נרשם ממתין לאישורך ברשימה למטה</div></div><label class="sw"><input type="checkbox" id="mgAuto" ${h.auto_approve ? 'checked' : ''}><span></span></label></div>
      <div class="mrow"><div><div class="t">שליחת הודעה פרטית על אישור הרשמה</div><div class="h">הנרשם יקבל הודעה בתיבת ההודעות הפרטיות שלו</div></div><label class="sw"><input type="checkbox" id="mgMsg" ${h.send_approval_msg ? 'checked' : ''}><span></span></label></div>

      <div class="grp">ממתינים לאישור (${data.pending.length})</div>
      <div id="mgPend">${data.pending.length ? data.pending.map(e => personRow(e, '<button class="btn sm ok solid" data-a="approve">אישור</button><button class="btn sm danger" data-a="reject">דחייה</button>')).join('') : '<div class="empty">אין ממתינים</div>'}</div>

      <div class="grp">רשומים להאב (${data.registered.length})</div>
      <div id="mgReg">${data.registered.length ? data.registered.map(e => personRow(e, '<button class="btn sm danger" data-a="cancel">ביטול רישום</button><button class="btn sm danger solid" data-a="ban">חסימה</button>')).join('') : '<div class="empty">אין עדיין רשומים</div>'}</div>

      <div class="grp">חסומים (${data.bans.length})</div>
      <div id="mgBans">${data.bans.length ? data.bans.map(b => `<div class="mrow" data-uid="${b.user_id}"><div><div class="t">${H.esc(b.name)}</div><div class="h">${b.reason ? 'סיבה: ' + H.esc(b.reason) : 'ללא סיבה'}</div></div><div class="acts"><button class="btn sm" data-a="unban">ביטול חסימה</button></div></div>`).join('') : '<div class="empty">אין חסומים</div>'}</div>

      <div class="grp">אימות נוכחות פיזית — ${({ none: 'לא מוגדר (רשת ה-IP של המנהל)', location: 'לפי מיקום', code: 'לפי קוד / QR', both: 'מיקום או קוד' })[mode]}</div>
      ${mode === 'code' || mode === 'both' ? `<div class="mrow" style="flex-direction:column;align-items:center;gap:10px"><div class="code-big" id="mgCode">${H.esc(code)}</div><div class="qrbox" id="mgQr"></div><div class="h" style="word-break:break-all;direction:ltr;text-align:center">${H.esc(link)}</div>
        <div class="btn-row center"><button class="btn sm" id="mgRegen">קוד חדש</button><button class="btn sm" id="mgCopy">העתק קישור</button><button class="btn sm" id="mgPrint">הדפס QR</button></div></div>` : '<div class="note info">כדי להגדיר אימות במיקום או ב-QR, ערוך את ההאב (סעיף "אימות נוכחות").</div>'}
    `;
    // QR
    const qb = H.$('#mgQr', pg);
    if (qb) { const q = qrcode(0, 'M'); q.addData(link); q.make(); qb.innerHTML = q.createSvgTag(5, 0); }

    H.$('#mgEdit', pg).onclick = () => H.go('setup', { hub_id: hubId, type: h.hub_type });
    H.$('#mgEnter', pg).onclick = () => H.go('hub', { hub_id: hubId });
    H.$('#mgAuto', pg).onchange = async e => { await H.put('/api/hubs/' + hubId, { auto_approve: e.target.checked }); await reload(); if (e.target.checked) H.toast('כל הממתינים אושרו'); };
    H.$('#mgMsg', pg).onchange = async e => { await H.put('/api/hubs/' + hubId, { send_approval_msg: e.target.checked }); };
    H.$$('[data-a]', pg).forEach(b => b.onclick = async () => {
      const row = b.closest('[data-uid]'), uid = row.dataset.uid, a = b.dataset.a;
      const name = H.$('.t', row).textContent;
      try {
        if (a === 'approve') { await H.post('/api/hubs/' + hubId + '/attendees/' + uid + '/approve'); H.toast('הרישום אושר'); }
        else if (a === 'reject') { await H.post('/api/hubs/' + hubId + '/attendees/' + uid + '/reject'); H.toast('הבקשה נדחתה'); }
        else if (a === 'cancel') { if (!(await H.confirm('לבטל את הרישום של ' + H.esc(name) + ' להאב?', 'ביטול רישום', true))) return; await H.post('/api/hubs/' + hubId + '/attendees/' + uid + '/reject'); }
        else if (a === 'ban') {
          const reason = await H.prompt('חסימת ' + name, 'סיבת החסימה (תישלח למשתמש בהודעה פרטית)'); if (reason === null) return;
          await H.post('/api/hubs/' + hubId + '/bans', { user_id: uid, reason }); H.toast('המשתמש נחסם');
        }
        else if (a === 'unban') { await H.del('/api/hubs/' + hubId + '/bans/' + uid); H.toast('החסימה בוטלה'); }
        await reload();
      } catch (e) { H.toast(e.message); }
    });
    const rg = H.$('#mgRegen', pg);
    if (rg) {
      rg.onclick = async () => { code = (await H.post('/api/hubs/' + hubId + '/presence-code')).presence_code; render(); H.toast('נוצר קוד חדש'); };
      H.$('#mgCopy', pg).onclick = async () => { try { await navigator.clipboard.writeText(link); H.toast('הקישור הועתק'); } catch (e) { H.toast(link); } };
      H.$('#mgPrint', pg).onclick = () => {
        const win = window.open('', '_blank'); if (!win) return;
        win.document.write('<html dir="rtl"><body style="text-align:center;font-family:Arial;padding:40px"><h1>' + H.esc(h.name) + '</h1><div>' + H.$('#mgQr', pg).innerHTML + '</div><h2 style="letter-spacing:.3em">' + H.esc(code) + '</h2><p>סרוק כדי להיכנס ולאמת נוכחות</p></body></html>');
        win.document.close(); win.print();
      };
    }
  };
  const reload = async () => { data = await H.get('/api/hubs/' + hubId + '/manage'); render(); };
  H.onSock('pending_list', d => { if (d.hub_id === hubId) reload(); });
  H.onSock('presence_list', () => reload());
  const t = setInterval(() => reload().catch(() => { }), 15000);
  H.cleanup = () => clearInterval(t);
  render();
};
