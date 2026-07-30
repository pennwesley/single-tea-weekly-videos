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
    const body = `
      <div class="title">${escapeHtml(x.title || '(无标题)')}</div>
      <div class="meta">
        <span>👤 ${escapeHtml(x.author || '未知账号')}</span>
        <span>👍 ${fmtCount(x.like_count)}</span>
        <span>🔁 ${fmtCount(x.share_count)}</span>
        <span>🕒 ${fmtTime(x.publish_time)}</span>
      </div>
      ${x.lead_words && x.lead_words.length ? `<div class="words">意向词：${x.lead_words.map(escapeHtml).join('、')}</div>` : ''}`;
    if (x.video_url) {
      return `<a class="card" href="${encodeURI(x.video_url)}" target="_blank" rel="noopener">${head}${body}</a>`;
    }
    return `<div class="card">${head}${body}<div class="nolink">（无链接：${escapeHtml(x.author || '')} · ${escapeHtml(x.title || '')}）</div></div>`;
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
