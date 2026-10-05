/* HUBBLE v14 — my cards: list + editor + card view */
(function () {
  const LABELS = { name: 'שם', nickname: 'כינוי', title: 'תפקיד', company: 'חברה', phone: 'טלפון', email: 'מייל', website: 'אתר', linkedin: 'לינקדאין',
    instagram: 'אינסטגרם', tiktok: 'טיקטוק', other_social: 'רשת חברתית אחרת', bio: 'משפט מפתח', card_image: 'כרטיס ביקור (תמונה)' };
  const FIELDS = {
    business: ['name', 'nickname', 'title', 'company', 'phone', 'email', 'website', 'linkedin', 'other_social', 'bio'],
    social: ['name', 'nickname', 'bio', 'phone', 'email', 'instagram', 'tiktok', 'other_social'],
  };
  H.CARD_LABELS = LABELS;

  /* a card as others see it (public dict) -> HTML for a modal / preview */
  H.cardHtml = (c, opts = {}) => {
    if (!c || !Object.keys(c).length) return '<p class="empty">אין פרטי כרטיס להצגה</p>';
    const nm = c.display_name || c.name || c.nickname || 'צופה';
    let h = '<div class="cardview">' + H.avatar(c.photo_url, nm, c.id, 'lg') + '<h3>' + H.esc(nm) + '</h3>' +
      (c.type ? '<span class="tag">' + (c.type === 'business' ? 'כרטיס עסקי' : 'כרטיס חברתי') + '</span>' : '') + (opts.tag || '') + '</div>';
    const row = (k, v, link) => '<div class="cv-row"><span>' + LABELS[k] + '</span><span>' + (link ? '<a href="' + H.esc(link) + '" target="_blank" rel="noopener">' + H.esc(v) + '</a>' : H.esc(v)) + '</span></div>';
    if (c.nickname && c.name) h += row('nickname', c.nickname);
    ['title', 'company', 'bio', 'phone', 'email'].forEach(k => { if (c[k]) h += row(k, c[k], k === 'phone' ? 'tel:' + c[k] : k === 'email' ? 'mailto:' + c[k] : null); });
    ['website', 'linkedin', 'instagram', 'tiktok', 'other_social'].forEach(k => { if (c[k]) h += row(k, c[k], /^https?:/i.test(c[k]) ? c[k] : (k === 'website' || k === 'linkedin' ? 'https://' + c[k] : null)); });
    if (c.card_image) h += '<img class="cv-img" src="' + c.card_image + '" alt="">';
    if (c.photos && c.photos.length > 1) h += '<div class="photo-grid" style="justify-content:center;margin-top:10px">' + c.photos.map(u => '<img class="thumb" style="width:52px;height:52px;border-radius:10px" src="' + H.esc(u) + '">').join('') + '</div>';
    return h;
  };

  H.routes.cards = async (p, root) => {
    const w = H.el('<div class="screen"></div>');
    root.appendChild(w);
    let cards = [];
    const load = async () => { cards = await H.get('/api/cards'); await H.refreshMe(); };

    const list = async () => {
      await load();
      w.innerHTML = '';
      w.appendChild(H.topbar({ title: 'הכרטיסים שלי' }));
      const pg = H.el('<div class="page"></div>'); w.appendChild(pg);
      pg.innerHTML = `<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px"><button class="fab" id="cdNew" title="כרטיס חדש">${H.ic('plus', 26)}</button><h1 class="title" style="flex:1;text-align:right;margin:0;font-size:20px">${cards.length ? 'הכרטיסים שלי' : 'עדיין אין לך כרטיסים — לחץ על ה-+ כדי ליצור'}</h1></div><div class="card-list" id="cdList"></div>`;
      const box = H.$('#cdList', pg);
      cards.forEach(c => {
        const el = H.el(`<div class="card-row ${c.is_active ? 'active' : ''}">
          ${H.avatar(c.photo_url, c.display_name, c.id)}
          <div class="card-info"><div class="n">${H.esc(c.card_name || c.display_name)}${c.is_active ? '<span class="active-lbl">פעיל</span>' : ''}</div>
            <div class="l">${c.type === 'business' ? 'כרטיס עסקי' : 'כרטיס חברתי'} · ${H.esc(c.display_name)}${c.is_viewer ? ' (צופה)' : ''}</div></div>
          <span class="dot click ${c.effective_open ? 'g' : 'rd'}" title="${c.is_viewer ? 'כרטיס צופה — סגור לתקשורת' : c.effective_open ? 'פתוח לתקשורת — לחץ לסגירה' : 'סגור לתקשורת — לחץ לפתיחה'}"></span>
          <div class="acts">${c.is_active ? '' : '<button class="btn sm primary" data-a="act">הפוך לפעיל</button>'}<button class="btn sm" data-a="edit">עריכה</button><button class="btn sm danger" data-a="del">מחיקה</button></div></div>`);
        H.$('.dot', el).onclick = async () => {
          if (c.is_viewer) return H.toast('כדי להיות פתוח לתקשורת יש להציג שם או כינוי בכרטיס');
          await H.post('/api/cards/' + c.id + '/open', { open: !c.is_open_to_contact }); list();
        };
        H.$$('[data-a]', el).forEach(b => b.onclick = async () => {
          const a = b.dataset.a;
          if (a === 'act') { await H.post('/api/cards/' + c.id + '/activate'); H.toast('הכרטיס הפך לפעיל'); list(); }
          if (a === 'edit') editor(c);
          if (a === 'del' && await H.confirm('למחוק את הכרטיס "' + H.esc(c.card_name || c.display_name) + '"?', 'מחיקה', true)) { await H.del('/api/cards/' + c.id); list(); }
        });
        box.appendChild(el);
      });
      H.$('#cdNew', pg).onclick = () => {
        H.modal({
          title: 'איזה כרטיס ליצור?', body: '<p>כרטיס עסקי נדרש להאב מקצועי. כרטיס חברתי מתאים להאבים חברתיים.</p>',
          actions: [{ label: 'כרטיס עסקי', cls: 'primary', onClick: () => editor(null, 'business') }, { label: 'כרטיס חברתי', cls: 'primary', onClick: () => editor(null, 'social') }, { label: 'ביטול' }]
        });
      };
    };

    const editor = (card, type) => {
      type = card ? card.type : type;
      const st = card ? JSON.parse(JSON.stringify(card)) : { type, card_name: '', degree: '', is_open_to_contact: true, photos: [], card_image: '', card_image_visible: false };
      FIELDS[type].forEach(f => { if (st[f] === undefined) { st[f] = ''; st[f + '_visible'] = (type === 'social' ? ['name', 'nickname', 'bio'] : ['name', 'title', 'company']).includes(f); } });
      w.innerHTML = '';
      w.appendChild(H.topbar({ title: card ? 'עריכת כרטיס' : (type === 'business' ? 'כרטיס עסקי חדש' : 'כרטיס חברתי חדש') }));
      const pg = H.el('<div class="page"></div>'); w.appendChild(pg);
      const fieldRow = f => `<div class="row cf-row"><span class="lbl">${LABELS[f]}${f === 'name' ? ' *' : ''}</span><input type="text" data-f="${f}" value="${H.esc(st[f] || '')}" placeholder="${f === 'name' ? 'חובה' : ''}">
        ${f === 'name' ? '<span class="vis" title="השם הוא שדה חובה אבל אפשר להסתיר אותו"></span>' : ''}
        <label class="vis chk"><input type="checkbox" data-v="${f}" ${st[f + '_visible'] ? 'checked' : ''}>מוצג</label></div>`;
      pg.innerHTML = `
        <div class="row"><span class="lbl">שם הכרטיס (פרטי)</span><input type="text" id="ceCardName" value="${H.esc(st.card_name)}" placeholder="${type === 'business' ? 'כרטיס עסקי' : 'כרטיס חברתי'}"></div>
        <div class="row"><span class="lbl">תואר</span><input type="text" id="ceDegree" value="${H.esc(st.degree)}" placeholder="ד״ר, עו״ד, מהנדס..."></div>
        <div class="grp">פרטי הכרטיס — סמן מה יוצג לאחרים</div>
        <div id="ceFields">${FIELDS[type].map(fieldRow).join('')}</div>
        ${type === 'business' ? `<div class="row"><span class="lbl">כרטיס ביקור (תמונה)</span><span class="grow"><img class="thumb ${st.card_image ? '' : 'hidden'}" id="ceCiThumb" src="${st.card_image || ''}" style="border-radius:8px"></span>
          <label class="btn sm">העלאה<input type="file" id="ceCi" accept="image/*" hidden></label><label class="vis chk"><input type="checkbox" data-v="card_image" ${st.card_image_visible ? 'checked' : ''}>מוצג</label></div>` : ''}
        <div class="grp">תמונות (לחץ על תמונה כדי לבחור אותה כתמונת פרופיל)</div>
        <div class="photo-grid" id="cePhotos"></div>
        <label class="btn sm" style="display:inline-block">הוספת תמונה<input type="file" id="cePh" accept="image/*" multiple hidden></label>
        <div class="grp">זמינות</div>
        <div class="row"><span class="grow">פתוח לתקשורת (נקודה ירוקה) / סגור (אדומה)</span><label class="sw"><input type="checkbox" id="ceOpen" ${st.is_open_to_contact ? 'checked' : ''}><span></span></label></div>
        <div class="note" id="ceViewerNote"></div>
        <div class="err" id="ceErr"></div>
        <div class="btn-row center" style="margin-top:12px"><button class="btn" id="ceCancel">ביטול</button><button class="btn" id="cePrev">הצג כרטיס</button><button class="btn primary" id="ceSave">שמור כרטיס</button></div>`;
      const read = () => {
        const d = { type, card_name: H.$('#ceCardName', pg).value.trim(), degree: H.$('#ceDegree', pg).value.trim(), is_open_to_contact: H.$('#ceOpen', pg).checked };
        H.$$('[data-f]', pg).forEach(i => { d[i.dataset.f] = i.value.trim(); });
        H.$$('[data-v]', pg).forEach(i => { d[i.dataset.v + '_visible'] = i.checked; });
        if (type === 'business') d.card_image = st.card_image || '';
        d.photos = st.photos.map(x => ({ url: x.url, is_visible: true, is_profile_photo: !!x.is_profile_photo }));
        return d;
      };
      const viewerNote = () => {
        const d = read();
        const viewer = !((d.name_visible && d.name) || (d.nickname_visible && d.nickname));
        H.$('#ceViewerNote', pg).textContent = viewer ? 'שם וכינוי מוסתרים — הכרטיס יוצג כ"צופה": סגור לתקשורת וניתן רק לצפות בהאבים.' : '';
        H.$('#ceViewerNote', pg).style.color = viewer ? '#ff9a9d' : '';
      };
      H.$('#ceFields', pg).addEventListener('input', viewerNote); H.$('#ceFields', pg).addEventListener('change', viewerNote);
      viewerNote();
      const phRender = () => {
        const g = H.$('#cePhotos', pg); g.innerHTML = '';
        if (st.photos.length && !st.photos.some(x => x.is_profile_photo)) st.photos[0].is_profile_photo = true;
        st.photos.forEach((ph, i) => {
          const it = H.el(`<div class="photo-item ${ph.is_profile_photo ? 'main' : ''}"><img src="${H.esc(ph.url)}" alt=""><button title="הסר">×</button>${ph.is_profile_photo ? 'פרופיל' : '&nbsp;'}</div>`);
          H.$('img', it).onclick = () => { st.photos.forEach(x => x.is_profile_photo = false); ph.is_profile_photo = true; phRender(); };
          H.$('button', it).onclick = () => { st.photos.splice(i, 1); phRender(); };
          g.appendChild(it);
        });
      };
      phRender();
      H.$('#cePh', pg).onchange = async e => { for (const f of e.target.files) { if (st.photos.length >= 8) break; st.photos.push({ url: await H.readImage(f, 700), is_profile_photo: false, is_visible: true }); } e.target.value = ''; phRender(); };
      const ci = H.$('#ceCi', pg);
      if (ci) ci.onchange = async e => { st.card_image = await H.readImage(e.target.files[0], 1100); const t = H.$('#ceCiThumb', pg); t.src = st.card_image; t.classList.remove('hidden'); };
      H.$('#ceCancel', pg).onclick = list;
      H.$('#cePrev', pg).onclick = () => {
        const d = read(); const pub = { type, display_name: '', photos: [] };
        FIELDS[type].concat(type === 'business' ? ['card_image'] : []).forEach(f => { if (d[f + '_visible'] && d[f]) pub[f] = d[f]; });
        pub.display_name = pub.name ? (d.degree ? d.degree + ' ' : '') + pub.name : (pub.nickname || 'צופה');
        const prof = st.photos.find(x => x.is_profile_photo); pub.photo_url = prof ? prof.url : ''; pub.photos = st.photos.map(x => x.url);
        const viewer = !pub.name && !pub.nickname;
        H.modal({ title: 'כך אחרים יראו את הכרטיס', body: H.cardHtml(pub, { tag: viewer ? '<span class="tag" style="color:#ff9a9d;border-color:#e0494e">צופה</span>' : '' }), actions: [{ label: 'סגור', cls: 'primary' }] });
      };
      H.$('#ceSave', pg).onclick = async () => {
        const d = read(); const err = H.$('#ceErr', pg); err.textContent = '';
        if (!d.name) { err.textContent = 'שם הוא שדה חובה'; return; }
        try {
          if (card) await H.put('/api/cards/' + card.id, d); else await H.post('/api/cards', d);
          await H.refreshMe(); H.toast('הכרטיס נשמר');
          if (p.back) return H.go(p.back, p.backParams || {});
          list();
        } catch (e) { err.textContent = e.message; }
      };
    };

    if (p.newType) editor(null, p.newType); else await list();
  };
})();
