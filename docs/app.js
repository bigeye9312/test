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

const pathSlug = path => path.replace(/\.md$/, '')
function findWikiPath(raw,currentPath){
  const name=String(raw).split('#')[0].trim().replace(/\.md$/,'')
  if(!name)return null
  const paths=Object.keys(documents)
  const exact=paths.find(path=>pathSlug(path)===name)
  if(exact)return exact
  const dir=currentPath.split('/').slice(0,-1).join('/')
  const relative=paths.find(path=>pathSlug(path)===dir+'/'+name)
  if(relative)return relative
  const candidates=paths.filter(path=>pathSlug(path).split('/').pop()===name)
  return candidates.length===1?candidates[0]:null
}
const wikiTargets = body => [...body.matchAll(/\[\[([^\]]+)\]\]/g)].map(match=>match[1].split('|')[0])

let selected='playbooks', expanded=new Set(['playbooks','products'])
let search='', showProperties=true, graphFilter=''
let graphMode='global', graphFocus=null, graphDepth=1
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
  if(params.get('heading'))document.getElementById(window.noteMarkdown.slug(params.get('heading')))?.scrollIntoView({block:'start'})
}
function label(path){return documents[path]?.body.match(/^#\s+(.+)$/m)?.[1]?.trim()||path.split('/').pop().replace(/\.md$/,'')}
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
 const p=treeHtml(tree(playbooks,'playbooks/')),q=treeHtml(tree(products,'products/'))
 return '<aside class="sidebar"><a class="brand" data-section="playbooks" href="'+docUrl('playbooks')+'"><span class="brand-mark">◇</span> SSD Analysis</a><div class="sidebar-caption">DOCUMENTATION</div>'+
 '<div class="sidebar-search"><span>⌕</span><input id="sidebar-search" type="search" placeholder="Search files" aria-label="Search files" value="'+esc(search)+'"></div>'+
 '<nav class="file-tree"><div class="tree-section"><div class="section-row"><button data-section="playbooks" class="section-link'+(selected==='playbooks'?' selected':'')+'">Playbooks</button><button class="section-toggle" data-top="playbooks" aria-label="Toggle Playbooks">'+(expanded.has('playbooks')?'⌄':'›')+'</button></div>'+(expanded.has('playbooks')?p:'')+'</div>'+
 '<div class="tree-section"><div class="section-row"><button data-section="products" class="section-link'+(selected==='products'?' selected':'')+'">Products</button><button class="section-toggle" data-top="products" aria-label="Toggle Products">'+(expanded.has('products')?'⌄':'›')+'</button></div>'+(expanded.has('products')?q:'')+'</div></nav></aside>'
}
function resolveLink(href,docPath){
  if(!href)return null
  if(documents[href])return href
  if(/^(https?:|mailto:|#)/i.test(href))return null
  const segments=docPath.split('/').slice(0,-1)
  for(const part of href.split('/')){
    if(part==='..')segments.pop()
    else if(part!=='.')segments.push(part)
  }
  const candidate=segments.join('/')
  return documents[candidate]?candidate:null
}
function markdownHtml(doc){return window.noteMarkdown.render(doc,documents,docUrl,label)}
function propertyHtml(doc){
 const tags=Array.isArray(doc.meta.tags)?doc.meta.tags:[]
 const aliases=Array.isArray(doc.meta.aliases)?doc.meta.aliases:[]
 if(!tags.length&&!aliases.length)return ''
 return '<div class="properties'+(showProperties?'':' collapsed')+'"><button class="properties-toggle" data-properties><span class="caret">'+(showProperties?'⌄':'›')+'</span> Properties</button>'+
 (showProperties?'<div class="property-grid">'+
 (aliases.length?'<div class="prop-key">aliases</div><div class="prop-value">'+aliases.map(esc).join(', ')+'</div>':'')+
 (tags.length?'<div class="prop-key">tags</div><div class="prop-value property-tags">'+tags.map(tag=>'<button class="tag-pill" data-tag="'+esc(tag)+'">#'+esc(tag)+'</button>').join('')+'</div>':'')+
 '</div>':'')+'</div>'
}
function graphHtml(){
  const current=playbooks.find(path=>pathSlug(path)===graphFocus)
  const focusTitle=current?label(current):'Select a node'
  const checked=name=>graphOptions[name]?' checked':''
  const slider=(name,min,max,step,title)=>'<label class="settings-slider"><span>'+title+'</span><input type="range" data-graph-option="'+name+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+graphOptions[name]+'"></label>'
  const filters='<details open><summary>Filters</summary><div class="settings-group">'+
    '<label class="settings-search"><span>⌕</span><input id="graph-search" type="search" placeholder="Search" value="'+esc(graphFilter)+'" aria-label="Search files"></label>'+
    '<label class="settings-toggle"><span>Orphans</span><input type="checkbox" data-graph-option="orphans"'+checked('orphans')+'><i></i></label>'+
    '</div></details>'
  const groups='<details><summary>Groups</summary><div class="settings-group"><div class="settings-caption">Color by tags</div>'+
    Object.entries(categories).map(([key,val])=>'<div class="settings-group-row"><span>#area/'+esc(key)+'</span><i class="settings-color" style="background:'+val.color+'"></i></div>').join('')+
    '</div></details>'
  const display='<details><summary>Display</summary><div class="settings-group">'+
    '<label class="settings-toggle"><span>Text labels</span><input type="checkbox" data-graph-option="showLabels"'+checked('showLabels')+'><i></i></label>'+
    slider('nodeSize',3,14,1,'Node size')+slider('linkThickness',0.4,3,0.2,'Link thickness')+
    '</div></details>'
  const forces='<details><summary>Forces</summary><div class="settings-group">'+
    slider('repel',120,900,20,'Repel force')+slider('linkDistance',70,260,10,'Link distance')+
    '</div></details>'
  return '<div class="graph-workspace">'+breadcrumb('playbooks')+'<section class="graph-shell" aria-label="Interactive Playbook Graph">'+
    '<div class="graph-floating-tools">'+
    '<button class="graph-toolbar-button" data-settings-toggle aria-expanded="'+graphSettingsOpen+'" title="Settings" aria-label="Settings">☷</button>'+
    '<button class="graph-toolbar-button" data-graph-reset title="Reset view" aria-label="Reset view">⟲</button>'+
    '</div>'+
    '<div class="graph-canvas"></div>'+
    (graphMode==='local'?'<div class="graph-overlay"><div class="graph-context-tools"><button data-graph-back class="graph-back" type="button">‹ &nbsp; Global graph</button><span class="graph-center-label">'+esc(focusTitle)+'</span><label class="graph-control-label">Depth <select id="graph-depth"><option value="1"'+(graphDepth===1?' selected':'')+'>1</option><option value="2"'+(graphDepth===2?' selected':'')+'>2</option></select></label></div></div>':'')+
    '<aside class="graph-settings'+(graphSettingsOpen?' is-open':'')+'" aria-label="Settings">'+
    '<div class="settings-top"><strong>Settings</strong><button type="button" data-settings-close title="Close settings" aria-label="Close settings">×</button></div>'+
    filters+groups+display+forces+'</aside>'+
    '<div class="graph-canvas-controls"><button data-zoom-in title="Zoom in" aria-label="Zoom in">+</button><button data-zoom-out title="Zoom out" aria-label="Zoom out">−</button><span class="graph-node-count" aria-live="polite">0 nodes</span></div>'+
    
    '</section></div>'
}
function breadcrumb(path){
  const parts=path.split('/')
  const rootPath=parts[0]==='products'?'products':'playbooks'
  const links=parts.map((part,i)=>{
    if(i===0)return '<a data-section="'+rootPath+'" href="'+docUrl(rootPath)+'">'+esc(part)+'</a>'
    if(i===parts.length-1)return '<span aria-current="page">'+esc(part)+'</span>'
    return '<span>'+esc(part)+'</span>'
  })
  return '<nav class="breadcrumbs" aria-label="Breadcrumb">'+links.join('<span class="breadcrumb-divider">/</span>')+'</nav>'
}
function productOverview(){
  return '<div class="article-wrap">'+breadcrumb('products')+'<h1 class="document-title">Products</h1><p class="doc-description">제품별 기준과 예외를 기록하는 문서입니다.</p><div class="product-list">'+products.map(path=>'<a data-doc="'+esc(path)+'" href="'+docUrl(path)+'"><span class="doc-icon">▧</span><span><strong>'+esc(label(path))+'</strong><small>'+esc(path)+'</small></span><span class="chevron">↗</span></a>').join('')+'</div></div>'
}
function articleHtml(doc){
 const incoming=Object.values(documents).filter(source=>{
   if(source.path===doc.path)return false
   const wiki=window.noteMarkdown.refs(source.body).some(ref=>window.noteMarkdown.resolve(ref,source.path,documents)?.path===doc.path)
   const standard=[...source.body.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)].some(match=>resolveLink(match[1],source.path)===doc.path)
   return wiki||standard
 })
 const links=incoming.map(source=>'<a class="backlink" data-doc="'+esc(source.path)+'" href="'+docUrl(source.path)+'"><span>↗</span><span><strong>'+esc(label(source.path))+'</strong><small>'+esc(source.path)+'</small></span></a>').join('')
 return '<div class="article-wrap">'+breadcrumb(doc.path)+'<h1 class="document-title">'+esc(label(doc.path))+'</h1>'+
 propertyHtml(doc)+'<article class="markdown">'+markdownHtml(doc)+'</article>'+
 '<section class="references"><div class="references-heading">Backlinks <span>'+incoming.length+'</span></div>'+
 (links||'<p class="empty-backlinks">No backlinks</p>')+'</section></div>'
}
function mainHtml(){
  return selected==='playbooks'?graphHtml():selected==='products'?productOverview():articleHtml(documents[selected])
}
function select(path,heading=''){
  if(path==='playbooks'){graphMode='global';graphFocus=null}
  if(path!=='playbooks'&&path!=='products'&&!documents[path])return
  selected=path
  history.pushState({},'',docUrl(path)+(heading?'&heading='+encodeURIComponent(heading):''))
  render()
  const target=heading?document.getElementById(window.noteMarkdown.slug(heading)):null
  if(target)target.scrollIntoView({block:'start'})
  else $('.page-content')?.scrollTo({top:0})
}
function render(){
  window.disposePlaybookGraph?.()
  root.innerHTML='<div class="shell">'+sidebarHtml()+'<main class="main"><div class="page-content'+(selected==='playbooks'?' is-graph':'')+'">'+mainHtml()+'</div></main></div>'
  root.querySelectorAll('[data-doc]').forEach(node=>node.addEventListener('click',e=>{e.preventDefault();select(node.dataset.doc,node.dataset.heading||'')}))
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
      mode:graphMode,focus:graphFocus,depth:graphDepth,filter:graphFilter,
      ...graphOptions,
      selectNode:navigateFocus,openDocument:select
    })
    $('[data-graph-back]')?.addEventListener('click',()=>{graphMode='global';graphFocus=null;render()})
    $('[data-settings-toggle]')?.addEventListener('click',()=>{graphSettingsOpen=!graphSettingsOpen;$('.graph-settings')?.classList.toggle('is-open',graphSettingsOpen);$('[data-settings-toggle]')?.setAttribute('aria-expanded',String(graphSettingsOpen))})
    $('[data-settings-close]')?.addEventListener('click',()=>{graphSettingsOpen=false;$('.graph-settings')?.classList.remove('is-open');$('[data-settings-toggle]')?.setAttribute('aria-expanded','false')})
    root.querySelectorAll('[data-graph-option]').forEach(control=>control.addEventListener('change',()=>{
      const name=control.dataset.graphOption
      graphOptions[name]=control.type==='checkbox'?control.checked:Number(control.value)
      render()
    }))
    $('#graph-depth')?.addEventListener('change',e=>{graphDepth=Number(e.target.value);render()})
    $('#graph-search')?.addEventListener('change',e=>{graphFilter=e.target.value;render()})
    $('#graph-search')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();graphFilter=e.target.value;render()}})
  }
}
window.addEventListener('popstate',()=>{
  const p=new URLSearchParams(location.search)
  selected=documents[p.get('doc')]?p.get('doc'):(p.get('view')==='products'?'products':'playbooks')
  render()
  const h=p.get('heading')
  if(h)document.getElementById(window.noteMarkdown.slug(h))?.scrollIntoView({block:'start'})
})
load().catch(error=>{root.innerHTML='<p class="loading-error">문서를 불러오지 못했습니다: '+esc(error.message)+'</p>';console.error(error)})
