/* ============================================================
   xiaobei Skill Studio · 共享逻辑
   每页通过 window.SKILL_META + window.SKILL_FIELDS 驱动
   ============================================================ */

/* 全局技能清单（侧栏导航 + index 卡片共用） */
const SKILLS = [
  {id:'expert-xhs', emoji:'📕', name:'小红书运营',
   desc:'定位起号、内容DNA、图文笔记生产与发布、数据复盘'},
  {id:'expert-douyin', emoji:'🎵', name:'抖音运营',
   desc:'定位起号、内容DNA、图文笔记生产与发布、视频全案Brief、数据复盘'},
  {id:'expert-wx-mp', emoji:'📱', name:'公众号运营',
   desc:'定位起号、选题写作、排版发布、数据复盘'},
  {id:'expert-wx-channel', emoji:'📺', name:'视频号运营',
   desc:'视频号定位起号、内容DNA、视频全案Brief、发布与数据复盘'},
  {id:'viral-chaser', emoji:'🎯', name:'爆款拆解',
   desc:'转发视频链接，自动下载、ASR转写、关键帧抽取、结构化拆解分析'},
  {id:'weibo-publish', emoji:'📢', name:'微博发布',
   desc:'在微博发布文字、图文或视频'},
  {id:'zhihu-publish', emoji:'📝', name:'知乎发布',
   desc:'在知乎发布文章或回答'},
  {id:'wxwork-moments', emoji:'📱', name:'企微朋友圈发布',
   desc:'企业微信客户朋友圈发布（文字/图片/视频/链接）'}
];

let currentSkill = null;
let formValues = {};
let toastTimer = null;
let previewTimer = null;

/* HTML 属性值与文本转义（值可能含引号或尖括号） */
function escAttr(v){
  return String(v===undefined||v===null?'':v)
    .replace(/&/g,'&amp;').replace(/"/g,'&quot;')
    .replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* 视图切换后把焦点移入主区（tabindex=-1 容器），避免焦点落到 body */
function focusMain(){
  const main = document.getElementById('mainArea');
  if(main && typeof main.focus === 'function') main.focus();
}

/* ===== 侧栏渲染 ===== */
function renderNav(){
  const nav = document.getElementById('navList');
  if(!nav) return;
  nav.innerHTML = SKILLS.map(s=>{
    const cur = (currentSkill && s.id===currentSkill.id) ? 'page' : '';
    const href = s.id + '/index.html';
    return `<li>
      <a class="nav-item" data-skill-id="${s.id}" aria-current="${cur}" href="${href}">
        <span class="nav-emoji" aria-hidden="true">${s.emoji}</span>
        <span class="nav-label">${s.name}</span>
      </a>
    </li>`;
  }).join('');
}

/* ===== skill 页面渲染 ===== */
function defaultFormValues(skill){
  const v = {};
  skill.fields.forEach(f=>{ v[f.key] = f.default || ''; });
  return v;
}

function renderSkillPage(skill){
  formValues = defaultFormValues(skill);
  skill.fields.forEach(f=>{ delete f.touched; });

  const main = document.getElementById('mainArea');
  main.innerHTML = `
    <header class="page-header">
      <span class="skill-badge" aria-hidden="true">${skill.emoji}</span>
      <div>
        <h1 class="page-title">${skill.name}</h1>
        <p class="page-desc">${skill.desc}</p>
      </div>
      <a class="skill-doc-link" href="./SKILL.md" target="_blank" rel="noopener">查看 SKILL.md ↗</a>
    </header>

    <section class="panel">
      <h2 class="panel-title">必填参数</h2>
      <div class="field-group" id="fieldGroupRequired">
        ${skill.fields.filter(f=>f.required||f.requiredIf||f.driver).map(renderField).join('')}
      </div>
    </section>

    ${skill.fields.some(f=>!f.required && !f.requiredIf && !f.driver) ? `
    <section class="panel">
      <h2 class="panel-title">高级选项 <span class="req">可选</span></h2>
      <div class="field-group" id="fieldGroupOptional">
        ${skill.fields.filter(f=>!f.required && !f.requiredIf && !f.driver).map(renderField).join('')}
      </div>
    </section>` : ''}

    <div class="work-grid">
      <section class="panel">
        <h2 class="panel-title">将发送给小贝的指令</h2>
        <div class="preview-box glass empty" id="previewBox">填写参数后这里会生成发给小贝的指令</div>
      </section>

      <section class="panel">
        <h2 class="panel-title">操作</h2>
        <div class="btn-group">
          <button class="btn btn-primary" id="btnCopy" onclick="copyInstruction(this)" type="button">
            <span class="spinner" aria-hidden="true"></span>
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            复制指令
          </button>
          <button class="btn btn-secondary" id="btnDownload" onclick="downloadInstruction(this)" type="button">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            下载 .md
          </button>
          <button class="btn btn-tertiary" id="btnSend" onclick="sendToGateway(this)" type="button">
            <span class="spinner" aria-hidden="true"></span>
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            发送到 gateway
          </button>
        </div>
      </section>
    </div>

    <section class="panel">
      <h2 class="panel-title">Gateway 配置 <span class="req">可选</span></h2>
      <div class="gateway-row">
        <div class="field">
          <label class="field-label" for="gwUrl">URL</label>
          <input class="field-input" id="gwUrl" type="text" placeholder="http://localhost:18789">
        </div>
        <div class="field">
          <label class="field-label" for="gwToken">Token</label>
          <input class="field-input" id="gwToken" type="password" placeholder="••••••">
        </div>
        <button class="btn btn-secondary" onclick="testGateway(this)" type="button">
          <span class="spinner" aria-hidden="true"></span>
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M5 12h14"/><path d="M12 5v14"/>
          </svg>
          测试连接
        </button>
      </div>
      <p class="field-help gateway-note"><strong>示例端点</strong>：本页会把 <code>/api/v1/chat</code> 拼接到上面填写的 URL 之后，因此 URL 只填到域名端口即可（如 <code>http://localhost:18789</code>）；需要其它端点请自行改造。端点不存在时返回 404。</p>
    </section>
  `;

  // gateway 回填值必须用 value 属性赋值，不能拼进 HTML（避免含引号时截断/注入）
  const gwU = document.getElementById('gwUrl');
  const gwT = document.getElementById('gwToken');
  if(gwU) gwU.value = localStorage.getItem('xiaobei.gateway.url') || '';
  if(gwT) gwT.value = localStorage.getItem('xiaobei.gateway.token') || '';

  // 绑定字段输入：input 只同步值+预览；change 只原地刷新必填标注，绝不重建表单
  skill.fields.forEach(f=>{
    const el = document.getElementById(`field-${f.key}`);
    if(!el) return;
    el.addEventListener('input', ()=>{
      formValues[f.key] = el.value;
      f.touched = true;
      updatePreviewDebounced();
    });
    el.addEventListener('change', ()=>{
      formValues[f.key] = el.value;
      f.touched = true;
      refreshFieldMeta(skill);
      updatePreview();
    });
    el.addEventListener('blur', ()=>{
      if(!formValues[f.key] || !formValues[f.key].trim()) f.touched = true;
      updatePreview();
    });
  });

  updatePreview();
  focusMain();
}

/* 原地刷新字段的必填标注与 aria 状态（保留用户已输入的值与 DOM/焦点） */
function refreshFieldMeta(skill){
  skill.fields.forEach(f=>{
    const req = isRequired(f);
    const label = document.getElementById(`label-${f.key}`);
    if(label){
      const mark = req ? ' <span class="req-mark" aria-hidden="true">*</span><span class="req-text">必填</span>' : '';
      label.innerHTML = `${f.label}${mark}`;
    }
    const el = document.getElementById(`field-${f.key}`);
    if(el){
      if(req) el.setAttribute('aria-required','true'); else el.removeAttribute('aria-required');
    }
  });
}

/* 字段是否当前必填：支持 required 布尔值与 requiredIf(动态) 两种声明 */
function isRequired(f){
  if(typeof f.requiredIf==='function') return !!f.requiredIf(formValues);
  return !!f.required;
}

/* ===== 字段渲染 ===== */
function renderField(f){
  const req = isRequired(f);
  const reqMark = req ? '<span class="req-mark" aria-hidden="true">*</span>' : '';
  const reqText = req ? '<span class="req-text">必填</span>' : '';
  const help = f.help ? `<div class="field-help" id="help-${f.key}">${f.help}</div>` : '';
  const described = f.help ? `aria-describedby="help-${f.key} err-${f.key}"` : `aria-describedby="err-${f.key}"`;
  const val = formValues[f.key]||'';
  const common = `id="field-${f.key}" ${req?'aria-required="true"':''} ${described}`;
  let input = '';

  if(f.type==='select'){
    const cur = val || f.default;
    const opts = (f.options||[]).map(o=>`<option value="${o.v}" ${o.v===cur?'selected':''}>${o.l}</option>`).join('');
    input = `<select class="field-select" ${common}>${opts}</select>`;
  } else if(f.type==='textarea'){
    input = `<textarea class="field-textarea" ${common} placeholder="${escAttr(f.placeholder||'')}">${escAttr(val)}</textarea>`;
  } else {
    const t = f.type==='url'?'url':f.type==='number'?'number':'text';
    input = `<input class="field-input" ${common} type="${t}" placeholder="${escAttr(f.placeholder||'')}" value="${escAttr(val)}">`;
  }

  return `<div class="field">
    <label class="field-label" id="label-${f.key}" for="field-${f.key}">${f.label}${reqMark}${reqText}</label>
    ${input}
    <div class="field-error" id="err-${f.key}" aria-live="polite"></div>
    ${help}
  </div>`;
}

/* ===== 指令预览（防抖200ms） ===== */
function updatePreviewDebounced(){
  clearTimeout(previewTimer);
  previewTimer = setTimeout(updatePreview, 200);
}
function updatePreview(){
  const box = document.getElementById('previewBox');
  if(!box) return;
  const required = currentSkill.fields.filter(isRequired);
  const missing = required.filter(f=>!formValues[f.key] || !formValues[f.key].trim());
  const btnCopy=document.getElementById('btnCopy');
  const btnDl=document.getElementById('btnDownload');
  const btnSend=document.getElementById('btnSend');
  const disable=missing.length>0;
  if(btnCopy) btnCopy.disabled=disable;
  if(btnDl) btnDl.disabled=disable;
  if(btnSend) btnSend.disabled=disable;
  // 仅在「已交互且缺失」时才标记错误态，避免首屏就播报无效输入
  currentSkill.fields.forEach(f=>{
    const el=document.getElementById('field-'+f.key);
    const err=document.getElementById('err-'+f.key);
    if(!el) return;
    const bad = required.includes(f) && missing.includes(f) && f.touched;
    if(bad){ el.setAttribute('aria-invalid','true'); }
    else { el.removeAttribute('aria-invalid'); }
    if(err){
      const msg = bad ? `请填写${f.label}` : '';
      if(err.textContent !== msg) err.textContent = msg;
    }
  });
  if(disable){
    box.classList.add('empty');
    box.textContent = '填写参数后这里会生成发给小贝的指令';
    return;
  }
  try{
    const instruction = currentSkill.build(formValues);
    box.classList.remove('empty');
    box.textContent = instruction;
  }catch(e){
    box.classList.add('empty');
    box.textContent = '指令生成失败，请检查参数后重试';
  }
}

/* ===== 复制 ===== */
function copyInstruction(btn){
  const box = document.getElementById('previewBox');
  if(!box || box.classList.contains('empty')){
    showToast('请先填写必填参数', 'error');
    return;
  }
  const text = box.textContent;
  const icon=btn?btn.querySelector('.btn-icon'):null;
  const origIcon=icon?icon.innerHTML:'';
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(
      ()=>{showToast('已复制到剪贴板','success');swapCheckIcon(icon,origIcon);},
      ()=>fallbackCopy(text, icon, origIcon)
    );
  } else {
    fallbackCopy(text, icon, origIcon);
  }
}
function swapCheckIcon(icon,orig){
  if(!icon) return;
  icon.innerHTML='<polyline points="20 6 9 17 4 12"/>';
  setTimeout(()=>{icon.innerHTML=orig;},1500);
}
function fallbackCopy(text, icon, origIcon){
  const ta=document.createElement('textarea');
  ta.value=text; ta.style.position='fixed'; ta.style.left='-9999px';
  document.body.appendChild(ta); ta.select();
  try{
    const ok = document.execCommand('copy');
    if(ok){ showToast('已复制到剪贴板', 'success'); swapCheckIcon(icon,origIcon); }
    else { showToast('复制失败，请手动选取', 'error'); }
  }
  catch(e){ showToast('复制失败，请手动选取', 'error'); }
  document.body.removeChild(ta);
}

/* 统一 loading：加 spinner、保持按钮宽度稳定，不修改可见文案 */
function setLoading(btn, on){
  if(!btn) return;
  if(on){
    if(!btn.querySelector('.spinner')){
      const sp=document.createElement('span');
      sp.className='spinner'; sp.setAttribute('aria-hidden','true');
      btn.insertBefore(sp, btn.firstChild);
    }
    if(document.activeElement === btn) btn.dataset.regainFocus = '1';
    btn.classList.add('loading');
    btn.disabled=true;
    btn.setAttribute('aria-busy','true');
  } else {
    btn.classList.remove('loading');
    btn.removeAttribute('aria-busy');
    btn.disabled=false;
    if(btn.dataset.regainFocus){
      delete btn.dataset.regainFocus;
      btn.focus();
    }
  }
}

/* ===== 下载 .md ===== */
function downloadInstruction(){
  const box=document.getElementById('previewBox');
  if(!box || box.classList.contains('empty')){
    showToast('请先填写必填参数', 'error'); return;
  }
  const text=box.textContent;
  const blob=new Blob([text], {type:'text/markdown'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=`${currentSkill.id}-instruction.md`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast('已下载指令文件', 'success');
}

/* ===== gateway ===== */
async function testGateway(btn){
  const url=document.getElementById('gwUrl').value.trim();
  const token=document.getElementById('gwToken').value.trim();
  if(!url){ showToast('请填写 gateway URL', 'error'); return; }
  localStorage.setItem('xiaobei.gateway.url', url);
  if(token) localStorage.setItem('xiaobei.gateway.token', token);
  setStatus('sending');
  setLoading(btn, true);
  try{
    const res=await fetch(url+'/status', {headers: token?{Authorization:'Bearer '+token}:{}});
    if(res.ok){
      setStatus('connected'); showToast('gateway 连接成功', 'success');
    } else {
      setStatus('failed'); showToast(`连接失败（HTTP ${res.status}）`, 'error');
    }
  }catch(e){
    setStatus('failed'); showToast('连接失败，请检查 URL 和网络', 'error');
  }finally{
    setLoading(btn, false);
    if(btn) btn.disabled=false;
  }
}

async function sendToGateway(btn){
  const box=document.getElementById('previewBox');
  if(!box || box.classList.contains('empty')){
    showToast('请先填写必填参数', 'error'); return;
  }
  const gwUrlEl=document.getElementById('gwUrl');
  const gwTokEl=document.getElementById('gwToken');
  const url=((gwUrlEl&&gwUrlEl.value)||localStorage.getItem('xiaobei.gateway.url')||'').trim();
  const token=((gwTokEl&&gwTokEl.value)||localStorage.getItem('xiaobei.gateway.token')||'').trim();
  if(!url){
    showToast('请先配置 gateway URL', 'error'); return;
  }
  localStorage.setItem('xiaobei.gateway.url', url);
  if(token) localStorage.setItem('xiaobei.gateway.token', token);
  setStatus('sending');
  setLoading(btn, true);
  try{
    const res=await fetch(url+'/api/v1/chat', {
      method:'POST',
      headers:{'Content-Type':'application/json', ...(token?{Authorization:'Bearer '+token}:{})},
      body:JSON.stringify({prompt:box.textContent})
    });
    if(res.ok){
      setStatus('connected'); showToast('指令已发送到 gateway', 'success');
    } else {
      setStatus('failed'); showToast(`发送失败（HTTP ${res.status}），请确认 gateway 是否提供该端点`, 'error');
    }
  }catch(e){
    setStatus('failed'); showToast('发送失败，请检查 gateway 连接', 'error');
  }finally{
    setLoading(btn, false);
    if(btn) btn.disabled = !!(box && box.classList.contains('empty'));
  }
}

function setStatus(status){
  const light=document.getElementById('statusLight');
  if(!light) return;
  light.setAttribute('data-status', status);
  const labels={unconnected:'未连接 gateway', connected:'已连接 gateway', sending:'发送中…', failed:'发送失败'};
  light.querySelector('.status-text').textContent=labels[status]||'未知';
}

/* ===== toast ===== */
const TOAST_ICON={success:'✓',error:'✕',info:'i'};
function showToast(message, type){
  const toast=document.getElementById('toast');
  const t=type||'info';
  toast.innerHTML=`<span class="toast-icon" aria-hidden="true">${TOAST_ICON[t]||'i'}</span>${escAttr(message)}`;
  toast.setAttribute('data-type', t);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  toastTimer=setTimeout(()=>{
    toast.classList.remove('show');
    toast.textContent='';
  }, reduce ? 0 : 3000);
}

/* ============================================================
   公共入口：每页只需在 <script> 中设置 SKILL_META 然后调用
   SkillUI.init()（index 页）或 SkillUI.initSkill()（skill 详情页）
   ============================================================ */
const SkillUI = {
  init(){
    // index 页：不需要 currentSkill，只渲染侧栏
    renderNav();
    const home = document.getElementById('navHome');
    if(home) home.setAttribute('aria-current','page');
    document.querySelectorAll('.nav-item').forEach(el=>{
      el.setAttribute('aria-current','');
    });
    focusMain();
  },
  initSkill(){
    currentSkill = window.SKILL_META;
    currentSkill.fields = window.SKILL_FIELDS;
    document.documentElement.setAttribute('data-skill', currentSkill.id);
    document.title = `${currentSkill.name} · xiaobei Skill Studio`;
    renderNav();
    // 标记当前页在侧栏中的导航项
    document.querySelectorAll('.nav-item').forEach(el=>{
      if(el.getAttribute('data-skill-id')===currentSkill.id)
        el.setAttribute('aria-current','page');
      else
        el.removeAttribute('aria-current');
    });
    renderSkillPage(currentSkill);
  }
};
