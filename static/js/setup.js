/* HUBBLE v14 — hub setup (create / edit) for the 3 hub types */
(function () {
  const esc = H.esc;
  const TEMPLATES = [
    { id: 'corporate_classic', name: 'קלאסי-כחול', a: '#185FA5', b: '#D6E7F8' },
    { id: 'community_dynamic', name: 'טבעי-ירוק', a: '#0F6E56', b: '#CDEBDD' },
    { id: 'creator_purple', name: 'יצירתי-סגול', a: '#534AB7', b: '#DAD6F7' },
    { id: 'minimalist_dark', name: 'תפעולי-כהה', a: '#E24B4A', b: '#12141F' },
    { id: 'logistics_red', name: 'חם-אדום', a: '#A32D2D', b: '#F6D3D1' },
  ];
  const PRESETS = {
    professional: ['לוח הודעות', 'לוח זמנים', 'רשימת דוברים', 'רשימת מציגים', 'רשימת נותני החסות', 'מפה', 'לינק לאתר האירוע', 'צור קשר'],
    business: ['לוח הודעות', 'מוצרים ושירותים', 'שעות פעילות', 'מבצעים', 'מפה', 'לינק לאתר', 'צור קשר'],
    social: ['לוח הודעות', 'תוכנית הערב', 'מפה', 'לינק לקבוצה', 'צור קשר'],
  };
  const TITLES = { professional: ['הגדרת האב מקצועי', 'שם אירוע (חובה)'], business: ['הגדרת האב עסקי', 'שם ההאב (חובה)'], social: ['הגדרת האב חברתי', 'שם ההאב (חובה)'] };

  H.routes.setup = async (p, root) => {
    const editing = !!p.hub_id;
    let type = p.type || 'social';
    const w = H.el('<div class="screen"></div>'); root.appendChild(w);

    await H.refreshMe();
    /* gate: professional hub needs a business card */
    if (type === 'professional' && !H.me.has_business_card) {
      w.appendChild(H.topbar({ title: TITLES.professional[0] }));
      w.appendChild(H.el('<div class="gate-box">נא ליצור לעצמך <b id="gBiz">כרטיס עסקי</b> לפני הגדרת האב מקצועי</div>'));
      H.$('#gBiz', w).onclick = () => H.go('cards', { newType: 'business', back: 'setup', backParams: { type: 'professional' } });
      return;
    }

    const st = {
      name: '', tagline: '', tagline_visible: true, location: '', location_visible: true, event_dates: '', event_dates_visible: true,
      logo_url: '', logo_visible: true, organizer_names: '', organizer_names_visible: true,
      template_id: 'corporate_classic', background_image_url: '', auto_approve: true, send_approval_msg: true,
      presence_mode: 'none', loc_lat: null, loc_lng: null, loc_radius: 150, blocks: [], presence_code: '',
    };
    let hubId = p.hub_id || null;
    if (editing) {
      try {
        const f = await H.get('/api/hubs/' + hubId + '/full');
        Object.assign(st, f.hub, { blocks: f.blocks, presence_code: f.presence_code });
        type = f.hub.hub_type;
      } catch (e) { w.appendChild(H.topbar({ title: 'עריכת האב' })); w.appendChild(H.el('<div class="gate-box">' + esc(e.message) + '</div>')); return; }
    }
    const snap = () => JSON.stringify(st);
    let saved = snap(), done = false;
    const dirty = () => !done && snap() !== saved;

    w.appendChild(H.topbar({ title: editing ? 'עריכת ' + TITLES[type][0].replace('הגדרת ', '') : TITLES[type][0] }));
    const pg = H.el('<div class="page"></div>'); w.appendChild(pg);

    const row = (icon, label, inner) => `<div class="row"><span class="ico">${H.ic(icon, 20)}</span><span class="lbl">${label}</span>${inner}</div>`;
    const render = () => {
      const hasBg = type !== 'professional';
      pg.innerHTML = `
        <h1 class="title">${editing ? 'עריכת ההאב' : 'ברוכים הבאים ל' + TITLES[type][0]}</h1>
        <p class="lead">${editing ? 'עדכן את הגדרות ההאב ושמור' : 'הגדר את ההאב שלך כדי להתחיל'}</p>
        ${row('cal', TITLES[type][1], '<input type="text" data-k="name" placeholder="' + (type === 'professional' ? 'TechInnovate 2026' : 'שם ההאב') + '" value="' + esc(st.name) + '">')}
        <p class="grp">שדות רשות בכותרת ההאב</p>
        ${row('lines', 'כותרת משנה', '<input type="text" data-k="tagline" value="' + esc(st.tagline) + '">')}
        ${row('pinloc', 'מיקום', '<input type="text" data-k="location" value="' + esc(st.location) + '">')}
        ${row('clock', 'תאריכים / שעות', '<input type="text" data-k="event_dates" value="' + esc(st.event_dates) + '">')}
        ${row('img', 'לוגו', '<span class="grow"><img id="stLogoThumb" class="thumb ' + (st.logo_url ? '' : 'hidden') + '" src="' + esc(st.logo_url) + '"></span><label class="btn sm">העלאת קובץ<input type="file" id="stLogo" accept="image/*" hidden></label>' + (st.logo_url ? '<button class="btn sm danger" id="stLogoRm">הסר</button>' : ''))}
        ${row('users', 'שמות המארגנים', '<input type="text" data-k="organizer_names" placeholder="יוצג בתחתית ההאב" value="' + esc(st.organizer_names) + '">')}
        <p class="grp">שדות רשות כלליים (חלונות מידע בהאב)</p>
        <div id="stBlocks"></div>
        <div class="row clickable" id="stAdd"><span class="ico">${H.ic('list', 20)}</span><span class="grow" id="stAddLbl"></span></div>
        <p class="grp">עיצוב</p>
        ${row('palette', 'תבנית', '<div class="sw-box" id="tplBox" style="display:flex;gap:10px;flex:1"></div><span class="small" id="tplName"></span>')}
        ${hasBg ? row('img', 'תמונת רקע', '<span class="grow"><img id="stBgThumb" class="thumb ' + (st.background_image_url ? '' : 'hidden') + '" src="' + esc(st.background_image_url) + '"></span><label class="btn sm">העלאת תמונה<input type="file" id="stBg" accept="image/*" hidden></label>' + (st.background_image_url ? '<button class="btn sm danger" id="stBgRm">הסר</button>' : '')) + '<div class="note info">תמונת הרקע תוצג מאחורי חלון המידע בהאב.</div>' : ''}
        <p class="grp">הרשמה</p>
        <div class="row"><span class="ico">${H.ic('users', 20)}</span><span class="lbl" style="width:auto">אישור נרשמים אוטומטי</span><span class="grow small">(כל נרשם יאושר אוטומטית)</span><label class="sw"><input type="checkbox" id="stAuto" ${st.auto_approve ? 'checked' : ''}><span></span></label></div>
        <p class="grp">אימות נוכחות פיזית בהאב</p>
        ${row('pinloc', 'שיטת אימות', `<select data-k="presence_mode"><option value="none">ללא — זיהוי לפי רשת האינטרנט שלי</option><option value="location">לפי מיקום ורדיוס</option><option value="code">לפי קוד / QR</option><option value="both">מיקום או קוד</option></select>`)}
        <div id="stPresence"></div>
        <div class="err" id="stErr"></div>
        <div class="btn-row center"><button class="btn" id="stView">צפיה בהאב</button><button class="btn primary" id="stSave">${editing ? 'שמור שינויים' : 'צור האב'}</button></div>`;
      H.$('[data-k=presence_mode]', pg).value = st.presence_mode;
      H.$$('input[data-k]', pg).forEach(i => i.oninput = () => { st[i.dataset.k] = i.value; });
      H.$('[data-k=presence_mode]', pg).onchange = e => { st.presence_mode = e.target.value; renderPresence(); };
      H.$('#stLogo', pg).onchange = async e => { st.logo_url = await H.readImage(e.target.files[0], 400); render(); };
      const rl = H.$('#stLogoRm', pg); if (rl) rl.onclick = () => { st.logo_url = ''; render(); };
      const bg = H.$('#stBg', pg); if (bg) bg.onchange = async e => { st.background_image_url = await H.readImage(e.target.files[0], 1600, .78); render(); };
      const rb = H.$('#stBgRm', pg); if (rb) rb.onclick = () => { st.background_image_url = ''; render(); };
      H.$('#stAuto', pg).onchange = e => { st.auto_approve = e.target.checked; if (!e.target.checked) H.toast('אישור משתמשים יתבצע בעמוד ניהול ההאב'); };
      H.$('#stAdd', pg).onclick = () => blockModal();
      H.$('#stView', pg).onclick = preview;
      H.$('#stSave', pg).onclick = () => save();
      renderBlocks(); renderTpl(); renderPresence();
    };

    function renderTpl() {
      const box = H.$('#tplBox', pg); box.innerHTML = '';
      TEMPLATES.forEach(t => {
        const b = H.el('<button type="button" class="swatch ' + (st.template_id === t.id ? 'sel' : '') + '" title="' + t.name + '" style="background:linear-gradient(135deg,' + t.a + ' 50%,' + t.b + ' 50%)"></button>');
        b.onclick = () => { st.template_id = t.id; renderTpl(); }; box.appendChild(b);
      });
      H.$('#tplName', pg).textContent = (TEMPLATES.find(t => t.id === st.template_id) || TEMPLATES[0]).name;
    }

    function ensureDefault() {
      if (!st.blocks.length) return;
      if (st.blocks.length === 1) st.blocks[0].is_default = true;
      else if (st.blocks.filter(b => b.is_default).length !== 1) { st.blocks.forEach(b => b.is_default = false); st.blocks[0].is_default = true; }
    }
    function renderBlocks() {
      ensureDefault();
      const box = H.$('#stBlocks', pg); box.innerHTML = '';
      st.blocks.forEach(b => {
        const r = H.el(`<div class="row field-row"><span class="ico">${H.ic(H.iconForBlock(b), 20)}</span><span class="grow" style="font-weight:600">${esc(b.title)}</span>
          ${b.category === 'open' ? '<span class="tag">פתוח למשתמשים</span>' : ''}
          ${st.blocks.length > 1 ? '<label class="chk"><input type="radio" name="def" ' + (b.is_default ? 'checked' : '') + '> ברירת מחדל</label>' : ''}
          <label class="chk" title="הסתר/הצג את הכפתור בהאב"><input type="checkbox" data-vis ${b.is_visible !== false ? 'checked' : ''}> מוצג</label>
          <button class="btn sm" data-a="edit">ערוך</button><button class="btn sm danger" data-a="del">מחק</button></div>`);
        H.$('[data-a=edit]', r).onclick = () => blockModal(b);
        H.$('[data-a=del]', r).onclick = () => { st.blocks = st.blocks.filter(x => x !== b); renderBlocks(); };
        const rd = H.$('input[type=radio]', r); if (rd) rd.onchange = () => { st.blocks.forEach(x => x.is_default = false); b.is_default = true; renderBlocks(); };
        H.$('[data-vis]', r).onchange = e => { b.is_visible = e.target.checked; };
        box.appendChild(r);
      });
      H.$('#stAddLbl', pg).textContent = st.blocks.length ? 'הוספת שדה רשות נוסף' : 'הוספת שדה רשות (ניתן לבחור מרשימה)';
    }

    /* ---- presence section ---- */
    function renderPresence() {
      const box = H.$('#stPresence', pg); const m = st.presence_mode; let h = '';
      if (m === 'none') h = '<div class="note info">ללא הגדרה: נחשב "נוכח פיזית" מי שמחובר מאותה רשת אינטרנט (כתובת IP ציבורית) כמוך בעת פתיחת ההאב. שיטה זו פחות מדויקת — מומלץ מיקום או QR.</div>';
      if (m === 'location' || m === 'both') {
        h += `<div class="row"><span class="ico">${H.ic('pinloc', 20)}</span><span class="lbl">מיקום ההאב</span><span class="grow small" id="locTxt">${st.loc_lat != null ? st.loc_lat.toFixed(5) + ', ' + st.loc_lng.toFixed(5) : 'לא הוגדר'}</span><button class="btn sm" id="locBtn">השתמש במיקום הנוכחי שלי</button></div>
          <div class="row"><span class="ico">${H.ic('walk', 20)}</span><span class="lbl">רדיוס (מטרים)</span><input type="number" min="20" max="5000" id="locRad" value="${st.loc_radius || 150}"></div>
          <div class="note info">כשמשתמש נכנס להאב, הדפדפן יבקש ממנו אישור מיקום. מי שנמצא בתוך הרדיוס יסומן כנוכח פיזית.</div>`;
      }
      if (m === 'code' || m === 'both') {
        const link = location.origin + '/?hub=' + (hubId || '') + '&code=' + (st.presence_code || '');
        h += hubId ? `<div class="row" style="flex-direction:column;align-items:center"><div class="code-big">${esc(st.presence_code)}</div><div class="qrbox" id="stQr"></div><div class="small" style="direction:ltr;word-break:break-all;text-align:center">${esc(link)}</div></div>`
          : '<div class="note info">קוד ו-QR ייווצרו עם יצירת ההאב ויוצגו כאן ובמסך ניהול ההאב.</div>';
      }
      box.innerHTML = h;
      const lb = H.$('#locBtn', box);
      if (lb) {
        lb.onclick = async () => { lb.disabled = true; const pos = await H.getPosition(10000); lb.disabled = false; if (!pos) return H.toast('לא התקבל מיקום — אשר גישה למיקום בדפדפן'); st.loc_lat = pos.lat; st.loc_lng = pos.lng; H.$('#locTxt', box).textContent = pos.lat.toFixed(5) + ', ' + pos.lng.toFixed(5); H.toast('המיקום נשמר (דיוק ~' + Math.round(pos.acc) + 'מ׳)'); };
        H.$('#locRad', box).oninput = e => { st.loc_radius = parseInt(e.target.value) || 150; };
      }
      const qb = H.$('#stQr', box); if (qb) { const q = qrcode(0, 'M'); q.addData(location.origin + '/?hub=' + hubId + '&code=' + st.presence_code); q.make(); qb.innerHTML = q.createSvgTag(4, 0); }
    }

    /* ---- block modal ---- */
    const sidePanel = H.el('<div class="side-panel"><div style="display:flex;justify-content:space-between;color:var(--gl-muted);font-size:13px;margin-bottom:12px"><span>תצוגה מקדימה של התכולה</span><button id="spClose" style="background:none;border:none;color:#fff;font-size:20px">×</button></div><div id="spBody"></div></div>');
    w.appendChild(sidePanel);
    H.$('#spClose', sidePanel).onclick = () => closeSide();
    let curOv = null;
    const closeSide = () => { sidePanel.classList.remove('open'); if (curOv) curOv.style.paddingLeft = ''; };
    const blockHtml = d => {
      let h = '<h3 class="c-title">' + esc(d.title || '(ללא שם)') + '</h3>';
      if (d.content) h += '<div class="c-text">' + esc(d.content) + '</div>';
      if (d.image_url) h += '<img class="c-img" src="' + esc(d.image_url) + '" alt="">';
      if (d.video_url) h += '<a href="' + esc(d.video_url) + '" target="_blank" rel="noopener">▶ וידאו: ' + esc(d.video_url) + '</a><br>';
      if (d.link_url) h += '<a href="' + esc(d.link_url) + '" target="_blank" rel="noopener">' + esc(d.link_url) + '</a>';
      if (!d.content && !d.image_url && !d.video_url && !d.link_url) h += '<p class="empty">עדיין אין תוכן.</p>';
      if (d.category === 'open') h += '<p style="color:#8fc0ff;font-size:13px">✎ פתוח להעלאת תוכן על ידי משתמשים</p>';
      return h;
    };
    function blockModal(b) {
      const cur = b ? { ...b } : { id: 'n' + Date.now(), category: 'info', title: '', content: '', image_url: '', video_url: '', link_url: '', is_default: false, is_visible: true };
      const body = `<div style="position:relative;display:flex;gap:8px;margin-bottom:12px"><input class="field-in" id="bName" placeholder="שם התכולה (למשל: ${PRESETS[type][2] || 'רשימת דוברים'})" value="${esc(cur.title)}"><button type="button" class="btn sm" id="bPick">בחר מרשימה ▾</button><div class="pick-list hidden" id="bPickList"></div></div>
        <textarea class="field-in" id="bText" placeholder="כתוב כאן את התכולה...">${esc(cur.content)}</textarea>
        <div class="tools"><label class="btn sm">העלאת קובץ טקסט<input type="file" id="bTxtFile" accept=".txt,text/plain" hidden></label><label class="btn sm">העלאת תמונה<input type="file" id="bImg" accept="image/*" hidden></label></div>
        <div id="bImgWrap" class="${cur.image_url ? '' : 'hidden'}" style="position:relative;display:inline-block;margin-bottom:10px"><img src="${esc(cur.image_url)}" id="bImgPrev" style="max-height:110px;border-radius:10px"><button type="button" id="bRmImg" style="position:absolute;top:-8px;right:-8px;width:22px;height:22px;border-radius:50%;border:none;background:#e5484d;color:#fff">×</button></div>
        <input class="field-in" id="bVid" placeholder="לינק לווידאו (YouTube / Vimeo)" value="${esc(cur.video_url)}" style="margin-bottom:8px">
        <input class="field-in" id="bLink" placeholder="לינק לאתר (רשות)" value="${esc(cur.link_url)}">
        <label class="chk" style="margin:10px 2px"><input type="checkbox" id="bOpen" ${cur.category === 'open' ? 'checked' : ''}> פתוח להעלאת תוכן על ידי משתמשים (כיתוב, תמונה או וידאו)</label>
        <div class="err" id="bErr" style="text-align:right"></div>`;
      const m = H.modal({
        title: b ? 'עריכת שדה רשות' : 'הוספת שדה רשות', body, dismiss: false, onClose: closeSide,
        actions: [
          { label: 'צפיה מוקדמת', close: false, onClick: (c, box) => { H.$('#spBody', sidePanel).innerHTML = blockHtml(read(box)); sidePanel.classList.add('open'); curOv.style.paddingLeft = 'calc(33.33vw + 20px)'; } },
          { label: 'חזור' },
          { label: 'אשר', cls: 'primary', onClick: (c, box) => {
            const d = read(box); if (!d.title) { H.$('#bErr', box).textContent = 'יש להזין שם לתכולה או לבחור מהרשימה'; return false; }
            if (b) Object.assign(b, d); else st.blocks.push(d);
            renderBlocks();
          } }]
      });
      curOv = m.ov;
      const box = m.el;
      const read = bx => ({ ...cur, title: H.$('#bName', bx).value.trim(), content: H.$('#bText', bx).value.trim(), video_url: H.$('#bVid', bx).value.trim(), link_url: H.$('#bLink', bx).value.trim(), category: H.$('#bOpen', bx).checked ? 'open' : 'info' });
      const pl = H.$('#bPickList', box);
      PRESETS[type].forEach(t => { const x = H.el('<button type="button">' + esc(t) + '</button>'); x.onclick = () => { H.$('#bName', box).value = t; pl.classList.add('hidden'); }; pl.appendChild(x); });
      H.$('#bPick', box).onclick = e => { e.stopPropagation(); pl.classList.toggle('hidden'); };
      box.addEventListener('click', () => pl.classList.add('hidden'));
      H.$('#bTxtFile', box).onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const t = H.$('#bText', box); t.value = (t.value ? t.value + '\n' : '') + r.result; }; r.readAsText(f); e.target.value = ''; };
      const syncImg = () => { H.$('#bImgWrap', box).classList.toggle('hidden', !cur.image_url); H.$('#bImgPrev', box).src = cur.image_url; };
      H.$('#bImg', box).onchange = async e => { cur.image_url = await H.readImage(e.target.files[0], 900); syncImg(); e.target.value = ''; };
      H.$('#bRmImg', box).onclick = () => { cur.image_url = ''; syncImg(); };
    }

    /* ---- preview ("how users will see it") ---- */
    function preview() {
      if (!validate()) return;
      const me = H.me.active_card; const mine = me ? me.display_name : 'אני';
      const hubObj = { ...st, hub_id: 'preview', hub_type: type, is_mine: true };
      const ov = H.el('<div class="pv-ov"><div class="hubscr" style="min-height:100vh"></div></div>');
      const scr = H.$('.hubscr', ov);
      scr.innerHTML = '<div class="pv-note">כך ההאב ייראה למשתמשים (תבנית: ' + esc((TEMPLATES.find(t => t.id === st.template_id) || {}).name) + ' · אישור נרשמים: ' + (st.auto_approve ? 'אוטומטי' : 'ידני') + ')</div><div class="hubview"></div><div class="pv-actions"><button class="btn lg" id="pvBack">חזור להגדרת ההאב</button><button class="btn primary lg" id="pvCreate">' + (editing ? 'שמור שינויים' : 'צור האב') + '</button></div>';
      w.appendChild(ov);
      const prevScreenRoot = H.screenRoot; H.screenRoot = scr;
      const people = [
        { user_id: 'me', display_name: mine, status: 'green', is_live: true, is_physical: true, is_owner: true, joined_at: 1, card: { company: me && me.company || '', title: me && me.title || '', nickname: me && me.nickname || '', bio: me && me.bio || '' } },
        { user_id: 'p2', display_name: 'שירה לוי', status: 'green', is_live: true, is_physical: true, is_owner: false, joined_at: 2, card: { company: 'חברה לדוגמה', title: 'מנהלת מוצר', nickname: 'שירי', bio: 'מחפשת שיתופי פעולה' } },
        { user_id: 'p3', display_name: 'דן כהן', status: 'red', is_live: true, is_physical: false, is_owner: false, joined_at: 3, card: {} },
      ];
      const board = [{ id: 'b1', sender_user_id: 'p2', sender_name: 'שירה לוי', sender_photo: '', is_owner: false, text: 'ברוכים הבאים! מישהו כבר פה?', image: '', ts: Date.now() / 1000 - 600, pinned_until: 0 }];
      const view = H.hubView(H.$('.hubview', scr), {
        hub: hubObj, blocks: st.blocks.filter(b => b.is_visible !== false).map((b, i) => ({ ...b, id: b.id || 'x' + i })), posts: {}, people, board, myId: 'me', isOwner: true, readonly: true,
        pm: null,
      });
      const close = () => { view.destroy(); ov.remove(); H.screenRoot = prevScreenRoot; };
      H.$('#pvBack', scr).onclick = close;
      H.$('#pvCreate', scr).onclick = () => { close(); save(); };
    }

    function validate() {
      const err = H.$('#stErr', pg); err.textContent = '';
      if (!st.name.trim()) { err.textContent = 'יש להזין שם להאב (שדה חובה)'; H.$('[data-k=name]', pg).focus(); return false; }
      if ((st.presence_mode === 'location' || st.presence_mode === 'both') && (st.loc_lat == null)) { err.textContent = 'בחרת אימות לפי מיקום — יש להגדיר את מיקום ההאב'; return false; }
      return true;
    }
    async function save() {
      if (!validate()) return false;
      const err = H.$('#stErr', pg);
      const body = { ...st, hub_type: type };
      try {
        let res;
        if (editing) res = await H.put('/api/hubs/' + hubId, body); else res = await H.post('/api/hubs', body);
        done = true;
        if (!st.auto_approve) H.toast('אישור משתמשים יתבצע בעמוד ניהול ההאב');
        else H.toast(editing ? 'ההאב עודכן' : 'ההאב נוצר בהצלחה');
        H.beforeLeave = null;
        const id = editing ? hubId : res.hub_id;
        if (!editing && (st.presence_mode === 'code' || st.presence_mode === 'both')) return H.go('manage', { hub_id: id });
        H.go('hub', { hub_id: id });
        return true;
      } catch (e) {
        if (e.data && e.data.code === 'need_card') { H.toast(e.message); H.go('cards'); }
        else if (e.data && e.data.code === 'need_business_card') { H.go('setup', { type: 'professional' }); }
        else err.textContent = e.message;
        return false;
      }
    }

    H.beforeLeave = () => new Promise(res => {
      if (!dirty()) return res(true);
      H.modal({
        title: 'לצאת מהגדרת ההאב?', body: '<p>יש שינויים שעוד לא נשמרו. לשמור לפני שיוצאים?</p>', dismiss: false,
        actions: [{ label: 'הישאר', onClick: () => res(false) }, { label: 'צא בלי לשמור', onClick: () => res(true) },
          { label: 'שמור וצא', cls: 'primary', close: false, onClick: async (close) => { const ok = await saveNoNav(); if (ok) { close(); res(true); } } }]
      });
    });
    async function saveNoNav() {
      // save without navigating (navigation is already underway)
      if (!validate()) return false;
      try { if (editing) await H.put('/api/hubs/' + hubId, { ...st, hub_type: type }); else await H.post('/api/hubs', { ...st, hub_type: type }); done = true; H.toast('ההאב נשמר'); return true; }
      catch (e) { H.toast(e.message); return false; }
    }
    H.cleanup = () => { H.beforeLeave = null; };
    render();
  };
})();
