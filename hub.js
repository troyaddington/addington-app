// Pets, vehicles and Needs Attention for the Addington App.
const HUB = { data: null, docs: {} };
let hubBack = null;

const ST_TEXT = { overdue: 'OVERDUE', today: 'Due today', soon: 'Due soon', upcoming: 'Upcoming', current: 'Current' };
const ST_RANK = { overdue: 0, today: 1, soon: 2, upcoming: 3, current: 4 };
const ERR_TEXT = {
  conflict: 'Someone else just changed this. Go back and open it again.',
  not_found: 'This record no longer exists. Go back and refresh.',
  bad_date: 'Check the dates.',
  bad_order: 'The end date has to be after the start date.',
  file_type: 'Use a photo or a PDF.',
  file_size: 'That file is too large. Use one under 8 MB.',
  missing_name: 'Add a nickname, make or model.',
  missing_expires: 'Add the expiration date.',
  missing_company: 'Add the insurance company.'
};
const errText = out => ERR_TEXT[out.error] || 'That did not save (' + out.error + '). Try again.';
const newId = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 12);
const byId = (list, id) => list.find(o => o.id === id);
const fmtDate = s => s ? new Date(s + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '';
const statusOf = id => (HUB.data && HUB.data.status[id]) || '';
const pill = st => el('span', { className: 'pill pill-' + st, textContent: ST_TEXT[st] });
const vehName = v => v.nickname || [v.year, v.make, v.model].filter(Boolean).join(' ') || 'Vehicle';

(function addStyles() {
  const s = document.createElement('style');
  s.textContent = `
  .pill { display:inline-block; border-radius:999px; padding:2px 10px; font-size:13px; font-weight:600; white-space:nowrap; }
  .pill-overdue { background:var(--danger); color:#fff; }
  .pill-today { background:var(--accent); color:#fff; }
  .pill-soon { background:#f1dfc4; color:#7a4a12; }
  .pill-upcoming { background:#dfe9e4; color:var(--brand); }
  .pill-current { background:var(--bg); color:var(--muted); border:1px solid var(--line); }
  .attn { margin-bottom:16px; }
  .attn h2, .hubsec h2 { font:600 19px/1.2 Georgia, "Times New Roman", serif; color:var(--brand); margin:0 0 8px; }
  .attn .ok { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:14px; color:var(--muted); margin:0; }
  .hubcard { display:flex; align-items:center; gap:12px; width:100%; text-align:left; background:var(--card); border:1px solid var(--line); border-radius:14px; padding:12px 14px; font:inherit; color:inherit; cursor:pointer; margin-bottom:8px; min-height:64px; }
  .hubcard.over { border-color:var(--danger); border-width:2px; }
  .hubcard .txt { flex:1; min-width:0; overflow-wrap:anywhere; }
  .hubcard b { display:block; font-weight:600; }
  .hubcard small { display:block; color:var(--muted); font-size:14px; }
  .avatar { width:52px; height:52px; border-radius:50%; flex:none; background:var(--brand); color:#fff; display:flex; align-items:center; justify-content:center; font:600 22px Georgia, serif; overflow:hidden; }
  .avatar.big { width:84px; height:84px; font-size:34px; }
  .avatar img { width:100%; height:100%; object-fit:cover; }
  .hubhead { display:flex; align-items:center; gap:14px; margin-bottom:12px; }
  .hubhead h2 { font:600 23px/1.2 Georgia, "Times New Roman", serif; color:var(--brand); margin:0; overflow-wrap:anywhere; }
  .hubhead p { margin:2px 0 0; color:var(--muted); }
  .hubhead > div:last-child { min-width:0; }
  .facts { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:4px 14px; margin:0 0 12px; }
  .facts div { display:grid; grid-template-columns:42% 1fr; gap:10px; padding:9px 0; border-top:1px solid var(--line); }
  .facts div:first-child { border-top:0; }
  .facts dt { color:var(--muted); font-size:14px; }
  .facts dd { margin:0; overflow-wrap:anywhere; white-space:pre-wrap; }
  .hubsec { margin-top:18px; }
  .hubsec .sechead { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; }
  .hubsec .sechead h2 { margin:0; }
  .rec { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:12px 14px; margin-bottom:8px; overflow-wrap:anywhere; }
  .rec.over { border:2px solid var(--danger); }
  .rec .top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
  .rec b { font-weight:600; }
  .rec p { margin:3px 0 0; color:var(--muted); font-size:15px; white-space:pre-wrap; }
  .recbtns { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
  .recbtns .btn { flex:1 1 auto; min-height:44px; padding:8px 12px; }
  .btn.small { min-height:44px; padding:8px 14px; }
  details.hist { margin-top:6px; }
  details.hist summary { color:var(--brand); padding:10px 0; cursor:pointer; min-height:44px; }
  .evform select { width:100%; font:inherit; padding:12px; border:1px solid var(--line); border-radius:10px; background:var(--card); color:var(--ink); min-height:48px; -webkit-appearance:none; appearance:none; }
  .docview img { display:block; width:100%; border-radius:10px; background:#fff; }
  .docview iframe { width:100%; height:68vh; border:1px solid var(--line); border-radius:10px; background:#fff; }
  .docview a { display:block; text-align:center; text-decoration:none; margin-top:10px; }
  .filenote { color:var(--muted); font-size:14px; }
  `;
  document.head.append(s);
})();

function hubGo(title, back) {
  setView('hub', title);
  hubBack = back;
}

async function loadHub() {
  const out = await api('hub.load');
  if (out.ok) HUB.data = out;
  return out;
}

function whenText(i) {
  if (i.days < 0) return 'Overdue by ' + (-i.days) + (i.days === -1 ? ' day' : ' days') + ' · ' + fmtDate(i.due);
  if (i.days === 0) return 'Due today';
  return 'Due in ' + i.days + (i.days === 1 ? ' day' : ' days') + ' · ' + fmtDate(i.due);
}

function renderAttn(box, failed) {
  const head = el('h2', { textContent: 'Needs Attention' });
  if (failed) { box.replaceChildren(head, el('p', { className: 'ok', textContent: 'Could not check due dates. Check your signal and try again.' })); return; }
  const items = HUB.data.attention;
  if (!items.length) { box.replaceChildren(head, el('p', { className: 'ok', textContent: 'Everything is up to date.' })); return; }
  box.replaceChildren(head, ...items.map(i => {
    const b = el('button', { className: 'hubcard' + (i.status === 'overdue' ? ' over' : '') },
      el('span', { className: 'txt' }, el('b', { textContent: i.title }), el('small', { textContent: whenText(i) })), pill(i.status));
    b.addEventListener('click', () => (i.ownerType === 'pet' ? petView : vehicleView)(i.ownerId, showHome, i.id));
    return b;
  }));
}

async function hubHome() {
  const first = document.getElementById('attn');
  if (!first) return;
  if (HUB.data) renderAttn(first);
  try {
    const out = await loadHub();
    const box = document.getElementById('attn');
    if (box && out.ok) renderAttn(box);
    else if (box && out.error !== 'auth' && !HUB.data) renderAttn(box, true);
  } catch (e) {
    const box = document.getElementById('attn');
    if (box && !HUB.data) renderAttn(box, true);
  }
}

function getDoc(id) {
  if (!HUB.docs[id]) {
    HUB.docs[id] = api('doc.get', { docId: id }).then(out => {
      if (!out.ok) { delete HUB.docs[id]; throw new Error(out.error); }
      return out;
    }).catch(e => { delete HUB.docs[id]; throw e; });
  }
  return HUB.docs[id];
}

function avatar(docId, name, big) {
  const a = el('div', { className: 'avatar' + (big ? ' big' : ''), textContent: (name || '?').charAt(0).toUpperCase() });
  if (docId) getDoc(docId).then(d => { a.replaceChildren(el('img', { src: 'data:' + d.mime + ';base64,' + d.data, alt: '' })); }).catch(() => {});
  return a;
}

function worst(ids) {
  const list = ids.map(statusOf).filter(Boolean).sort((a, b) => ST_RANK[a] - ST_RANK[b]);
  return list[0] && list[0] !== 'current' ? list[0] : '';
}

async function hubList(title, render) {
  hubGo(title, showHome);
  const box = el('div', {}, el('p', { className: 'note', textContent: 'Loading…' }));
  const err = el('p', { className: 'err', role: 'alert' });
  main.append(err, box);
  if (HUB.data) render(box);
  try {
    const out = await loadHub();
    if (!box.isConnected) return;
    if (out.ok) render(box);
    else if (out.error !== 'auth') err.textContent = 'Could not load this (' + out.error + ').';
  } catch (e) {
    if (box.isConnected && !HUB.data) { box.replaceChildren(); err.textContent = 'Could not load this. Check your signal and try again.'; }
  }
}

function petsList() {
  hubList('Pets', box => {
    const add = el('button', { className: 'btn', textContent: 'Add pet', style: 'width:100%;margin-bottom:12px' });
    add.addEventListener('click', () => petForm(null, petsList));
    const cards = HUB.data.pets.map(p => {
      const st = worst(HUB.data.vaccines.filter(v => v.petId === p.id && !v.replacedBy).map(v => v.id));
      const b = el('button', { className: 'hubcard' + (st === 'overdue' ? ' over' : '') }, avatar(p.photoId, p.name),
        el('span', { className: 'txt' }, el('b', { textContent: p.name }), el('small', { textContent: [p.species, p.breed].filter(Boolean).join(' · ') })), st ? pill(st) : '');
      b.addEventListener('click', () => petView(p.id, petsList));
      return b;
    });
    box.replaceChildren(add, ...(cards.length ? cards : [el('p', { className: 'note', textContent: 'No pets yet.' })]));
  });
}

function vehiclesList() {
  hubList('Vehicles', box => {
    const add = el('button', { className: 'btn', textContent: 'Add vehicle', style: 'width:100%;margin-bottom:12px' });
    add.addEventListener('click', () => vehicleForm(null, vehiclesList));
    const cards = HUB.data.vehicles.map(v => {
      const st = worst(HUB.data.insurance.concat(HUB.data.registration).filter(r => r.vehicleId === v.id && !r.replacedBy).map(r => r.id));
      const sub = [v.nickname ? [v.year, v.make, v.model].filter(Boolean).join(' ') : '', v.plate].filter(Boolean).join(' · ');
      const b = el('button', { className: 'hubcard' + (st === 'overdue' ? ' over' : '') }, avatar(v.photoId, vehName(v)),
        el('span', { className: 'txt' }, el('b', { textContent: vehName(v) }), el('small', { textContent: sub })), st ? pill(st) : '');
      b.addEventListener('click', () => vehicleView(v.id, vehiclesList));
      return b;
    });
    box.replaceChildren(add, ...(cards.length ? cards : [el('p', { className: 'note', textContent: 'No vehicles yet.' })]));
  });
}

function facts(rows) {
  const items = rows.filter(r => r[1]).map(r => el('div', {}, el('dt', { textContent: r[0] }), el('dd', { textContent: r[1] })));
  return items.length ? el('dl', { className: 'facts' }, ...items) : '';
}

function button(cls, text, fn) {
  const b = el('button', { className: 'btn ' + cls, textContent: text });
  b.addEventListener('click', fn);
  return b;
}

function recCard(r, title, lines, actions) {
  const st = statusOf(r.id);
  const top = el('div', { className: 'top' }, el('b', { textContent: title }), st ? pill(st) : '');
  const c = el('div', { className: 'rec' + (st === 'overdue' ? ' over' : ''), id: 'r' + r.id }, top,
    ...lines.filter(Boolean).map(t => el('p', { textContent: t })));
  if (actions.length) c.append(el('div', { className: 'recbtns' }, ...actions));
  return c;
}

function section(title, addBtn, cards, hist, empty) {
  const head = el('div', { className: 'sechead' }, el('h2', { textContent: title }), addBtn || '');
  const s = el('section', { className: 'hubsec' }, head, ...cards);
  if (!cards.length) s.append(el('p', { className: 'note', textContent: empty }));
  if (hist.length) s.append(el('details', { className: 'hist' }, el('summary', { textContent: 'History (' + hist.length + ')' }), ...hist));
  return s;
}

function focusRec(id) {
  if (!id) return;
  const n = document.getElementById('r' + id);
  if (n) n.scrollIntoView({ block: 'center' });
}

function petView(id, back, focus) {
  const p = HUB.data && byId(HUB.data.pets, id);
  if (!p) { back(); return; }
  hubGo(p.name, back);
  const again = () => petView(id, back);
  const all = HUB.data.vaccines.filter(v => v.petId === id);
  const sorted = list => list.slice().sort((a, b) => (ST_RANK[statusOf(a.id)] ?? 5) - (ST_RANK[statusOf(b.id)] ?? 5) || String(a.due).localeCompare(String(b.due)));
  const card = (v, old) => {
    const acts = [];
    if (v.docId) acts.push(button('soft', 'Certificate', () => docView(v.docId, v.name + ' certificate', again)));
    if (!old) acts.push(button('soft', 'Renew', () => vaxForm(v, again, true)));
    acts.push(button('soft', 'Edit', () => vaxForm(v, again)));
    return recCard(v, v.name, [v.given && 'Given ' + fmtDate(v.given), v.due && (old ? 'Was due ' : 'Next due ') + fmtDate(v.due), v.clinic, v.notes], acts);
  };
  main.append(
    el('div', { className: 'hubhead' }, avatar(p.photoId, p.name, true), el('div', {}, el('h2', { textContent: p.name }), el('p', { textContent: [p.species, p.breed].filter(Boolean).join(' · ') }))),
    button('soft small', 'Edit pet', () => petForm(p, again)),
    el('div', { style: 'height:10px' }),
    facts([['Date of birth', fmtDate(p.dob)], ['Sex', p.sex], ['Weight', p.weight], ['Microchip ID', p.chipId], ['Microchip company', p.chipCompany], ['Veterinarian', p.vet], ['Vet phone', p.vetPhone], ['Notes', p.notes]]),
    section('Vaccinations', button('small', 'Add', () => vaxForm({ petId: id }, again)), sorted(all.filter(v => !v.replacedBy)).map(v => card(v)), sorted(all.filter(v => v.replacedBy)).map(v => card(v, true)), 'No vaccinations yet.'));
  focusRec(focus);
}

function vehicleView(id, back, focus) {
  const v = HUB.data && byId(HUB.data.vehicles, id);
  if (!v) { back(); return; }
  const name = vehName(v);
  hubGo(name, back);
  const again = () => vehicleView(id, back);
  const ins = HUB.data.insurance.filter(r => r.vehicleId === id);
  const reg = HUB.data.registration.filter(r => r.vehicleId === id);
  const quick = [];
  const curIns = ins.find(r => !r.replacedBy && r.docId), curReg = reg.find(r => !r.replacedBy && r.docId);
  if (curIns) quick.push(button('', 'Insurance card', () => docView(curIns.docId, name + ' insurance card', again)));
  if (curReg) quick.push(button('', 'Registration card', () => docView(curReg.docId, name + ' registration card', again)));
  const insCard = (r, old) => {
    const acts = [];
    if (r.docId) acts.push(button('soft', 'View card', () => docView(r.docId, name + ' insurance card', again)));
    if (!old) acts.push(button('soft', 'Renew', () => insForm(r, again, true)));
    acts.push(button('soft', 'Edit', () => insForm(r, again)));
    return recCard(r, r.company, [r.policy && 'Policy ' + r.policy, r.holder && 'Policyholder: ' + r.holder, r.start && 'Starts ' + fmtDate(r.start), r.expires && 'Expires ' + fmtDate(r.expires), r.agent && 'Agent: ' + r.agent], acts);
  };
  const regCard = (r, old) => {
    const acts = [];
    if (r.docId) acts.push(button('soft', 'View card', () => docView(r.docId, name + ' registration card', again)));
    if (!old) acts.push(button('soft', 'Renew', () => regForm(r, again, true)));
    acts.push(button('soft', 'Edit', () => regForm(r, again)));
    return recCard(r, [r.state, r.plate].filter(Boolean).join(' · ') || 'Registration', [r.start && 'Starts ' + fmtDate(r.start), r.expires && 'Expires ' + fmtDate(r.expires)], acts);
  };
  main.append(
    el('div', { className: 'hubhead' }, avatar(v.photoId, name, true), el('div', {}, el('h2', { textContent: name }), el('p', { textContent: [v.color, v.plate].filter(Boolean).join(' · ') }))),
    quick.length ? el('div', { className: 'rowbtns' }, ...quick) : '',
    button('soft small', 'Edit vehicle', () => vehicleForm(v, again)),
    el('div', { style: 'height:10px' }),
    facts([['Year', v.year], ['Make', v.make], ['Model', v.model], ['Trim', v.trim], ['Color', v.color], ['License plate', v.plate], ['VIN', v.vin], ['Mileage', v.mileage], ['Notes', v.notes]]),
    section('Insurance', button('small', 'Add', () => insForm({ vehicleId: id, holder: '' }, again)), ins.filter(r => !r.replacedBy).map(r => insCard(r)), ins.filter(r => r.replacedBy).map(r => insCard(r, true)), 'No insurance added yet.'),
    section('Registration', button('small', 'Add', () => regForm({ vehicleId: id, plate: v.plate }, again)), reg.filter(r => !r.replacedBy).map(r => regCard(r)), reg.filter(r => r.replacedBy).map(r => regCard(r, true)), 'No registration added yet.'));
  focusRec(focus);
}

async function docView(docId, title, back) {
  hubGo(title, back);
  const box = el('div', { className: 'docview' }, el('p', { className: 'note', textContent: 'Loading…' }));
  main.append(box);
  try {
    const d = await getDoc(docId);
    if (!box.isConnected) return;
    if (d.mime === 'application/pdf') {
      const bytes = Uint8Array.from(atob(d.data), c => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: d.mime }));
      box.replaceChildren(el('iframe', { src: url, title }), el('a', { className: 'btn soft', href: url, target: '_blank', rel: 'noopener', textContent: 'Open full screen' }));
    } else {
      box.replaceChildren(el('img', { src: 'data:' + d.mime + ';base64,' + d.data, alt: title }));
    }
  } catch (e) {
    if (box.isConnected) box.replaceChildren(el('p', { className: 'err', textContent: 'Could not open this file. Check your signal and try again.' }));
  }
}

function prepFile(file, maxPx) {
  return new Promise((resolve, reject) => {
    if (file.size > 25 * 1024 * 1024) { reject(new Error('file_size')); return; }
    const raw = () => {
      if (file.size > 8 * 1024 * 1024) { reject(new Error('file_size')); return; }
      const r = new FileReader();
      r.onload = () => resolve({ mime: file.type, name: file.name, data: String(r.result).split(',')[1] });
      r.onerror = () => reject(new Error('read'));
      r.readAsDataURL(file);
    };
    if (file.type === 'application/pdf') { raw(); return; }
    if (!/^image\//.test(file.type)) { reject(new Error('file_type')); return; }
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve({ mime: 'image/jpeg', name: file.name.replace(/\.\w+$/, '') + '.jpg', data: c.toDataURL('image/jpeg', 0.82).split(',')[1] });
    };
    img.onerror = () => { URL.revokeObjectURL(url); raw(); };
    img.src = url;
  });
}

function recForm(o) {
  const editing = !o.isNew;
  hubGo(o.title, o.back);
  const rec = Object.assign({}, o.rec);
  const form = el('form', { className: 'evform', noValidate: true });
  const inputs = {};
  o.fields.forEach(f => {
    let c;
    if (f.type === 'area') c = el('textarea', { value: rec[f.k] || '', maxLength: f.max || 2000 });
    else if (f.type === 'select') {
      c = el('select', {}, ...['', ...f.options].map(v => el('option', { value: v, textContent: v || 'Choose' })));
      c.value = rec[f.k] || '';
    } else {
      c = el('input', { type: f.type === 'date' ? 'date' : f.type === 'tel' ? 'tel' : 'text', value: rec[f.k] || '', maxLength: f.max || 120 });
      if (f.mode) c.inputMode = f.mode;
      if (f.caps) c.autocapitalize = 'characters';
    }
    inputs[f.k] = c;
    form.append(el('label', {}, f.label + (f.need ? ' (required)' : ''), c));
  });
  let fileIn = null;
  if (o.file) {
    fileIn = el('input', { type: 'file', accept: o.file.accept });
    form.append(el('label', {}, o.file.label + ' (optional)', fileIn));
    if (rec[o.file.field]) {
      form.append(el('p', { className: 'filenote', textContent: 'A file is saved. Choose a new one to replace it.' }));
      const vw = el('button', { type: 'button', className: 'btn soft', textContent: 'View saved file' });
      vw.addEventListener('click', () => docView(rec[o.file.field], o.file.label, () => recForm(o)));
      form.append(vw);
    }
  }
  const err = el('p', { className: 'err', role: 'alert' });
  const save = el('button', { className: 'btn', type: 'submit', textContent: 'Save' });
  form.append(err, save);
  let isNew = !!o.isNew, renewOf = o.renewOf || '', base = rec.updatedAt || '';
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    err.textContent = '';
    o.fields.forEach(f => { rec[f.k] = inputs[f.k].value.trim(); });
    const miss = o.fields.find(f => f.need && !rec[f.k]);
    if (miss) { err.textContent = 'Add ' + miss.label.toLowerCase() + '.'; return; }
    if (o.check) { const m = o.check(rec); if (m) { err.textContent = m; return; } }
    save.disabled = true; save.textContent = 'Saving…';
    const reset = () => { save.disabled = false; save.textContent = 'Save'; };
    let prepared = null;
    try {
      if (fileIn && fileIn.files[0]) prepared = await prepFile(fileIn.files[0], o.file.maxPx);
    } catch (e) {
      err.textContent = ERR_TEXT[e.message] || 'Could not read that file. Try a different one.';
      reset(); return;
    }
    try {
      const out = renewOf ? await api('rec.renew', { table: o.table, oldId: renewOf, rec }) : await api('rec.save', { table: o.table, rec, isNew, baseUpdatedAt: base });
      if (out.error === 'auth') return;
      if (!out.ok) { err.textContent = errText(out); reset(); return; }
      isNew = false; renewOf = ''; base = out.rec.updatedAt;
      if (prepared) {
        const up = await api('doc.upload', Object.assign({ table: o.table, id: rec.id, field: o.file.field }, prepared));
        if (up.error === 'auth') return;
        if (!up.ok) { err.textContent = 'The details saved, but the file did not upload. ' + errText(up); reset(); return; }
        base = up.updatedAt;
      }
      await loadHub();
      o.back();
    } catch (e) {
      err.textContent = 'That did not save. Check your signal and try again. Nothing will be duplicated if you tap Save again.';
      reset();
    }
  });
  main.append(form);
  if (editing) {
    const del = el('button', { className: 'btn quiet', textContent: 'Delete' + (o.delNote ? ' ' + o.delNote : '') });
    let armed = false;
    del.addEventListener('click', async () => {
      if (!armed) { armed = true; del.textContent = 'Tap again to delete'; return; }
      del.disabled = true; del.textContent = 'Deleting…';
      try {
        const out = await api('rec.delete', { table: o.table, id: rec.id });
        if (out.error === 'auth') return;
        if (out.ok) { await loadHub(); (o.afterDelete || o.back)(); return; }
        err.textContent = errText(out);
      } catch (e) { err.textContent = 'That did not delete. Check your signal and try again.'; }
      del.disabled = false; armed = false; del.textContent = 'Delete' + (o.delNote ? ' ' + o.delNote : '');
    });
    main.append(del);
  }
}

const dateOrder = (a, b, msg) => r => (r[a] && r[b] && r[a] > r[b]) ? msg : '';

function petForm(p, back) {
  recForm({
    table: 'pets', title: p ? 'Edit pet' : 'New pet', isNew: !p, rec: p || { id: newId() }, back,
    afterDelete: petsList, delNote: 'pet and its records',
    fields: [{ k: 'name', label: 'Pet name', need: true, max: 60 }, { k: 'species', label: 'Species', max: 60 }, { k: 'breed', label: 'Breed', max: 80 }, { k: 'dob', label: 'Date of birth', type: 'date' },
      { k: 'sex', label: 'Sex', type: 'select', options: ['Female', 'Male', 'Spayed female', 'Neutered male', 'Unknown'] }, { k: 'weight', label: 'Weight', max: 30 },
      { k: 'chipId', label: 'Microchip ID number', mode: 'numeric', max: 40 }, { k: 'chipCompany', label: 'Microchip registration company', max: 80 },
      { k: 'vet', label: 'Veterinarian or clinic' }, { k: 'vetPhone', label: 'Veterinarian phone number', type: 'tel', max: 40 }, { k: 'notes', label: 'General notes', type: 'area' }],
    file: { field: 'photoId', label: 'Profile picture', accept: 'image/*', maxPx: 700 }
  });
}

function vaxForm(v, back, renew) {
  const fresh = !v.id || renew;
  const rec = renew ? { id: newId(), petId: v.petId, name: v.name, clinic: v.clinic } : (v.id ? v : Object.assign({ id: newId() }, v));
  recForm({
    table: 'vaccines', title: renew ? 'Renew vaccination' : v.id ? 'Edit vaccination' : 'New vaccination', isNew: fresh, renewOf: renew ? v.id : '', rec, back,
    fields: [{ k: 'name', label: 'Vaccination name', need: true, max: 80 }, { k: 'given', label: 'Date administered', type: 'date' }, { k: 'due', label: 'Expiration or next due date', type: 'date' },
      { k: 'clinic', label: 'Clinic that gave it' }, { k: 'notes', label: 'Notes', type: 'area' }],
    check: dateOrder('given', 'due', 'The next due date has to be after the date given.'),
    file: { field: 'docId', label: 'Vaccination certificate', accept: 'image/*,application/pdf', maxPx: 1800 }
  });
}

function vehicleForm(v, back) {
  recForm({
    table: 'vehicles', title: v ? 'Edit vehicle' : 'New vehicle', isNew: !v, rec: v || { id: newId() }, back,
    afterDelete: vehiclesList, delNote: 'vehicle and its records',
    fields: [{ k: 'nickname', label: 'Nickname', max: 60 }, { k: 'year', label: 'Year', mode: 'numeric', max: 10 }, { k: 'make', label: 'Make', max: 60 }, { k: 'model', label: 'Model', max: 60 }, { k: 'trim', label: 'Trim', max: 60 },
      { k: 'color', label: 'Color', max: 40 }, { k: 'plate', label: 'License plate number', caps: true, max: 20 }, { k: 'vin', label: 'VIN', caps: true, max: 40 }, { k: 'mileage', label: 'Current mileage', mode: 'numeric', max: 20 }, { k: 'notes', label: 'General notes', type: 'area' }],
    check: r => (r.nickname || r.make || r.model) ? '' : ERR_TEXT.missing_name,
    file: { field: 'photoId', label: 'Profile picture', accept: 'image/*', maxPx: 700 }
  });
}

function insForm(r, back, renew) {
  const fresh = !r.id || renew;
  const rec = renew ? { id: newId(), vehicleId: r.vehicleId, company: r.company, policy: r.policy, holder: r.holder, agent: r.agent, start: r.expires } : (r.id ? r : Object.assign({ id: newId() }, r));
  recForm({
    table: 'insurance', title: renew ? 'Renew insurance' : r.id ? 'Edit insurance' : 'New insurance', isNew: fresh, renewOf: renew ? r.id : '', rec, back,
    fields: [{ k: 'company', label: 'Insurance company', need: true }, { k: 'policy', label: 'Policy number', max: 60 }, { k: 'holder', label: 'Policyholder name' }, { k: 'start', label: 'Coverage start date', type: 'date' },
      { k: 'expires', label: 'Coverage expiration or renewal date', type: 'date', need: true }, { k: 'agent', label: 'Insurance agent contact', type: 'area', max: 300 }],
    check: dateOrder('start', 'expires', ERR_TEXT.bad_order),
    file: { field: 'docId', label: 'Insurance card', accept: 'image/*,application/pdf', maxPx: 1800 }
  });
}

function regForm(r, back, renew) {
  const fresh = !r.id || renew;
  const rec = renew ? { id: newId(), vehicleId: r.vehicleId, state: r.state, plate: r.plate, start: r.expires } : (r.id ? r : Object.assign({ id: newId() }, r));
  recForm({
    table: 'registration', title: renew ? 'Renew registration' : r.id ? 'Edit registration' : 'New registration', isNew: fresh, renewOf: renew ? r.id : '', rec, back,
    fields: [{ k: 'state', label: 'State of registration', max: 30 }, { k: 'plate', label: 'License plate number', caps: true, max: 20 }, { k: 'start', label: 'Registration start date', type: 'date' },
      { k: 'expires', label: 'Registration expiration date', type: 'date', need: true }],
    check: dateOrder('start', 'expires', ERR_TEXT.bad_order),
    file: { field: 'docId', label: 'Registration card', accept: 'image/*,application/pdf', maxPx: 1800 }
  });
}
