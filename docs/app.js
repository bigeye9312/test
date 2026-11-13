const { marked, DOMPurify } = window
const yaml = window.jsyaml
const root = document.querySelector('#app')
const esc = (value = '') => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))
const xssSafe = html => DOMPurify.sanitize(html)
const categoryNames = { discovery: 'Discovery', runtime: 'Runtime', error: 'Error', performance: 'Performance', internal: 'Internal' }
let docs = {}
let playbooks = []
let products = []
let selection = 'playbooks'
let expanded = new Set(['playbooks','products'])
const docUrl = (path) => '?doc=' + encodeURIComponent(path)
function parse(raw) {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/)
  return match ? { meta: yaml.load(match[1]) || {}, body: raw.slice(match[0].length) } : { meta: {}, body: raw }
}
async function load() {
  const manifestResponse = await fetch('./manifest.json')
  if (!manifestResponse.ok) throw new Error('manifest.json을 읽을 수 없습니다.')
  const manifest = await manifestResponse.json()
  playbooks = manifest.playbooks
  products = manifest.products
  const paths = [...playbooks, ...products]
  await Promise.all(paths.map(async path => {
    const response = await fetch('./' + path)
    if (!response.ok) throw new Error(path + ' 로딩 실패')
    docs[path] = { ...parse(await response.text()), path }
  }))
  const path = new URLSearchParams(location.search).get('doc')
  selection = path && docs[path] ? path : 'playbooks'
  render()
}
const label = (path) => docs[path]?.meta.title || path.split('/').pop().replace(/\.md$/,'')
function tree(paths, prefix) {
  const group = {}
  for (const path of paths) {
    const parts = path.slice(prefix.length).split('/')
    let ptr = group
    for (const part of parts.slice(0, -1)) ptr = ptr[part] ||= {}
    ptr[parts.at(-1)] = path
  }
  return group
}
function treeHtml(nodes, parent = '', depth = 0) {
  return Object.entries(nodes).sort(([a],[b])=>a.localeCompare(b)).map(([name, value]) => {
    if (typeof value === 'string') {
      const active = selection === value ? ' active' : ''
      return '<a class="tree-file'+active+'" style="--depth:'+depth+'" data-doc="'+esc(value)+'" href="'+docUrl(value)+'"><span class="tree-file-icon">⌑</span><span>'+esc(label(value))+'</span></a>'
    }
    const key = parent + name + '/'
    const isOpen = expanded.has(key)
    return '<div class="tree-folder"><button class="tree-folder-label" style="--depth:'+depth+'" data-folder="'+esc(key)+'" aria-expanded="'+isOpen+'"><span class="chevron">'+(isOpen?'⌄':'›')+'</span>'+esc(name)+'</button>'+(isOpen?'<div>'+treeHtml(value,key,depth+1)+'</div>':'')+'</div>'
  }).join('')
}
function select(next) {
  selection = next
  const nextUrl = next === 'playbooks' || next === 'products' ? location.pathname : docUrl(next)
  history.pushState({doc:next},'',nextUrl)
  render()
  window.scrollTo({top:0,behavior:'smooth'})
}
function svgGraph() {
  const byId = Object.fromEntries(playbooks.map(path=>[docs[path].meta.id,path]))
  const columns = [
    ['pcie-enumeration','pcie-error'],
    ['nvme-initialization','command-processing'],
    ['fw-state','performance','gc-state']
  ]
  const positions = {}
  const widths = [175,175,175]
  columns.forEach((col,colIndex)=>col.forEach((id,rowIndex)=>{
    const yy = col.length===2 ? [140,340][rowIndex] : [70,260,450][rowIndex]
    positions[id]={x:50+colIndex*255,y:yy}
  }))
  const edges = playbooks.flatMap(path => (docs[path].meta.links || []).filter(l => byId[l.to]).map(l => ({from:docs[path].meta.id,to:l.to,type:l.type})))
  const lines = edges.map(({from,to,type})=>{
    const a=positions[from],b=positions[to]
    if(!a||!b)return ''
    const forward=b.x>=a.x
    const sx=a.x+(forward?widths[0]:0), ex=b.x+(forward?0:widths[0])
    const sy=a.y+28, ey=b.y+28
    const cx=(sx+ex)/2
    const color = type==='check_when'?'#5f8bb4':'#b3bdca'
    const d='M'+sx+' '+sy+' C'+cx+' '+sy+','+cx+' '+ey+','+ex+' '+ey
    return '<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="1.5" '+(type==='related'?'stroke-dasharray="5 5"':'')+' opacity=".8" />'
  }).join('')
  const shapes = playbooks.map(path=>{
    const id=docs[path].meta.id, pos=positions[id]
    if(!pos)return ''
    const title=esc(label(path))
    const name=esc(categoryNames[docs[path].meta.category]||'Playbook')
    return '<g class="graph-node" data-doc="'+esc(path)+'" role="button" tabindex="0" aria-label="'+title+' 문서 열기"><rect x="'+pos.x+'" y="'+pos.y+'" width="175" height="57" rx="9"/><text x="'+(pos.x+12)+'" y="'+(pos.y+23)+'" class="graph-title">'+title+'</text><text x="'+(pos.x+12)+'" y="'+(pos.y+42)+'" class="graph-subtitle">'+name+'</text></g>'
  }).join('')
  return '<div class="graph-scroll"><svg viewBox="0 0 760 545" aria-label="Playbook 관계 그래프" role="img"><g>'+lines+'</g><g>'+shapes+'</g></svg></div>'
}
function contentHtml(doc) {
  const meta = doc.meta
  const tags = Array.isArray(meta.tags) ? meta.tags : []
  const aliases = Array.isArray(meta.aliases) ? meta.aliases : []
  const connections = (meta.links || []).map(link => {
    const target = playbooks.find(path => docs[path].meta.id===link.to)
    return target ? '<li><a href="'+docUrl(target)+'" data-doc="'+esc(target)+'">'+esc(label(target))+'</a><span class="connection-note">'+esc(link.label || (link.type === 'related' ? '관련 문서' : '조건부 검토'))+'</span></li>' : ''
  }).join('')
  const renderer = new marked.Renderer()
  renderer.link = ({href, text, title}) => {
    if (!href || /^(javascript:|data:|vbscript:)/i.test(href)) return esc(text)
    if (/^(https?:|mailto:|#)/i.test(href)) return '<a href="'+esc(href)+'">'+text+'</a>'
    const segments = doc.path.split('/').slice(0,-1)
    for (const part of href.split('/')) {
      if (part === '..') segments.pop()
      else if (part !== '.') segments.push(part)
    }
    const target = segments.join('/')
    if (docs[target]) return '<a data-doc="'+esc(target)+'" href="'+docUrl(target)+'">'+text+'</a>'
    return '<a href="'+esc(href)+'">'+text+'</a>'
  }
  const body = xssSafe(marked.parse(doc.body, {renderer}))
  return '<div class="bread">DOCS / '+esc(doc.path)+'</div>'+
    '<h1 class="page-title">'+esc(meta.title || label(doc.path))+'</h1>'+
    (meta.description?'<p class="description">'+esc(meta.description)+'</p>':'')+
    (tags.length?'<div class="tags">'+tags.map(tag=>'<span class="tag">#'+esc(tag)+'</span>').join('')+'</div>':'')+
    (aliases.length?'<p class="aliases">다른 이름: '+aliases.map(esc).join(', ')+'</p>':'')+
    '<article class="markdown">'+body+'</article>'+
    (connections?'<section class="connections"><h2>함께 볼 Playbook</h2><ul>'+connections+'</ul></section>':'')
}
function mainHtml(){
  if(selection==='playbooks')return '<div class="bread">DOCS / PLAYBOOKS</div><h1 class="page-title">Playbooks</h1><p class="description">분석 관점 사이의 연결을 탐색하세요. 노드를 선택하면 문서가 열립니다.</p><div class="graph-legend"><span><i class="line-solid"></i> 조건부 검토</span><span><i class="line-dashed"></i> 관련 문서</span></div><section class="graph-panel">'+svgGraph()+'</section><p class="hint">그래프는 Markdown Frontmatter의 <code>links</code> 관계를 표시합니다. 분석의 필수 순서를 의미하지는 않습니다.</p>'
  if(selection==='products') return '<div class="bread">DOCS / PRODUCTS</div><h1 class="page-title">Products</h1><p class="description">제품별 판단 기준과 차이를 문서로 관리합니다.</p><div class="product-cards">'+products.map(path=>'<a href="'+docUrl(path)+'" data-doc="'+esc(path)+'"><strong>'+esc(label(path))+'</strong><span>'+esc(path.replace(/^products\//,'').replace(/\/[^/]+$/,''))+'</span></a>').join('')+'</div>'
  return contentHtml(docs[selection])
}
function render() {
  root.innerHTML='<div class="shell"><aside class="sidebar"><a class="brand" href="'+location.pathname+'" data-doc="playbooks"><span class="brand-mark">◈</span> SSD Playbooks</a><div class="sidebar-caption">DOCUMENTATION</div>'+
  '<div class="section-header"><button data-section="playbooks" class="section-name'+(selection==='playbooks'?' selected':'')+'">Playbooks</button><button class="folder-toggle" data-top="playbooks" aria-label="Playbooks 펼치기">'+(expanded.has('playbooks')?'−':'+')+'</button></div>'+
  (expanded.has('playbooks')?'<nav class="tree">'+treeHtml(tree(playbooks,'playbooks/'))+'</nav>':'')+
  '<div class="section-header"><button data-section="products" class="section-name'+(selection==='products'?' selected':'')+'">Products</button><button class="folder-toggle" data-top="products" aria-label="Products 펼치기">'+(expanded.has('products')?'−':'+')+'</button></div>'+
  (expanded.has('products')?'<nav class="tree">'+treeHtml(tree(products,'products/'))+'</nav>':'')+
  '<div class="sidebar-bottom">가상 SSD 분석 데이터 · 데모</div></aside>'+
  '<main class="main"><div class="page-top"><span>Analysis Knowledge Base</span><a href="https://github.com/bigeye9312/test" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div><div class="page-content">'+mainHtml()+'</div></main></div>'
  root.querySelectorAll('[data-doc]').forEach(node => {
    node.addEventListener('click', e => {e.preventDefault();select(node.dataset.doc)})
    if(node.tagName.toLowerCase()==='g')node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(node.dataset.doc)}})
  })
  root.querySelectorAll('[data-section]').forEach(node=>node.addEventListener('click',()=>select(node.dataset.section)))
  root.querySelectorAll('[data-top]').forEach(node=>node.addEventListener('click',()=>{
    if(expanded.has(node.dataset.top))expanded.delete(node.dataset.top);else expanded.add(node.dataset.top)
    render()
  }))
  root.querySelectorAll('[data-folder]').forEach(node=>node.addEventListener('click',()=>{
    if(expanded.has(node.dataset.folder))expanded.delete(node.dataset.folder);else expanded.add(node.dataset.folder)
    render()
  }))
}
window.addEventListener('popstate',()=>{
  const path=new URLSearchParams(location.search).get('doc')
  selection=path&&docs[path]?path:'playbooks'
  render()
})
load().catch(error=>{root.textContent='문서를 불러오지 못했습니다: '+error.message;console.error(error)})
