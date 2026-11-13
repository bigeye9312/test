const {jsyaml: yaml} = window
const $ = (sel, scope=document) => scope.querySelector(sel)
const root = $('#app')
const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const categories = {
  discovery:{label:'Discovery',color:'#8f9ec9'},
  runtime:{label:'Runtime',color:'#bd9cce'},
  error:{label:'Error',color:'#d19a9a'},
  performance:{label:'Performance',color:'#c9b17f'},
  internal:{label:'Internal',color:'#86bca8'}
}
let documents={}, playbooks=[], products=[], folders={}
let sidebarOrder=['playbooks','products']

const pathSlug = path => path.replace(/\.md$/, '')

let selected='playbooks', expanded=new Set(['playbooks','products'])
let search='', graphFilter=''
let sidebarCollapsed=false
let graphMode='global', graphFocus=null
let graphSettingsOpen=true
const defaultGraphOptions={orphans:true, nodeSize:7, linkThickness:1, repel:410, linkDistance:135, showLabels:true}
let graphOptions={...defaultGraphOptions}

const docUrl = path => path==='playbooks'||path==='products'?'?view='+path:folders[path]?'?folder='+encodeURIComponent(path):'?doc='+encodeURIComponent(path)
function parse(raw){
  const match=raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/)
  return match?{meta:yaml.load(match[1])||{},body:raw.slice(match[0].length)}:{meta:{},body:raw}
}
async function load(){
  const r=await fetch('./manifest.json'); if(!r.ok)throw Error('manifest.json을 읽을 수 없습니다')
  const manifest=await r.json()
  playbooks=manifest.playbooks; products=manifest.products; folders=manifest.folders||{}
  if(Array.isArray(manifest.sidebarOrder))sidebarOrder=[...new Set([...manifest.sidebarOrder.filter(key=>key==='playbooks'||key==='products'),'playbooks','products'])]
  await Promise.all([...new Set([...playbooks,...products,...Object.values(folders)])].map(async path=>{
    const res=await fetch('./'+path);if(!res.ok)throw Error(path+'를 읽을 수 없습니다')
    documents[path]={...parse(await res.text()),path}
  }))
  const params=new URLSearchParams(location.search)
  selected=documents[params.get('doc')]?params.get('doc'):(folders[params.get('folder')]?params.get('folder'):params.get('view')==='products'?'products':'playbooks')
  render()
  if(params.get('heading'))document.getElementById(window.noteMarkdown.slug(params.get('heading')))?.scrollIntoView({block:'start'})
}
function label(path){return documents[folders[path]||path]?.body.match(/^#\s+(.+)$/m)?.[1]?.trim()||path.split('/').pop().replace(/\.md$/,'')}
const sidebarFolderLabel = path => label(path).replace(/[-_]+/g,' ').replace(/\b[a-z]/g,letter=>letter.toUpperCase())
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
      return '<a class="tree-item'+(selected===value?' selected':'')+'" style="--level:'+depth+'" data-doc="'+esc(value)+'" href="'+docUrl(value)+'"><span class="tree-icon tree-leaf-dot" aria-hidden="true"></span><span class="tree-label">'+esc(label(value))+'</span></a>'
    }
    const id=prefix+name+'/'
    const folderId=id.slice(0,-1)
    const open=search||expanded.has(id)
    const content=treeHtml(value,id,depth+1)
    if(search&&!content)return ''
    return '<div class="tree-group"><div class="tree-folder-row" style="--level:'+depth+'"><button type="button" class="tree-folder-expand" data-folder="'+esc(id)+'" aria-label="Expand or collapse '+esc(name)+'">'+(open?'⌄':'›')+'</button><a class="tree-folder-link'+(selected===folderId?' selected':'')+'" data-section="'+esc(folderId)+'" href="'+docUrl(folderId)+'">'+esc(sidebarFolderLabel(folderId))+'</a></div>'+(open?'<div>'+content+'</div>':'')+'</div>'
  }).join('')
}
function sidebarHtml(){
 const sections={
  playbooks:{paths:playbooks,label:'Playbook'},
  products:{paths:products,label:'Device Info'}
 }
 const nav=sidebarOrder.map(key=>{
  const section=sections[key]
  const content=expanded.has(key)?treeHtml(tree(section.paths,key+'/'),key+'/'):''
  return '<div class="tree-section"><div class="section-row"><button data-section="'+key+'" class="section-link'+(selected===key?' selected':'')+'">'+esc(sidebarFolderLabel(key))+'</button><button class="section-toggle" data-top="'+key+'" aria-label="Toggle '+section.label+'">'+(expanded.has(key)?'⌄':'›')+'</button></div>'+content+'</div>'
 }).join('')
 return '<aside class="sidebar" id="wiki-sidebar">'+sidebarToggleHtml()+'<a class="brand" data-section="playbooks" href="'+docUrl('playbooks')+'"><span class="brand-mark" role="img" aria-label="Magnifying glass">🔍</span> CIA</a>'+
 '<div class="sidebar-search"><span aria-hidden="true">🔍</span><input id="sidebar-search" type="search" placeholder="Search" aria-label="Search files" value="'+esc(search)+'"></div>'+
 '<nav class="file-tree">'+nav+'</nav></aside>'
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
function incomingLinks(doc){
 return Object.values(documents).filter(source=>{
   if(source.path===doc.path)return false
   const wiki=window.noteMarkdown.refs(source.body).some(ref=>window.noteMarkdown.resolve(ref,source.path,documents)?.path===doc.path)
   const standard=[...source.body.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)].some(match=>resolveLink(match[1],source.path)===doc.path)
   return wiki||standard
 })
}
function pageMetadata(doc){
 const tags=Array.isArray(doc?.meta?.tags)?doc.meta.tags:[]
 const incoming=incomingLinks(doc)
 if(!tags.length&&!incoming.length)return ''
 const backlinks=incoming.map(source=>'<a class="meta-backlink" data-doc="'+esc(source.path)+'" href="'+docUrl(source.path)+'" title="'+esc(source.path)+'"><span class="meta-backlink-arrow" aria-hidden="true">↗</span>'+esc(label(source.path))+'</a>').join('')
 const tagLinks=tags.map(tag=>'<button type="button" class="meta-tag" data-tag="'+esc(tag)+'">#'+esc(tag)+'</button>').join('')
 return '<footer class="page-metadata" aria-label="Page metadata">'+
   (incoming.length?'<div class="metadata-row"><span class="metadata-icon" title="Backlinks" aria-label="Backlinks"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span><div class="metadata-items">'+backlinks+'</div></div>':'')+
   (tags.length?'<div class="metadata-row"><span class="metadata-icon" title="Tags" aria-label="Tags"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 12 22l-10-10V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7" cy="7" r="1"/></svg></span><div class="metadata-items metadata-tags">'+tagLinks+'</div></div>':'')+
   '</footer>'
}
function graphHtml(){
  const checked=name=>graphOptions[name]?' checked':''
  const slider=(name,min,max,step,title)=>'<label class="settings-slider"><span>'+title+'</span><input type="range" data-graph-option="'+name+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+graphOptions[name]+'"></label>'
  const filters='<details open><summary>Filters</summary><div class="settings-group">'+
    '<label class="settings-search"><span aria-hidden="true">🔍</span><input id="graph-search" type="search" placeholder="Search" value="'+esc(graphFilter)+'" aria-label="Search files"></label>'+
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
  return '<div class="graph-workspace">'+breadcrumb('playbooks')+'<h1 class="graph-page-title">'+esc(label('playbooks'))+'</h1><section class="graph-shell" aria-label="Interactive Playbook Graph">'+
    '<div class="graph-head"><div class="graph-head-actions">'+
    '<button class="graph-toolbar-button" data-settings-toggle aria-expanded="'+graphSettingsOpen+'" title="Settings" aria-label="Settings">☷</button>'+
    '</div></div>'+
    '<div class="graph-canvas"></div>'+
    '<aside class="graph-settings'+(graphSettingsOpen?' is-open':'')+'" aria-label="Settings">'+
    '<div class="settings-top"><strong>Settings</strong><button type="button" data-settings-close title="Close settings" aria-label="Close settings">×</button></div>'+
    filters+groups+display+forces+'</aside>'+
    '<div class="graph-canvas-controls"><button data-zoom-in title="Zoom in" aria-label="Zoom in">+</button><button data-zoom-out title="Zoom out" aria-label="Zoom out">−</button><button data-graph-reset title="Reset view" aria-label="Reset view">⟲</button><span class="graph-node-count" aria-live="polite">0 nodes</span></div>'+
    
    '</section>'+pageMetadata(documents[folders.playbooks])+'</div>'
}
function breadcrumb(path){
 const parts=path.split('/')
 return '<nav class="breadcrumbs" aria-label="Breadcrumb">'+parts.map((part,i)=>{
   const target=parts.slice(0,i+1).join('/')
   const current=i===parts.length-1
   const file=current&&path.endsWith('.md')
   const valid=file?!!documents[target]:!!folders[target]
   const display=i===0?(part==='playbooks'?'playbook':part==='products'?'device-info':part):part
   if(!valid)return '<span>'+esc(display)+'</span>'
   return '<a '+(file?'data-doc':'data-section')+'="'+esc(target)+'" href="'+docUrl(target)+'"'+(current?' aria-current="page" class="breadcrumb-current"':'')+'>'+esc(display)+'</a>'
 }).join('<span class="breadcrumb-divider">/</span>')+'</nav>'
}
function folderHtml(folder){
 const doc=documents[folders[folder]]
 if(!doc)return ''
 if(folder==='playbooks')return graphHtml()
 const subfolders=Object.keys(folders).filter(path=>path.startsWith(folder+'/')&&!path.slice(folder.length+1).includes('/'))
 const files=[...playbooks,...products].filter(path=>path.startsWith(folder+'/')&&!path.slice(folder.length+1).includes('/'))
 const children=[...subfolders.map(path=>({path,folder:true})),...files.map(path=>({path,folder:false}))]
 return '<div class="article-wrap">'+breadcrumb(folder)+'<h1 class="document-title">'+esc(label(folder))+'</h1>'+
 '<div class="markdown">'+markdownHtml(doc)+'</div>'+
 (children.length?'<div class="folder-children">'+children.map(item=>'<a href="'+docUrl(item.path)+'" '+(item.folder?'data-section':'data-doc')+'="'+esc(item.path)+'"><span class="folder-child-icon">'+(item.folder?'▤':'▧')+'</span><strong>'+esc(label(item.path))+'</strong><span class="folder-child-arrow">›</span></a>').join('')+'</div>':'')+pageMetadata(doc)+'</div>'
}
function articleHtml(doc){

 return '<div class="article-wrap">'+breadcrumb(doc.path)+'<h1 class="document-title">'+esc(label(doc.path))+'</h1>'+
 '<article class="markdown">'+markdownHtml(doc)+'</article>'+pageMetadata(doc)+'</div>'
}
function mainHtml(){
  return folders[selected]?folderHtml(selected):articleHtml(documents[selected])
}
function select(path,heading=''){
  if(path==='playbooks'){graphMode='global';graphFocus=null}
  if(!folders[path]&&!documents[path])return
  selected=path
  history.pushState({},'',docUrl(path)+(heading?'&heading='+encodeURIComponent(heading):''))
  render()
  const target=heading?document.getElementById(window.noteMarkdown.slug(heading)):null
  if(target)target.scrollIntoView({block:'start'})
  else $('.page-content')?.scrollTo({top:0})
}
function sidebarToggleHtml(){
  return '<button type="button" class="sidebar-visibility-toggle" data-sidebar-visibility aria-controls="wiki-sidebar" aria-expanded="'+(!sidebarCollapsed)+'" aria-label="'+(sidebarCollapsed?'Expand sidebar':'Collapse sidebar')+'" title="'+(sidebarCollapsed?'Expand sidebar':'Collapse sidebar')+'"><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>'+(sidebarCollapsed?'<path d="m13 9 3 3-3 3"/>':'<path d="m16 9-3 3 3 3"/>')+'</svg></button>'
}
function render(){
  window.disposePlaybookGraph?.()
  root.innerHTML='<div class="shell'+(sidebarCollapsed?' sidebar-collapsed':'')+'">'+(sidebarCollapsed?sidebarToggleHtml():sidebarHtml())+'<main class="main"><div class="page-content'+(selected==='playbooks'?' is-graph':'')+'">'+mainHtml()+'</div></main></div>'
  $('[data-sidebar-visibility]')?.addEventListener('click',()=>{sidebarCollapsed=!sidebarCollapsed;render()})
  root.querySelectorAll('[data-doc]').forEach(node=>node.addEventListener('click',e=>{e.preventDefault();select(node.dataset.doc,node.dataset.heading||'')}))
  root.querySelectorAll('[data-section]').forEach(node=>node.addEventListener('click',e=>{e.preventDefault();select(node.dataset.section)}))
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
  root.querySelectorAll('[data-tag]').forEach(node=>node.addEventListener('click',()=>{search=node.dataset.tag;render();$('#sidebar-search')?.focus()}))
  if(selected==='playbooks'){
    const navigateFocus=id=>{
      graphFocus=id
      graphMode='local'
      render()
    }
    window.mountPlaybookGraph?.($('.graph-shell'),playbooks,documents,{
      mode:graphMode,focus:graphFocus,depth:1,filter:graphFilter,
      ...graphOptions,
      selectNode:navigateFocus,openDocument:select,
      resetView:()=>{
        graphMode='global'
        graphFocus=null
        graphFilter=''
        graphOptions={...defaultGraphOptions}
        graphSettingsOpen=true
        render()
      }
    })
    $('[data-settings-toggle]')?.addEventListener('click',()=>{graphSettingsOpen=!graphSettingsOpen;$('.graph-settings')?.classList.toggle('is-open',graphSettingsOpen);$('[data-settings-toggle]')?.setAttribute('aria-expanded',String(graphSettingsOpen))})
    $('[data-settings-close]')?.addEventListener('click',()=>{graphSettingsOpen=false;$('.graph-settings')?.classList.remove('is-open');$('[data-settings-toggle]')?.setAttribute('aria-expanded','false')})
    root.querySelectorAll('[data-graph-option]').forEach(control=>control.addEventListener('change',()=>{
      const name=control.dataset.graphOption
      graphOptions[name]=control.type==='checkbox'?control.checked:Number(control.value)
      render()
    }))
    $('#graph-search')?.addEventListener('change',e=>{graphFilter=e.target.value;render()})
    $('#graph-search')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();graphFilter=e.target.value;render()}})
  }
}
window.addEventListener('popstate',()=>{
  const p=new URLSearchParams(location.search)
  selected=documents[p.get('doc')]?p.get('doc'):(folders[p.get('folder')]?p.get('folder'):p.get('view')==='products'?'products':'playbooks')
  render()
  const h=p.get('heading')
  if(h)document.getElementById(window.noteMarkdown.slug(h))?.scrollIntoView({block:'start'})
})
load().catch(error=>{root.innerHTML='<p class="loading-error">문서를 불러오지 못했습니다: '+esc(error.message)+'</p>';console.error(error)})
