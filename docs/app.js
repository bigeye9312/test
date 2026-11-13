const {marked, DOMPurify, jsyaml: yaml} = window
const $ = (sel, scope=document) => scope.querySelector(sel)
const root = $('#app')
const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const icons = {
  files:'▤', graph:'◇', search:'⌕', folder:'▸', file:'▧', collapse:'‹',
  settings:'⚙', back:'‹', forward:'›', reset:'⟲', external:'↗',
  more:'···', tag:'#', info:'ⓘ'
}
const categories = {
  discovery:{label:'Discovery',color:'#8f9ec9'},
  runtime:{label:'Runtime',color:'#bd9cce'},
  error:{label:'Error',color:'#d19a9a'},
  performance:{label:'Performance',color:'#c9b17f'},
  internal:{label:'Internal',color:'#86bca8'}
}
let documents={}, playbooks=[], products=[]
let selected='playbooks', expanded=new Set(['playbooks','products'])
let search='', mode='files', showProperties=true, graphFilter=''
let graphMode='global', graphCategory='discovery', graphFocus=null, graphDepth=1
let graphSettingsOpen=true
let graphOptions={orphans:true, nodeSize:7, linkThickness:1, repel:410, linkDistance:135, showLabels:true}

const docUrl = path => path==='playbooks'||path==='products'?'?view='+path:'?doc='+encodeURIComponent(path)
function parse(raw){
  const match=raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/)
  return match?{meta:yaml.load(match[1])||{},body:raw.slice(match[0].length)}:{meta:{},body:raw}
}
async function load(){
  const r=await fetch('./manifest.json'); if(!r.ok)throw Error('manifest.json을 읽을 수 없습니다')
  const manifest=await r.json()
  playbooks=manifest.playbooks; products=manifest.products
  await Promise.all([...playbooks,...products].map(async path=>{
    const res=await fetch('./'+path);if(!res.ok)throw Error(path+'를 읽을 수 없습니다')
    documents[path]={...parse(await res.text()),path}
  }))
  const params=new URLSearchParams(location.search)
  selected=documents[params.get('doc')]?params.get('doc'):(params.get('view')==='products'?'products':'playbooks')
  render()
}
function label(path){return documents[path]?.meta.title||path.split('/').pop().replace(/\.md$/,'')}
function tree(paths,prefix){
  const map={}
  for(const path of paths){
    const parts=path.slice(prefix.length).split('/')
    let node=map
    for(const part of parts.slice(0,-1))node=node[part]??={}
    node[parts.at(-1)]=path
  }
  return map
}
function treeHtml(entries,prefix='',depth=0){
  return Object.entries(entries).sort(([a],[b])=>a.localeCompare(b)).map(([name,value])=>{
    if(typeof value==='string'){
      if(search&&!((label(value)+' '+value+' '+(documents[value]?.meta.tags||[]).join(' ')).toLowerCase().includes(search.toLowerCase())))return ''
      return '<a class="tree-item'+(selected===value?' selected':'')+'" style="--level:'+depth+'" data-doc="'+esc(value)+'" href="'+docUrl(value)+'"><span class="tree-icon">▧</span><span class="tree-label">'+esc(label(value))+'</span></a>'
    }
    const id=prefix+name+'/'
    const open=search||expanded.has(id)
    const content=treeHtml(value,id,depth+1)
    if(search&&!content)return ''
    return '<div class="tree-group"><button type="button" class="tree-folder" style="--level:'+depth+'" data-folder="'+esc(id)+'"><span class="caret">'+(open?'⌄':'›')+'</span><span>'+esc(name)+'</span></button>'+(open?'<div>'+content+'</div>':'')+'</div>'
  }).join('')
}
function sidebarHtml(){
  const p=treeHtml(tree(playbooks,'playbooks/'))
  const q=treeHtml(tree(products,'products/'))
  return '<aside class="sidebar"><div class="sidebar-heading"><span>EXPLORER</span><span class="ghost">···</span></div>'+
    '<div class="vault-title"><span class="vault-symbol">◆</span> SSD Analysis <span class="vault-caret">⌄</span></div>'+
    '<div class="sidebar-search"><span>⌕</span><input id="sidebar-search" type="search" placeholder="Find files" aria-label="Find files" value="'+esc(search)+'"><span class="shortcut">⌕</span></div>'+
    '<nav class="file-tree"><div class="tree-section"><div class="section-row"><button data-section="playbooks" class="section-link'+(selected==='playbooks'?' selected':'')+'"><span>◇</span> Playbooks</button><button class="section-toggle" data-top="playbooks" aria-label="Playbooks 펼치기">'+(expanded.has('playbooks')?'⌄':'›')+'</button></div>'+(expanded.has('playbooks')?p:'')+'</div>'+
    '<div class="tree-section"><div class="section-row"><button data-section="products" class="section-link'+(selected==='products'?' selected':'')+'"><span>▤</span> Products</button><button class="section-toggle" data-top="products" aria-label="Products 펼치기">'+(expanded.has('products')?'⌄':'›')+'</button></div>'+(expanded.has('products')?q:'')+'</div></nav>'+
    '<div class="sidebar-foot"><span>●</span> Knowledge vault <span class="muted">· Demo</span></div></aside>'
}
function resolveLink(href,docPath){
  if(!href)return null
  if(/^(https?:|mailto:|#)/i.test(href))return null
  const segments=docPath.split('/').slice(0,-1)
  for(const part of href.split('/')){
    if(part==='..')segments.pop()
    else if(part!=='.')segments.push(part)
  }
  const candidate=segments.join('/')
  return documents[candidate]?candidate:null
}
function markdownHtml(doc){
  const renderer=new marked.Renderer()
  renderer.link=({href,text})=>{
    if(!href||/^(javascript:|data:|vbscript:)/i.test(href||''))return esc(text)
    const target=resolveLink(href,doc.path)
    if(target)return '<a href="'+docUrl(target)+'" data-doc="'+esc(target)+'">'+text+'</a>'
    return '<a href="'+esc(href)+'"'+(/^https?:/.test(href)?' target="_blank" rel="noopener noreferrer"':'')+'>'+text+'</a>'
  }
  return DOMPurify.sanitize(marked.parse(doc.body,{renderer}))
}
function propertyHtml(doc){
  const meta=doc.meta
  const tags=Array.isArray(meta.tags)?meta.tags:[]
  const aliases=Array.isArray(meta.aliases)?meta.aliases:[]
  return '<div class="properties'+(showProperties?'':' collapsed')+'"><button type="button" class="properties-toggle" data-properties><span class="caret">'+(showProperties?'⌄':'›')+'</span> Properties <span class="prop-count">'+(2+(tags.length>0)+(aliases.length>0))+'</span></button>'+
  (showProperties?'<div class="property-grid">'+
  '<div class="prop-key"><span class="prop-symbol">▧</span> title</div><div class="prop-value">'+esc(meta.title||label(doc.path))+'</div>'+
  '<div class="prop-key"><span class="prop-symbol">≡</span> category</div><div class="prop-value">'+esc(meta.category|| (doc.path.startsWith('products/')?'product':'—'))+'</div>'+
  (aliases.length?'<div class="prop-key"><span class="prop-symbol">≋</span> aliases</div><div class="prop-value">'+aliases.map(esc).join(', ')+'</div>':'')+
  (tags.length?'<div class="prop-key"><span class="prop-symbol">#</span> tags</div><div class="prop-value property-tags">'+tags.map(tag=>'<button class="tag-pill" data-tag="'+esc(tag)+'">#'+esc(tag)+'</button>').join('')+'</div>':'')+
  '</div>':'')+'</div>'
}
function graphHtml(){
  const current=playbooks.find(path=>documents[path].meta.id===graphFocus)
  const focusTitle=current?label(current):'Select a node'
  const categoryOptions=Object.entries(categories)
    .map(([id,value])=>'<option value="'+esc(id)+'"'+(graphCategory===id?' selected':'')+'>'+esc(value.label)+'</option>').join('')
  const checked=name=>graphOptions[name]?' checked':''
  const slider=(name,min,max,step,title)=>'<label class="settings-slider"><span>'+title+'</span><input type="range" data-graph-option="'+name+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+graphOptions[name]+'"></label>'
  const filters='<details open><summary>Filters</summary><div class="settings-group">'+
    '<label class="settings-search"><span>⌕</span><input id="graph-search" type="search" placeholder="Search files..." value="'+esc(graphFilter)+'" aria-label="Search files"></label>'+
    '<label class="settings-toggle"><span>Orphans</span><input type="checkbox" data-graph-option="orphans"'+checked('orphans')+'><i></i></label>'+
    '</div></details>'
  const groups='<details open><summary>Groups</summary><div class="settings-group"><div class="settings-caption">Color by category</div>'+
    Object.entries(categories).map(([key,val])=>'<div class="settings-group-row"><span>'+esc(val.label)+'</span><i class="settings-color" style="background:'+val.color+'"></i></div>').join('')+
    '</div></details>'
  const display='<details><summary>Display</summary><div class="settings-group">'+
    '<label class="settings-toggle"><span>Text labels</span><input type="checkbox" data-graph-option="showLabels"'+checked('showLabels')+'><i></i></label>'+
    slider('nodeSize',3,14,1,'Node size')+slider('linkThickness',0.4,3,0.2,'Link thickness')+
    '</div></details>'
  const forces='<details><summary>Forces</summary><div class="settings-group">'+
    slider('repel',120,900,20,'Repel force')+slider('linkDistance',70,260,10,'Link distance')+
    '</div></details>'
  return '<div class="graph-workspace"><section class="graph-shell" aria-label="Interactive Playbook Graph">'+
    '<div class="graph-head"><span class="graph-head-name">Graph view</span><div class="graph-head-actions">'+
    '<button class="graph-toolbar-button" data-settings-toggle aria-expanded="'+graphSettingsOpen+'" title="Graph settings" aria-label="Graph settings">☷</button>'+
    '<button class="graph-toolbar-button" data-graph-reset title="Reset view" aria-label="Reset view">⟲</button>'+
    '</div></div>'+
    '<div class="graph-canvas"></div>'+
    '<div class="graph-overlay"><div class="graph-modes" role="group" aria-label="Graph scope">'+
    ['global','category','local'].map(value=>'<button type="button" data-graph-mode="'+value+'" class="'+(graphMode===value?'active':'')+'" '+(value==='local'&&!graphFocus?'disabled title="Select a node first"':'')+'>'+value[0].toUpperCase()+value.slice(1)+'</button>').join('')+
    '</div><div class="graph-context-tools">'+
    (graphMode==='category'?'<label class="graph-control-label">Group <select id="graph-category">'+categoryOptions+'</select></label>':'')+
    (graphMode==='local'?'<button data-graph-back class="graph-back" type="button">‹ &nbsp; Global</button><span class="graph-center-label">'+esc(focusTitle)+'</span><label class="graph-control-label">Depth <select id="graph-depth"><option value="1"'+(graphDepth===1?' selected':'')+'>1</option><option value="2"'+(graphDepth===2?' selected':'')+'>2</option></select></label>':'')+
    '</div></div>'+
    '<aside class="graph-settings'+(graphSettingsOpen?' is-open':'')+'" aria-label="Graph settings">'+
    '<div class="settings-top"><strong>Graph settings</strong><button type="button" data-settings-close title="Close settings" aria-label="Close settings">×</button></div>'+
    filters+groups+display+forces+'</aside>'+
    '<div class="graph-canvas-controls"><button data-zoom-in title="Zoom in" aria-label="Zoom in">+</button><button data-zoom-out title="Zoom out" aria-label="Zoom out">−</button></div>'+
    '<div class="graph-bottom"><span class="graph-info">Select a node to explore locally</span><span class="graph-help">Click: local · Click again: document · Scroll: zoom</span></div>'+
    '</section></div>'
}
function productOverview(){
  return '<div class="article-wrap"><div class="eyebrow">DOCUMENTATION / PRODUCTS</div><h1 class="document-title">Products</h1><p class="doc-description">제품별 기준과 예외를 기록하는 문서입니다.</p><div class="product-list">'+products.map(path=>'<a data-doc="'+esc(path)+'" href="'+docUrl(path)+'"><span class="doc-icon">▧</span><span><strong>'+esc(label(path))+'</strong><small>'+esc(path)+'</small></span><span class="chevron">↗</span></a>').join('')+'</div></div>'
}
function articleHtml(doc){
  const meta=doc.meta
  const edges=(meta.links||[]).map(l=>{
    const dest=playbooks.find(path=>documents[path].meta.id===l.to)
    return dest?'<a class="backlink" data-doc="'+esc(dest)+'" href="'+docUrl(dest)+'"><span>↗</span><span><strong>'+esc(label(dest))+'</strong><small>'+esc(l.label||l.type||'관련 문서')+'</small></span></a>':''
  }).join('')
  return '<div class="article-wrap"><div class="eyebrow">'+esc(doc.path)+'</div><h1 class="document-title">'+esc(meta.title||label(doc.path))+'</h1>'+(meta.description?'<p class="doc-description">'+esc(meta.description)+'</p>':'')+
  propertyHtml(doc)+'<article class="markdown">'+markdownHtml(doc)+'</article>'+
  (edges?'<section class="references"><div class="references-heading">Linked mentions <span>'+((meta.links||[]).length)+'</span></div>'+edges+'</section>':'')+'</div>'
}
function mainHtml(){
  return selected==='playbooks'?graphHtml():selected==='products'?productOverview():articleHtml(documents[selected])
}
function select(path){
  if(path==='playbooks'){graphMode='global';graphFocus=null}
  if(path!=='playbooks'&&path!=='products'&&!documents[path])return
  selected=path
  history.pushState({},'',docUrl(path))
  render()
  window.scrollTo({top:0,behavior:'instant'})
}
function render(){
  window.disposePlaybookGraph?.()
  root.innerHTML='<div class="workbench"><div class="ribbon"><div class="ribbon-app" title="SSD Analysis">◆</div><button class="ribbon-btn'+(mode==='files'?' active':'')+'" title="파일 탐색기" data-mode="files">▤</button><button class="ribbon-btn" title="그래프 열기" data-section="playbooks">◇</button><div class="ribbon-spacer"></div><a class="ribbon-btn" title="GitHub 저장소" href="https://github.com/bigeye9312/test" target="_blank" rel="noopener noreferrer">↗</a></div>'+
  sidebarHtml()+
  '<div class="editor"><div class="tab-bar"><div class="tab active"><span class="tab-icon">'+(selected==='playbooks'?'◇':'▧')+'</span><span>'+esc(selected==='playbooks'?'Graph view':selected==='products'?'Products':label(selected))+'</span><span class="tab-close">×</span></div><button class="tab-plus" title="Playbooks 그래프" data-section="playbooks">＋</button></div>'+
  '<div class="editor-toolbar"><div class="toolbar-path">SSD Analysis &nbsp; / &nbsp; '+esc(selected==='playbooks'?'Playbooks':selected==='products'?'Products':selected)+'</div><div class="toolbar-actions"><button class="toolbar-icon" title="Playbooks 그래프" data-section="playbooks">◇</button><a class="toolbar-icon" title="GitHub" href="https://github.com/bigeye9312/test" target="_blank" rel="noopener noreferrer">···</a></div></div>'+
  '<main class="editor-content'+(selected==='playbooks'?' is-graph':'')+'">'+mainHtml()+'</main><div class="status-bar"><span>SSD Analysis Knowledge Base</span><span>Markdown &nbsp; · &nbsp; '+(selected==='playbooks'?'Graph · '+graphMode[0].toUpperCase()+graphMode.slice(1):selected==='products'?'Index':'Reading view')+'</span></div></div></div>'
  root.querySelectorAll('[data-doc]').forEach(node=>node.addEventListener('click',e=>{e.preventDefault();select(node.dataset.doc)}))
  root.querySelectorAll('[data-section]').forEach(node=>node.addEventListener('click',()=>select(node.dataset.section)))
  root.querySelectorAll('[data-top]').forEach(node=>node.addEventListener('click',()=>{
    expanded.has(node.dataset.top)?expanded.delete(node.dataset.top):expanded.add(node.dataset.top);render()
  }))
  root.querySelectorAll('[data-folder]').forEach(node=>node.addEventListener('click',()=>{
    expanded.has(node.dataset.folder)?expanded.delete(node.dataset.folder):expanded.add(node.dataset.folder);render()
  }))
  $('#sidebar-search')?.addEventListener('input',e=>{
    const value=e.target.value;search=value
    render()
    const input=$('#sidebar-search');input?.focus();input?.setSelectionRange(value.length,value.length)
  })
  root.querySelectorAll('[data-properties]').forEach(node=>node.addEventListener('click',()=>{showProperties=!showProperties;render()}))
  root.querySelectorAll('[data-tag]').forEach(node=>node.addEventListener('click',()=>{search=node.dataset.tag;render();$('#sidebar-search')?.focus()}))
  if(selected==='playbooks'){
    const navigateFocus=id=>{
      graphFocus=id
      graphMode='local'
      render()
    }
    window.mountPlaybookGraph?.($('.graph-shell'),playbooks,documents,{
      mode:graphMode,category:graphCategory,focus:graphFocus,depth:graphDepth,filter:graphFilter,
      ...graphOptions,
      selectNode:navigateFocus,openDocument:select
    })
    root.querySelectorAll('[data-graph-mode]').forEach(button=>button.addEventListener('click',()=>{
      if(button.dataset.graphMode==='local'&&!graphFocus)return
      graphMode=button.dataset.graphMode
      render()
    }))
    $('[data-graph-back]')?.addEventListener('click',()=>{graphMode='global';graphFocus=null;render()})
    $('[data-settings-toggle]')?.addEventListener('click',()=>{graphSettingsOpen=!graphSettingsOpen;$('.graph-settings')?.classList.toggle('is-open',graphSettingsOpen);$('[data-settings-toggle]')?.setAttribute('aria-expanded',String(graphSettingsOpen))})
    $('[data-settings-close]')?.addEventListener('click',()=>{graphSettingsOpen=false;$('.graph-settings')?.classList.remove('is-open');$('[data-settings-toggle]')?.setAttribute('aria-expanded','false')})
    root.querySelectorAll('[data-graph-option]').forEach(control=>control.addEventListener('change',()=>{
      const name=control.dataset.graphOption
      graphOptions[name]=control.type==='checkbox'?control.checked:Number(control.value)
      render()
    }))
    $('#graph-category')?.addEventListener('change',e=>{graphCategory=e.target.value;render()})
    $('#graph-depth')?.addEventListener('change',e=>{graphDepth=Number(e.target.value);render()})
    $('#graph-search')?.addEventListener('change',e=>{graphFilter=e.target.value;render()})
    $('#graph-search')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();graphFilter=e.target.value;render()}})
  }
}
window.addEventListener('popstate',()=>{
  const p=new URLSearchParams(location.search)
  selected=documents[p.get('doc')]?p.get('doc'):(p.get('view')==='products'?'products':'playbooks')
  render()
})
load().catch(error=>{root.innerHTML='<p class="loading-error">문서를 불러오지 못했습니다: '+esc(error.message)+'</p>';console.error(error)})
