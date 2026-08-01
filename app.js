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
// 复制链接：仅抖音复制 v.douyin.com 短链（打开抖音自动跳转）。视频号官方短链需升级 API 套餐，前端不再提供复制按钮。
function copyLink(text, tip){
  text = decodeURIComponent(text);
  tip = tip || '打开抖音自动跳转';
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
    try { document.execCommand('copy'); toast('✅ 已复制，' + tip); }
    catch (e) { toast('复制失败，请长按链接手动复制'); }
    document.body.removeChild(ta);
  }
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){ toast('✅ 已复制，' + tip); }).catch(fallback);
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
    const titleHtml = `<div class="title">${escapeHtml(x.title || '(无标题)')}</div>`;
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
      const eweb = encodeURIComponent(x.video_url);
      // 抖音短链（v.douyin.com）优先复制，复制后打开抖音 App 自动跳转；缺失则退而复制长链
      const eshort = x.share_url ? encodeURIComponent(x.share_url) : eweb;
      const tip = x.share_url ? '打开抖音自动跳转' : '打开抖音网页';
      const actions = `<a class="btn-web" href="${encodeURI(x.video_url)}" target="_blank" rel="noopener">🌐 网页版</a>`;
      const copyBtn = `<button class="btn-copy" onclick="copyLink('${eshort}','${tip}')">📋 复制抖音短链</button>`;
      return `<div class="card">${head}${titleHtml}${metaHtml}${wordsHtml}
        <div class="actions">${actions}${copyBtn}</div></div>`;
    }
    if (x.platform === 'channels') {
      // B 方案：视频号官方短链（weixin.qq.com/sph/...）需升级 API 套餐才能获取，
      // 免费套餐拿不到正确链接，故不再提供「复制视频号链接」按钮，改为引导用户微信搜一搜。
      const author = escapeHtml(x.author || '');
      return `<div class="card">${head}${titleHtml}${metaHtml}${wordsHtml}
        <div class="nolink">视频号官方短链暂不支持复制（需升级接口套餐）；可在微信「搜一搜」查看作者「${author}」</div></div>`;
    }
    if (x.video_url) {
      const eweb = encodeURIComponent(x.video_url);
      return `<div class="card">${head}${titleHtml}${metaHtml}${wordsHtml}
        <div class="actions">
          <button class="btn-copy" onclick="copyLink('${eweb}','粘贴打开')">📋 复制链接</button>
        </div></div>`;
    }
    return `<div class="card">${head}${titleHtml}${metaHtml}${wordsHtml}<div class="nolink">（暂无可复制链接，请在微信搜一搜查看「${escapeHtml(x.author || '')}」）</div></div>`;
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
