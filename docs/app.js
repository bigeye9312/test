// GitHub Pages serves /docs directly; Markdown remains the source of truth.
const yaml = window.jsyaml
const { marked, DOMPurify } = window
const playbookFiles = [
  'pcie-enumeration', 'nvme-initialization', 'command-processing',
  'pcie-error', 'performance', 'gc-state', 'fw-state'
]
async function load(path) {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`Cannot load ${path}: HTTP ${response.status}`)
  return response.text()
}
const sources = Object.fromEntries(await Promise.all(
  playbookFiles.map(async id => {
    const path = `playbooks/${id}.md`
    return [path, await load(path)]
  })
))
const productPaths = ['products/product-a/gc.md', 'products/product-b/gc.md']
const productSources = Object.fromEntries(await Promise.all(
  productPaths.map(async path => [path, await load(path)])
))
function parse(raw) {
  const front = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
  return front ? { meta: yaml.load(front[1]), body: raw.slice(front[0].length) } : { meta: {}, body: raw }
}
const playbooks = Object.fromEntries(Object.entries(sources).map(([path, text]) => {
  const doc = parse(text)
  return [doc.meta.id, { ...doc, path }]
}))
const products = Object.fromEntries(Object.entries(productSources).map(([path, text]) => [path, parse(text)]))
const categoryNames = {discovery:'인식 및 초기화',runtime:'명령 처리',error:'오류 증거',performance:'성능',internal:'펌웨어 내부'}
const typeNames = {check_when:'조건부 확인',related:'관련 분석',start_with:'우선 분석'}
const ids = Object.keys(playbooks)
let current = new URLSearchParams(location.search).get('node')
if (!playbooks[current]) current = 'pcie-enumeration'
let category = 'all', query = '', product = 'all'
const app = document.querySelector('#app')
const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const url = id => '?node=' + encodeURIComponent(id)
const renderer = new marked.Renderer()
renderer.link = ({ href, text }) => {
  if (/^(javascript:|data:)/i.test(href||'')) return esc(text)
  if (href?.startsWith('../products/')) return '<a href="#product=' + encodeURIComponent(href.slice(3)) + '">' + text + '</a>'
  return '<a href="' + esc(href || '#') + '">' + text + '</a>'
}
marked.setOptions({renderer})
const md = body => DOMPurify.sanitize(marked.parse(body))
function setNode(id) {
  if (!playbooks[id]) return
  current = id
  history.pushState({}, '', url(id))
  render()
  window.scrollTo({top:0,behavior:'smooth'})
}
function productHtml() {
  if(product==='all') return '<p class="muted">제품을 선택하면 해당 제품의 가상 GC 기준을 확인할 수 있어요.</p>'
  const doc = products['products/'+product+'/gc.md']
  return doc ? '<div class="product-document">'+md(doc.body)+'</div>' : '<p>문서가 없어요.</p>'
}
function render() {
  const doc = playbooks[current]
  const matches = ids.filter(id => {
    const item=playbooks[id].meta
    return (category==='all'||item.category===category) && (item.title+' '+item.description+' '+(item.tags||[]).join(' ')).toLowerCase().includes(query.toLowerCase())
  })
  const edges=(doc.meta.links||[]).filter(edge=>playbooks[edge.to])
  const inbound=ids.filter(id=>(playbooks[id].meta.links||[]).some(edge=>edge.to===current))
  app.innerHTML=`
  <header class="top"><div class="top-inner"><a class="logo" href="${url('pcie-enumeration')}" data-node="pcie-enumeration"><span class="logo-icon">◈</span> SSD <strong>Analysis Playbook</strong></a><span class="subtitle">Markdown 기반 분석 지도 · 데모</span><a class="github" href="https://github.com/bigeye9312/test" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div></header>
  <div class="layout">
    <aside class="sidebar">
      <div class="small-title">PLAYBOOK EXPLORER</div>
      <input id="search" type="search" placeholder="분석 관점 검색…" value="${esc(query)}" aria-label="분석 관점 검색">
      <div class="filter-row"><button data-category="all" class="${category==='all'?'selected':''}">전체</button>${Object.entries(categoryNames).map(([k,v])=>'<button data-category="'+k+'" class="'+(category===k?'selected':'')+'">'+v+'</button>').join('')}</div>
      <div class="small-title count">분석 관점 ${matches.length}개</div>
      <nav class="node-list">${matches.map(id=>{const n=playbooks[id].meta;return '<a data-node="'+id+'" href="'+url(id)+'" class="node-item '+(id===current?'active':'')+'"><strong>'+esc(n.title)+'</strong><span>'+esc(n.description)+'</span></a>'}).join('') || '<p class="muted">검색 결과가 없어요.</p>'}</nav>
    </aside>
    <main>
      <div class="eyebrow">ANALYSIS / ${esc(categoryNames[doc.meta.category]||'GENERAL')}</div>
      <div class="heading"><div><h1>${esc(doc.meta.title)}</h1><p>${esc(doc.meta.description)}</p></div><span class="category-badge">${esc(categoryNames[doc.meta.category]||'기타')}</span></div>
      <div class="tag-row">${(doc.meta.tags||[]).map(tag=>'<span>#'+esc(tag)+'</span>').join('')}<span class="doc-id">${esc(current)}</span></div>
      <section class="panel"><div class="panel-title"><h2>분석 가이드</h2><span>${esc(doc.path)}</span></div><article class="content">${md(doc.body)}</article></section>
      <section class="related"><div class="panel-title"><h2>다음에 검토할 관점</h2><span>현재 노드에서 1 Depth</span></div><div class="card-grid">${edges.map(edge=>'<a data-node="'+edge.to+'" href="'+url(edge.to)+'" class="edge-card"><span class="edge-type '+esc(edge.type)+'">'+esc(typeNames[edge.type]||edge.type)+'</span><h3>'+esc(playbooks[edge.to].meta.title)+'</h3><p>'+esc(edge.label||'')+'</p><span class="open">관점 보기 →</span></a>').join('') || '<p class="muted">연결된 분석 관점이 없어요.</p>'}</div></section>
      <section class="backlinks"><h2>이 문서를 참조하는 관점 <small>${inbound.length}</small></h2><div>${inbound.map(id=>'<a href="'+url(id)+'" data-node="'+id+'">'+esc(playbooks[id].meta.title)+' ↗</a>').join('')||'<span class="muted">없음</span>'}</div></section>
    </main>
    <aside class="context"><div class="small-title">CONTEXT</div><h3>제품별 참조</h3><p class="muted">공통 Playbook과 제품별 수치를 분리해 관리합니다.</p><label for="product">제품 선택</label><select id="product"><option value="all">선택하지 않음</option><option value="product-a" ${product==='product-a'?'selected':''}>Product A (가상)</option><option value="product-b" ${product==='product-b'?'selected':''}>Product B (가상)</option></select><div id="product-doc">${productHtml()}</div><hr><h3>관계 의미</h3><p><span class="edge-type check_when">조건부 확인</span> 관측에 따라 추가 분석</p><p><span class="edge-type related">관련 분석</span> 함께 참고하는 관점</p><p class="note">본 프로토타입의 내용과 기준은 모두 가상입니다.</p></aside>
  </div><footer>SSD Analysis Playbook · Static prototype · No proprietary data</footer>`
  app.querySelectorAll('[data-node]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();setNode(el.dataset.node)}))
  app.querySelectorAll('[data-category]').forEach(el=>el.addEventListener('click',()=>{category=el.dataset.category;render()}))
  app.querySelector('#search').addEventListener('input',e=>{query=e.target.value;const at=e.target.selectionStart;render();const input=app.querySelector('#search');input.focus();input.setSelectionRange(at,at)})
  app.querySelector('#product').addEventListener('change',e=>{product=e.target.value;app.querySelector('#product-doc').innerHTML=productHtml()})
  app.querySelectorAll('a[href^="#product="]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();const value=decodeURIComponent(el.hash.slice(9));const match=value.match(/product-(a|b)/);if(match){product=match[0];app.querySelector('#product').value=product;app.querySelector('#product-doc').innerHTML=productHtml();app.querySelector('.context').scrollIntoView({behavior:'smooth'})}}))
}
window.addEventListener('popstate',()=>{const id=new URLSearchParams(location.search).get('node');current=playbooks[id]?id:'pcie-enumeration';render()})
render()
