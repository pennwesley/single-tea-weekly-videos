let DATA = { videos: [] };

function fmtCount(n) {
  n = n || 0;
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  return String(n);
}
function fmtTime(ts) {
  if (!ts) return '未知';
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('zh-CN');
}
function platformLabel(p) { return p === 'douyin' ? '抖音' : '视频号'; }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
// 抖音：尝试唤起 App（snssdk1128 scheme），失败/桌面端回退到网页版
function openDouyin(id, web){
  id = decodeURIComponent(id); web = decodeURIComponent(web);
  const scheme = 'snssdk1128://aweme/detail/' + id;
  let fb = setTimeout(function(){ window.location.href = web; }, 1200);
  document.addEventListener('visibilitychange', function h(){
    if (document.hidden) clearTimeout(fb);          // App 已打开，取消回退
    document.removeEventListener('visibilitychange', h);
  });
  window.location.href = scheme;
}
// 仅设置网页版回退（scheme 由 <a href> 原生触发，兼容性更好）
function scheduleWeb(web){
  web = decodeURIComponent(web);
  let fb = setTimeout(function(){ window.location.href = web; }, 1200);
  document.addEventListener('visibilitychange', function h(){
    if (document.hidden) clearTimeout(fb);
    document.removeEventListener('visibilitychange', h);
  });
}
// 复制链接（微信内 App 唤起常被拦截，退化为手动复制）
function copyLink(text){
  text = decodeURIComponent(text);
  let toastTimer;
  function toast(msg){
    let t = document.getElementById('toast');
    if (!t){ t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 2000);
  }
  function fallback(){
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.top = '-9999px';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand('copy'); toast('✅ 链接已复制，去抖音粘贴打开'); }
    catch (e) { toast('复制失败，请长按链接手动复制'); }
    document.body.removeChild(ta);
  }
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){ toast('✅ 链接已复制，去抖音粘贴打开'); }).catch(fallback);
  } else { fallback(); }
}

function render() {
  const pf = document.getElementById('platform').value;
  const sort = document.getElementById('sort').value;
  const leadOnly = document.getElementById('leadOnly').checked;
  let v = DATA.videos.filter(x => pf === 'all' || x.platform === pf);
  if (leadOnly) v = v.filter(x => x.is_lead);
  v = v.slice();
  if (sort === 'newest') v.sort((a, b) => (b.publish_time || 0) - (a.publish_time || 0));
  else if (sort === 'like') v.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
  else if (sort === 'share') v.sort((a, b) => (b.share_count || 0) - (a.share_count || 0));

  const list = document.getElementById('list');
  document.getElementById('count').textContent = `共 ${v.length} 条`;

  if (!v.length) { list.innerHTML = '<p class="empty">暂无数据</p>'; return; }

  list.innerHTML = v.map(x => {
    const head = `
      <div class="card-head">
        <span class="tag tag-${x.platform}">${platformLabel(x.platform)}</span>
        ${x.is_lead ? '<span class="lead">🔥潜在客户</span>' : ''}
        ${x.source_type === 'history' ? '<span class="hist">历史</span>' : ''}
      </div>`;
    const titleCls = (x.platform === 'douyin' && x.video_url) ? 'title clickable' : 'title';
    const titleOnclick = (x.platform === 'douyin' && x.video_url)
      ? `onclick="openDouyin('${encodeURIComponent(x.video_id)}','${encodeURIComponent(x.video_url)}')"` : '';
    const titleHtml = `<div class="${titleCls}" ${titleOnclick}>${escapeHtml(x.title || '(无标题)')}</div>`;
    const metaHtml = `
      <div class="meta">
        <span>👤 ${escapeHtml(x.author || '未知账号')}</span>
        <span>👍 ${fmtCount(x.like_count)}</span>
        <span>🔁 ${fmtCount(x.share_count)}</span>
        <span>🕒 ${fmtTime(x.publish_time)}</span>
      </div>`;
    const wordsHtml = x.lead_words && x.lead_words.length
      ? `<div class="words">意向词：${x.lead_words.map(escapeHtml).join('、')}</div>` : '';

    if (x.platform === 'douyin' && x.video_url) {
      const id = encodeURIComponent(x.video_id || '');
      const eweb = encodeURIComponent(x.video_url);
      return `<div class="card">${head}${titleHtml}${metaHtml}${wordsHtml}
        <div class="actions">
          <a class="btn-app" href="snssdk1128://aweme/detail/${id}" onclick="scheduleWeb('${eweb}')">📱 在抖音打开</a>
          <a class="btn-web" href="${encodeURI(x.video_url)}" target="_blank" rel="noopener">🌐 网页版</a>
          <button class="btn-copy" onclick="copyLink('${eweb}')">📋 复制链接</button>
        </div></div>`;
    }
    if (x.video_url) {
      return `<a class="card" href="${encodeURI(x.video_url)}" target="_blank" rel="noopener">${head}${titleHtml}${metaHtml}${wordsHtml}</a>`;
    }
    return `<div class="card">${head}${titleHtml}${metaHtml}${wordsHtml}<div class="nolink">（无链接：${escapeHtml(x.author || '')} · ${escapeHtml(x.title || '')}）</div></div>`;
  }).join('');
}

fetch('data.json').then(r => r.json()).then(d => {
  DATA = d;
  document.getElementById('updated').textContent = (d.updated_at || '').replace('T', ' ');
  document.getElementById('kw').textContent = d.keyword || '单泡茶';
  render();
}).catch(e => {
  document.getElementById('list').innerHTML = '<p class="empty">加载失败：' + e + '</p>';
});

['platform', 'sort', 'leadOnly'].forEach(id => {
  document.getElementById(id).addEventListener('change', render);
});
