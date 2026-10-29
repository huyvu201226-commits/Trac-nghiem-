const $=s=>document.querySelector(s);
const h=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mem={};
const st={get(k){try{return localStorage.getItem(k)}catch(e){return mem[k]??null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){mem[k]=v}},del(k){try{localStorage.removeItem(k)}catch(e){delete mem[k]}}};
let idx=[];try{idx=JSON.parse(st.get('qz:idx')||'[]')}catch(e){}
let dirty=false;let hist=[];try{hist=JSON.parse(st.get('qz:hist')||'[]')}catch(e){}
let P=null,view='home',filter='',Q=null,timer=null;
const saveIdx=()=>st.set('qz:idx',JSON.stringify(idx));
const saveP=()=>{if(!P)return;dirty=false;const m=idx.find(x=>x.id===P.id);if(m){m.n=P.qs.length;m.name=P.name;m.topic=P.topic;m.t=Date.now()}st.set('qz:p:'+P.id,JSON.stringify(P));saveIdx();cloudSoon(P.id)};
const saveSoon=()=>{dirty=true;clearTimeout(timer);timer=setTimeout(saveP,250)};
function toast(t){const e=document.createElement('div');e.className='tt';e.textContent=t;document.body.appendChild(e);setTimeout(()=>e.remove(),2600)}

/* ---------- Phân tích tài liệu ---------- */
function parseQuiz(text){
  const L=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),qs=[];let c=null;
  for(const raw of L){
    let m;
    if(c&&(m=raw.match(/^(?:đáp án|dap an|answer|đ\/a)\s*(?:đúng)?\s*[:\-]?\s*([A-Ha-h])\b/i))){c.a=m[1].toUpperCase().charCodeAt(0)-65;continue}
    if(c&&(m=raw.match(/^(?:giải thích|giai thich|explanation|gt)\s*[:\-]\s*(.*)/i))){c.e=m[1];continue}
    if(c&&(m=raw.match(/^([*✓✔]?)\s*([A-Ha-h])\s*[\.\)]\s*(.+)/))){
      let t=m[3],ok=!!m[1];
      if(/(\(đúng\)|\(correct\)|✓|✔)\s*$/i.test(t)){ok=true;t=t.replace(/(\(đúng\)|\(correct\)|✓|✔)\s*$/i,'').trim()}
      c.o.push(t);if(ok)c.a=c.o.length-1;continue}
    if((m=raw.match(/^(?:câu|question|q)?\s*\d+\s*[\.\):]\s*(.+)/i))&&(/^(câu|question|q)/i.test(raw)||!c||c.o.length>=2)){
      c={q:m[1],o:[],a:-1};qs.push(c);continue}
    if(c){if(c.e!==undefined)c.e+=' '+raw;else if(c.o.length)c.o[c.o.length-1]+=' '+raw;else c.q+='\n'+raw}
  }
  return qs.filter(q=>q.o.length>=2);
}
function parseKey(text){
  const map={},re=/(?:câu\s*)?(\d+)\s*[\.\):\-–=→]*\s*(?:đáp án\s*)?([A-Za-z]|\d+)(?![\wÀ-ỹ])/gi;let m;
  while((m=re.exec(text))){const a=m[2],v=/\d/.test(a)?+a-1:a.toUpperCase().charCodeAt(0)-65;map[+m[1]-1]=v}
  return map;
}
async function readFile(f){
  if(/\.docx$/i.test(f.name)){const r=await mammoth.extractRawText({arrayBuffer:await f.arrayBuffer()});return r.value}
  return await f.text();
}

/* ---------- Giao diện chính ---------- */
function render(){
  const A=$('#app');
  if(view==='home'||view==='trash'){
    const live=idx.filter(x=>!x.del),tr=idx.filter(x=>x.del),list=view==='trash'?tr:live.filter(x=>!filter||x.topic===filter);
    const topics=[...new Set(live.map(x=>x.topic).filter(Boolean))];
    A.innerHTML=`<div class="bar"><h1>${view==='trash'?'🗑 Thùng rác':'📚 Trắc nghiệm của tôi'}</h1><span class="sp"></span>
      ${view==='trash'?'<button data-a="home">← Quay lại</button>':`<button data-a="cloud">☁ Đồng bộ</button><button data-a="trash">🗑 Thùng rác (${tr.length})</button><button class="pri" data-a="new">+ Dự án mới</button>`}</div>
      ${view==='home'&&topics.length?`<div class="bar"><span class="mut">Chủ đề:</span><select data-a="filter" style="width:auto"><option value="">Tất cả</option>${topics.map(t=>`<option ${t===filter?'selected':''}>${h(t)}</option>`).join('')}</select></div>`:''}
      ${view==='home'?histHTML():''}<div class="grid">${list.map(x=>`<div class="pc"><b>${h(x.name)}</b><div>${x.topic?`<span class="chip">${h(x.topic)}</span> `:''}<span class="mut">${x.n} câu</span></div>${statsHTML(x.id)}
      <div class="acts">${view==='trash'?`<button data-a="restore" data-id="${x.id}">Khôi phục</button><button class="dng" data-a="purge" data-id="${x.id}">Xóa vĩnh viễn</button>`
      :`<button class="pri" data-a="play" data-id="${x.id}">Làm bài</button><button data-a="edit" data-id="${x.id}">Chỉnh sửa</button><button data-a="phist" data-id="${x.id}">📊 Lịch sử</button><button class="dng" data-a="trashit" data-id="${x.id}">Xóa</button>`}</div></div>`).join('')||'<p class="mut">Chưa có gì ở đây.</p>'}</div>`;
  }else if(view==='proj'){
    A.innerHTML=`<div class="bar"><button data-a="home">← Dự án</button><span class="sp"></span><button class="pri" data-a="start">▶ Start</button></div>
      <div class="row"><input id="pn" value="${h(P.name)}" placeholder="Tên dự án"><input id="pt" value="${h(P.topic||'')}" placeholder="Chủ đề / chương"></div>
      <div class="bar"><button data-a="addq">+ Thêm câu</button><button data-a="paste">📋 Dán câu hỏi</button><button data-a="more">+ Thêm từ tài liệu</button><button data-a="key">📝 Up đáp án</button>
      <span class="mut">${P.qs.length} câu · ${P.qs.filter(q=>q.a>=0).length} có đáp án</span></div>
      <div class="stack">${P.qs.map((q,i)=>`<div class="sc" data-a="zoom" data-i="${i}"><div class="n">Câu ${i+1} ${q.a<0?'· chưa có đáp án':''}</div><div class="t">${h(q.q)}</div></div>`).join('')}</div>`;
    $('#pn').oninput=e=>{P.name=e.target.value;saveSoon()};$('#pt').oninput=e=>{P.topic=e.target.value;saveSoon()};
  }
}
function modal(html){closeModal();const o=document.createElement('div');o.className='ov';o.id='ov';o.innerHTML=`<div class="md">${html}</div>`;o.addEventListener('mousedown',e=>{if(e.target===o&&o.dataset.lock!=='1')closeModal()});document.body.appendChild(o)}
function closeModal(){const o=$('#ov');if(o){o.remove();if(Q)drawQuiz()}}
function openProject(id){const s=st.get('qz:p:'+id);if(!s)return toast('Không tìm thấy dữ liệu');P=JSON.parse(s)}
function zoom(i){
  const q=P.qs[i];
  modal(`<h3>Câu ${i+1}</h3><label class="lab">Câu hỏi</label><textarea id="eq">${h(q.q)}</textarea><label class="lab">Đáp án (chọn ô tròn = đáp án đúng)</label>
  <div id="eo">${q.o.map((o,k)=>`<div class="row"><input type="radio" name="r" ${q.a===k?'checked':''} data-k="${k}"><input data-o="${k}" value="${h(o)}"><button data-x="${k}" class="dng">✕</button></div>`).join('')}</div>
  <label class="lab">Giải thích (hiện sau khi trả lời, có thể để trống)</label><textarea id="ee">${h(q.e||'')}</textarea>
  <div class="bar"><button id="ao">+ Thêm lựa chọn</button><span class="sp"></span><button class="dng" id="dq">Xóa câu</button><button class="pri" id="ok">Xong</button></div>`);
  const sync=()=>{q.q=$('#eq').value;q.e=$('#ee').value;saveSoon()};
  $('#eq').oninput=sync;$('#ee').oninput=sync;
  const bind=()=>{
    document.querySelectorAll('[data-o]').forEach(e=>e.oninput=()=>{q.o[+e.dataset.o]=e.value;saveSoon()});
    document.querySelectorAll('[data-k]').forEach(e=>e.onchange=()=>{q.a=+e.dataset.k;saveSoon()});
    document.querySelectorAll('[data-x]').forEach(e=>e.onclick=()=>{const k=+e.dataset.x;q.o.splice(k,1);if(q.a===k)q.a=-1;else if(q.a>k)q.a--;saveP();zoom(i)});
  };bind();
  $('#ao').onclick=()=>{q.o.push('');saveP();zoom(i)};
  $('#dq').onclick=()=>{if(confirm('Xóa câu này?')){P.qs.splice(i,1);if(Q)Q.ans.splice(i,1);saveP();closeModal();if(!Q)render()}};
  $('#ok').onclick=()=>{sync();saveP();closeModal();if(!Q)render()};
}
function pick(accept,cb){const f=document.createElement('input');f.type='file';f.accept=accept;f.onchange=async()=>{if(f.files[0])cb(f.files[0],await readFile(f.files[0]))};f.click()}

const saveHist=()=>st.set('qz:hist',JSON.stringify(hist.slice(0,300)));
function addHist(ok,tot){hist.unshift({id:'h'+Date.now(),pid:P.id,name:P.name,t:Date.now(),ok,tot,ans:P.qs.map((q,i)=>Q.ans[i]===undefined?-1:Q.ans[i])});hist=hist.slice(0,300);saveHist();cloudHist(hist[0])}
function dkey(t){const d=new Date(t);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}
function histHTML(){
  if(!hist.length)return '';
  const now=new Date(),days=[];
  for(let k=6;k>=0;k--){const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-k),es=hist.filter(x=>dkey(x.t)===dkey(d));
    days.push({lab:d.getDate()+'/'+(d.getMonth()+1),n:es.length,avg:es.length?Math.round(es.reduce((a,x)=>a+x.ok/x.tot*100,0)/es.length):0})}
  let streak=0;
  for(let k=0;k<400;k++){const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-k);if(hist.some(x=>dkey(x.t)===dkey(d)))streak++;else if(k>0)break}
  const f=t=>new Date(t).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  return `<div class="hs"><div class="bar" style="margin-top:0"><b>📈 Lịch sử làm bài</b><span class="sp"></span><span class="mut">🔥 Chuỗi ${streak} ngày</span><button data-a="clrhist">Xóa lịch sử</button></div>
  <div class="days">${days.map(d=>`<div class="dy"><div class="bw"><i style="height:${d.avg}%"></i></div><b>${d.n?d.avg+'%':'–'}</b><span>${d.lab}</span><span>${d.n} lần</span></div>`).join('')}</div>
  <div class="mut" style="margin:10px 0 4px">Gần nhất</div>
  ${hist.slice(0,6).map(x=>`<div class="hi"><div><b>${h(x.name)}</b><div class="mut">${f(x.t)} · ${x.ok}/${x.tot} câu (${Math.round(x.ok/x.tot*100)}%)</div></div><button data-a="hview" data-id="${x.id}">Xem lại + giải thích</button></div>`).join('')}</div>`;
}
function statsHTML(id){
  const hs=hist.filter(x=>x.pid===id);if(!hs.length)return '<div class="mut">Chưa làm lần nào</div>';
  const l=hs.reduce((a,b)=>b.t>a.t?b:a);
  return `<div class="mut">✔ Đã làm <b>${hs.length}</b> lần · Gần nhất: <b>${l.ok}/${l.tot}</b> (${Math.round(l.ok/l.tot*100)}%) · ${new Date(l.t).toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})}</div>`}
function projHist(id){
  const m=idx.find(x=>x.id===id),hs=hist.filter(x=>x.pid===id).sort((a,b)=>b.t-a.t);
  const f=t=>new Date(t).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  modal(`<h3>📊 Lịch sử: ${h(m?m.name:'')}</h3>${hs.length?hs.map((x,i)=>`<div class="hi"><div>${i===0?'<span class="chip" style="background:var(--pri);color:#fff">Kết quả gần nhất</span><br>':''}<b>${x.ok}/${x.tot} câu (${Math.round(x.ok/x.tot*100)}%)</b><div class="mut">${f(x.t)} · ${x.tot-x.ok} câu sai</div></div><button data-a="hview" data-id="${x.id}">Xem lại</button></div>`).join(''):'<p class="mut">Chưa có lần làm nào.</p>'}
  <div class="bar"><span class="sp"></span><button id="hx">Đóng</button></div>`);
  $('#hx').onclick=closeModal;
}
function histView(id){
  const x=hist.find(y=>y.id===id);if(!x)return;openProject(x.pid);if(!P)return toast('Dự án này không còn');
  Q={i:P.qs.length,ans:x.ans.map(v=>v<0?undefined:v),saved:1};drawQuiz();
}
function pasteModal(){
  modal(`<h3>Dán câu hỏi</h3><p class="mut">Dán một hoặc nhiều câu. Dòng “Đáp án: B” và “Giải thích: …” là tùy chọn.</p>
  <textarea id="pt2" style="min-height:200px" placeholder="Thủ đô của Việt Nam là gì?&#10;A. Huế&#10;B. Hà Nội&#10;C. Đà Nẵng&#10;Đáp án: B&#10;Giải thích: Hà Nội là thủ đô từ năm 1010."></textarea>
  <div class="bar"><span class="sp"></span><button id="pc">Hủy</button><button class="pri" id="pg2">Thêm vào dự án</button></div>`);
  $('#pc').onclick=closeModal;
  $('#pg2').onclick=()=>{let tx=$('#pt2').value.trim();if(!tx)return;
    if(!/^(câu|question|q)?\s*\d+\s*[\.\):]/i.test(tx))tx='Câu 1. '+tx;
    const q=parseQuiz(tx);if(!q.length)return toast('Cần ít nhất 2 lựa chọn dạng A. B. C.');
    P.qs.push(...q);saveP();closeModal();render();toast(`Đã thêm ${q.length} câu`)};
}

/* ---------- Làm bài ---------- */
function startQuiz(){
  if(!P.qs.length)return toast('Chưa có câu hỏi');
  Q={i:0,ans:[]};
  drawQuiz();
}
function exitQuiz(){Q=null;const e=$('#qz');if(e)e.remove();if(view==='home')P=null;render()}
function drawQuiz(flash){
  let e=$('#qz');if(!e){e=document.createElement('div');e.id='qz';e.className='qz';document.body.appendChild(e)}
  const n=P.qs.length;
  if(Q.i>=n){
    const ok=P.qs.filter((q,i)=>q.a>=0&&Q.ans[i]===q.a).length,tot=P.qs.filter(q=>q.a>=0).length;
    if(!Q.saved&&tot>0){Q.saved=1;addHist(ok,tot)}
    const L=k=>String.fromCharCode(65+k),sk=P.qs.filter((q,i)=>q.a>=0&&Q.ans[i]===undefined).length;
    const rv=P.qs.map((q,i)=>{const a=Q.ans[i],r=q.a<0?'':(a===q.a?'ok':'bad');
      if(Q.wrong&&r!=='bad')return '';
      return `<div class="rv ${r}"><div class="n">Câu ${i+1} ${r==='ok'?'✓ Đúng':a===undefined&&r==='bad'?'✕ Chưa chọn (tính là sai)':r==='bad'?'✕ Sai':''}</div><div>${h(q.q)}</div>
      <div class="ro">${q.o.map((o,k)=>`<div class="${k===q.a?'ok':k===a?'bad':''}">${k===q.a?'✓':k===a?'✕':'•'} <b>${L(k)}.</b> ${h(o)}${k===a?' <i>(bạn chọn)</i>':''}</div>`).join('')}</div>${q.a<0?'<div class="mut">Câu này chưa có đáp án.</div>':''}${q.e?`<div class="ex">💡 ${h(q.e)}</div>`:'<div class="mut">Chưa có giải thích — bấm ✏ Sửa câu này để thêm.</div>'}
      <div class="acts"><button data-a="qgo" data-i="${i}">Xem</button><button data-a="qedit" data-i="${i}">✏ Sửa câu này</button></div></div>`}).join('');
    e.innerHTML=`<div class="qt"><button data-a="qexit">✕</button><div class="sp"></div></div><div class="qm top"><div class="big"><div class="mut">Hoàn thành</div><div class="s">${ok}/${tot}</div><p class="mut">câu đúng · ${tot-ok} câu sai${sk?` (${sk} câu chưa chọn)`:''}</p><div class="qn"><button data-a="qback">← Câu cuối</button><button data-a="qfilter">${Q.wrong?'Hiện tất cả':'Chỉ câu sai'}</button><button data-a="qredo">Làm lại</button><button class="pri" data-a="qexit">Thoát</button></div></div>${rv}</div>`;return}
  const q=P.qs[Q.i],a=Q.ans[Q.i],done=a!==undefined;
  e.innerHTML=`<div class="qt"><button data-a="qexit">✕</button><div class="pg"><i style="width:${(Q.i+1)/n*100}%"></i></div><b>${Q.i+1}/${n}</b><button data-a="qedit">✏ Sửa</button></div>
  <div class="qm"><div class="qq">${h(q.q)}</div>${q.o.map((o,k)=>{let c='op';if(done){if(q.a>=0&&k===q.a)c+=' ok';else if(k===a)c+=' bad'}
    return `<button class="${c}" data-a="pick" data-k="${k}"><span class="bx">${done&&(k===a||k===q.a)&&q.a>=0?(k===q.a?'✓':'✕'):''}</span><span><b>${String.fromCharCode(65+k)}.</b> ${h(o)}</span></button>`}).join('')}
    ${done&&q.a<0?'<p class="mut">Câu này chưa có đáp án để chấm.</p>':''}${done&&q.e?`<div class="ex">💡 ${h(q.e)}</div>`:''}</div>
  <div class="qn"><button data-a="prev" ${Q.i===0?'disabled':''}>← Trước</button><button class="pri" data-a="next">${Q.i===n-1?'Kết thúc':'Next → (Enter)'}</button></div>`;
  if(flash){const f=document.createElement('div');f.className='fl '+flash;document.body.appendChild(f);setTimeout(()=>f.remove(),950)}
}

/* ---------- Sự kiện ---------- */
document.addEventListener('change',e=>{if(e.target.dataset.a==='filter'){filter=e.target.value;render()}});
document.addEventListener('click',async e=>{
  const t=e.target.closest('[data-a]');if(!t||t.tagName==='SELECT')return;
  const a=t.dataset.a,id=t.dataset.id,m=idx.find(x=>x.id===id);
  if(a==='home'){if(P&&dirty)saveP();P=null;view='home';render()}
  else if(a==='trash'){view='trash';render()}
  else if(a==='cloud')cloudModal();
  else if(a==='phist')projHist(id);
  else if(a==='hview'){closeModal();histView(id)}
  else if(a==='clrhist'){if(confirm('Xóa toàn bộ lịch sử làm bài?')){hist.forEach(x=>cloudHist({id:x.id,gone:1,t:Date.now()}));hist=[];saveHist();render()}}
  else if(a==='new')newProject();
  else if(a==='play'){openProject(id);if(P)startQuiz()}
  else if(a==='edit'){openProject(id);if(P){view='proj';render()}}
  else if(a==='trashit'){m.del=1;m.t=Date.now();saveIdx();cloudNow(id);render();toast('Đã chuyển vào thùng rác')}
  else if(a==='restore'){m.del=0;m.t=Date.now();saveIdx();cloudNow(id);render()}
  else if(a==='purge'){if(confirm('Xóa vĩnh viễn?')){idx=idx.filter(x=>x.id!==id);st.del('qz:p:'+id);saveIdx();cloudGone(id);render()}}
  else if(a==='start')startQuiz();
  else if(a==='zoom')zoom(+t.dataset.i);
  else if(a==='addq'){P.qs.push({q:'Câu hỏi mới',o:['',''],a:-1});saveP();render();zoom(P.qs.length-1)}
  else if(a==='more')pick('.txt,.md,.docx',(f,tx)=>{const q=parseQuiz(tx);P.qs.push(...q);saveP();render();toast(`Đã thêm ${q.length} câu`)});
  else if(a==='key')pick('.txt,.md,.docx',(f,tx)=>{const k=parseKey(tx);let c=0;for(const i in k)if(P.qs[i]&&k[i]>=0&&k[i]<P.qs[i].o.length){P.qs[i].a=k[i];c++}saveP();render();toast(`Đã gán đáp án cho ${c} câu`)});
  else if(a==='pick'&&Q&&Q.ans[Q.i]===undefined){const k=+t.dataset.k,q=P.qs[Q.i];Q.ans[Q.i]=k;drawQuiz(q.a<0?null:(k===q.a?'ok':'bad'))}
  else if(a==='next'){Q.i++;drawQuiz()}
  else if(a==='prev'&&Q.i>0){Q.i--;drawQuiz()}
  else if(a==='paste')pasteModal();
  else if(a==='qedit')zoom(t.dataset.i!==undefined?+t.dataset.i:Q.i);
  else if(a==='qfilter'){Q.wrong=!Q.wrong;drawQuiz()}
  else if(a==='qgo'){Q.i=+t.dataset.i;drawQuiz()}
  else if(a==='qexit')exitQuiz();
  else if(a==='qback'){Q.i=P.qs.length-1;drawQuiz()}
  else if(a==='qredo'){Q={i:0,ans:[]};drawQuiz()}
});
document.addEventListener('keydown',e=>{
  if(!Q||$('#ov')||e.repeat||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
  if(e.key==='Enter'||e.key==='ArrowRight'){e.preventDefault();if(Q.i<P.qs.length){Q.i++;drawQuiz()}}
  else if(e.key==='ArrowLeft'&&Q.i>0){e.preventDefault();Q.i--;drawQuiz()}
});
function newProject(){
  modal(`<h3>Dự án mới</h3><label class="lab">Tên</label><input id="nn" placeholder="VD: Ôn tập Sinh học"><label class="lab">Chủ đề / chương</label><input id="nt" placeholder="VD: Chương 1">
  <label class="lab">Tệp tài liệu (.txt, .md, .docx)</label><input type="file" id="nf" accept=".txt,.md,.docx"><label class="lab">…hoặc dán nội dung</label><textarea id="np" placeholder="Câu 1. Nội dung câu hỏi&#10;A. Lựa chọn 1&#10;B. Lựa chọn 2&#10;C. Lựa chọn 3&#10;Đáp án: B"></textarea>
  <p class="mut">Đáp án đúng nhận diện qua dòng “Đáp án: B”, dấu * trước lựa chọn, hoặc up tệp đáp án riêng sau (VD “2. B” hoặc “2-2” nghĩa là câu 2 chọn đáp án thứ 2).</p>
  <div class="bar"><span class="sp"></span><button id="nc">Hủy</button><button class="pri" id="ng">Tạo</button></div>`);
  $('#nc').onclick=closeModal;
  $('#ng').onclick=async()=>{
    const f=$('#nf').files[0];let tx=$('#np').value;if(f)tx=await readFile(f);
    const qs=parseQuiz(tx);if(!qs.length)return toast('Không nhận diện được câu hỏi nào');
    const id='p'+Date.now().toString(36),name=$('#nn').value.trim()||(f?f.name.replace(/\.\w+$/,''):'Dự án mới');
    P={id,name,topic:$('#nt').value.trim(),qs};idx.unshift({id,name,topic:P.topic,n:qs.length,del:0});saveP();closeModal();view='proj';render();toast(`Đã tạo ${qs.length} câu`)};
}

/* ---------- Đồng bộ Firebase (nền, không chặn giao diện) ---------- */
function getCode(){let c=st.get('qz:code');if(!c||c.length<20){c=[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');st.set('qz:code',c)}return c}
const cloudTimers={};let cloudWarned=0;
function cloudReady(){return !!(window.Cloud&&window.Cloud.ok)}
function cloudErr(){if(Date.now()-cloudWarned>30000){cloudWarned=Date.now();toast('Chưa đồng bộ được, dữ liệu vẫn lưu trên máy')}}
function projDoc(id){const m=idx.find(x=>x.id===id),s=st.get('qz:p:'+id);if(!m||!s)return null;return{id,name:m.name,topic:m.topic||'',n:m.n||0,del:m.del?1:0,t:m.t||Date.now(),gone:0,qs:JSON.stringify(JSON.parse(s).qs)}}
function cloudNow(id){if(!cloudReady())return;const d=projDoc(id);if(d)Cloud.push(d).catch(cloudErr)}
function cloudSoon(id){clearTimeout(cloudTimers[id]);cloudTimers[id]=setTimeout(()=>cloudNow(id),1500)}
function cloudHist(e){if(e&&cloudReady())Cloud.pushH(e).catch(cloudErr)}
function cloudGone(id){if(cloudReady())Cloud.push({id,gone:1,t:Date.now()}).catch(cloudErr)}
async function cloudSync(){
  if(!cloudReady())return;
  try{
    const remote=await Cloud.pullAll(),seen=new Set();let changed=false;
    for(const r of remote){
      seen.add(r.id);const m=idx.find(x=>x.id===r.id);
      if(r.gone){if(m){idx=idx.filter(x=>x.id!==r.id);st.del('qz:p:'+r.id);changed=true}continue}
      if(P&&P.id===r.id)continue;
      if(!m||(r.t||0)>(m.t||0)){
        idx=idx.filter(x=>x.id!==r.id);idx.unshift({id:r.id,name:r.name,topic:r.topic,n:r.n,del:r.del,t:r.t});
        st.set('qz:p:'+r.id,JSON.stringify({id:r.id,name:r.name,topic:r.topic,qs:JSON.parse(r.qs)}));changed=true;
      }else if((m.t||0)>(r.t||0))cloudNow(r.id);
    }
    for(const m of idx)if(!seen.has(m.id))cloudNow(m.id);
    const rh=await Cloud.pullH(),gone=new Set(),have=new Set(hist.map(x=>x.id));let hc=false;
    for(const r of rh){if(r.gone){gone.add(r.id);continue}if(!have.has(r.id)){hist.push({id:r.id,pid:r.pid,name:r.name,t:r.t,ok:r.ok,tot:r.tot,ans:r.ans||[]});hc=true}}
    const nb=hist.length;hist=hist.filter(x=>!gone.has(x.id));if(hist.length!==nb)hc=true;
    const rids=new Set(rh.map(x=>x.id));hist.forEach(x=>{if(!rids.has(x.id))cloudHist(x)});
    if(hc){hist.sort((a,b)=>b.t-a.t);hist=hist.slice(0,300);saveHist()}
    if(changed||hc){if(changed)saveIdx();if(!Q&&!$('#ov')&&(view==='home'||view==='trash'))render()}
  }catch(e){cloudErr()}
}
function cloudModal(){
  const c=getCode();
  modal(`<h3>☁ Đồng bộ Firebase</h3><p class="mut">${cloudReady()?'Đã kết nối. Dữ liệu tự lưu lên Firebase.':'Chưa kết nối Firebase (kiểm tra mạng hoặc mở bằng Live Server). Dữ liệu vẫn lưu trên máy.'}</p>
  <label class="lab">Mã đồng bộ của bạn (giữ riêng tư: ai có mã đều xem và sửa được dữ liệu)</label><input id="cc" readonly value="${c}">
  <div class="bar"><button id="cp">Sao chép mã</button><button id="cn">Đồng bộ ngay</button></div>
  <label class="lab">Dùng mã từ máy khác (dự án trên máy này sẽ được gộp vào mã đó)</label><input id="ci" placeholder="Dán mã vào đây">
  <div class="bar"><span class="sp"></span><button id="cx">Đóng</button><button class="pri" id="cu">Dùng mã này</button></div>`);
  $('#cx').onclick=closeModal;
  $('#cp').onclick=()=>{try{navigator.clipboard.writeText(c);toast('Đã sao chép')}catch(e){$('#cc').select()}};
  $('#cn').onclick=()=>{cloudSync();toast('Đang đồng bộ…')};
  $('#cu').onclick=()=>{const v=$('#ci').value.trim();if(!/^[A-Za-z0-9]{20,}$/.test(v))return toast('Mã không hợp lệ (cần ít nhất 20 ký tự chữ/số)');st.set('qz:code',v);closeModal();cloudSync();toast('Đã đổi mã, đang đồng bộ…')};
}

/* ---------- Bền dữ liệu ---------- */
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
let lastSync=0;
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(P&&dirty)saveP()}else if(Date.now()-lastSync>8000){lastSync=Date.now();cloudSync()}});
window.addEventListener('pagehide',()=>{if(P&&dirty)saveP()});
window.addEventListener('online',()=>cloudSync());
render();
