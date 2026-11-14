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
let documents={}, pages=[], playbooks=[], folders={}
let sidebarOrder=[]

let selected='home', expanded=new Set(['playbook','device-info'])
let search='', graphFilter=''
let homeTab='graph'
let tagFilter='', tagSettingsOpen=false, tagShowCounts=true, tagBubbleScale=1
let sidebarCollapsed=false
let graphMode='global', graphFocus=null
let graphSettingsOpen=false
const defaultGraphOptions={orphans:true, nodeSize:7, linkThickness:1, repel:180, linkDistance:60, showLabels:true}
let graphOptions={...defaultGraphOptions}

const docUrl = path => path==='home'?'?view=home':folders[path]&&!path.includes('/')?'?view='+encodeURIComponent(path):folders[path]?'?folder='+encodeURIComponent(path):'?doc='+encodeURIComponent(path)
function parse(raw){
  const match=raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/)
  return match?{meta:yaml.load(match[1])||{},body:raw.slice(match[0].length)}:{meta:{},body:raw}
}
async function load(){
  const r=await fetch('./manifest.json'); if(!r.ok)throw Error('manifest.json을 읽을 수 없습니다')
  const manifest=await r.json()
  pages=manifest.documents||[]; folders=manifest.folders||{}
  playbooks=pages.filter(path=>path.startsWith('playbook/'))
  const roots=Object.keys(folders).filter(path=>!path.includes('/'))
  sidebarOrder=Array.isArray(manifest.sidebarOrder)?[...new Set([...manifest.sidebarOrder.filter(path=>roots.includes(path)),...roots])]:roots
  await Promise.all([...new Set([...pages,...Object.values(folders)])].map(async path=>{
    const res=await fetch('./'+path);if(!res.ok)throw Error(path+'를 읽을 수 없습니다')
    documents[path]={...parse(await res.text()),path}
  }))
  const params=new URLSearchParams(location.search)
  selected=selectedFromParams(params)
  render()
  if(params.get('heading'))document.getElementById(window.noteMarkdown.slug(params.get('heading')))?.scrollIntoView({block:'start'})
}
function selectedFromParams(params){
 const remap=value=>String(value||'').replace(/^playbooks(?=\/|$)/,'playbook').replace(/^products(?=\/|$)/,'device-info')
 const doc=remap(params.get('doc')),folder=remap(params.get('folder')),view=remap(params.get('view'))
 return documents[doc]?doc:folders[folder]?folder:folders[view]?view:'home'
}
function label(path){return path==='home'?'Home':documents[folders[path]||path]?.body.match(/^#\s+(.+)$/m)?.[1]?.trim()||path.split('/').pop().replace(/\.md$/,'')}
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
      if(search&&!([label(value),value,...(documents[value]?.meta.tags||[]),documents[value]?.body||''].join(' ').toLowerCase().includes(search.toLowerCase())))return ''
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
 const nav=sidebarOrder.map(key=>{
  const sectionPaths=pages.filter(path=>path.startsWith(key+'/'))
  const content=(search||expanded.has(key))?treeHtml(tree(sectionPaths,key+'/'),key+'/'):''
  return '<div class="tree-section"><div class="section-row"><button data-section="'+esc(key)+'" class="section-link'+(selected===key?' selected':'')+'">'+esc(sidebarFolderLabel(key))+'</button><button class="section-toggle" data-top="'+esc(key)+'" aria-label="Toggle '+esc(sidebarFolderLabel(key))+'">'+((search||expanded.has(key))?'⌄':'›')+'</button></div>'+content+'</div>'
 }).join('')
 return '<aside class="sidebar" id="wiki-sidebar">'+sidebarToggleHtml()+'<a class="brand" data-section="home" href="'+docUrl('home')+'"><span class="brand-mark" role="img" aria-label="Government building">🏛️</span> CIA</a>'+
 '<div class="sidebar-search"><span class="search-icon" aria-hidden="true">⌕</span><input id="sidebar-search" type="search" placeholder="Search" aria-label="Search files" value="'+esc(search)+'"></div>'+
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
   (tags.length?'<div class="metadata-row"><span class="metadata-icon" title="Tags" aria-label="Tags"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 12 22l-10-10V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7" cy="7" r="1"/></svg></span><div class="metadata-items metadata-tags">'+tagLinks+'</div></div>':'')+
   (incoming.length?'<div class="metadata-row"><span class="metadata-icon" title="Backlinks" aria-label="Backlinks"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span><div class="metadata-items">'+backlinks+'</div></div>':'')+
   '</footer>'
}
function tagCounts(){
 const counts=new Map()
 for(const path of pages){
  const tags=documents[path]?.meta?.tags
  if(!Array.isArray(tags))continue
  for(const tag of new Set(tags.filter(tag=>typeof tag==='string'&&tag.trim())))counts.set(tag,(counts.get(tag)||0)+1)
 }
 return [...counts].map(([tag,count])=>({tag,count})).sort((a,b)=>b.count-a.count||a.tag.localeCompare(b.tag))
}
function homeTagsHtml(){
 const count=tagCounts().length
 return '<section class="home-tags" role="tabpanel" id="home-tags-panel" aria-label="Tags">'+
  '<div class="graph-head"><div class="graph-head-actions"><button class="graph-toolbar-button" data-tag-settings-toggle aria-expanded="'+tagSettingsOpen+'" title="Settings" aria-label="Settings">☷</button></div></div>'+
  '<div class="home-tag-cloud" aria-label="Interactive tag cloud"></div>'+
  '<label class="graph-quick-search'+(tagSettingsOpen?' is-hidden':'')+'"><span class="search-icon" aria-hidden="true">⌕</span><input id="tag-quick-search" type="search" placeholder="Search" value="'+esc(tagFilter)+'" aria-label="Search tags"></label>'+
  '<aside class="graph-settings'+(tagSettingsOpen?' is-open':'')+'" aria-label="Tag settings">'+
  '<div class="settings-top"><strong>Settings</strong><button type="button" data-tag-settings-close title="Close settings" aria-label="Close settings">×</button></div>'+
  '<details open><summary>Filters</summary><div class="settings-group"><label class="settings-search"><span class="search-icon" aria-hidden="true">⌕</span><input id="tag-settings-search" type="search" placeholder="Search" value="'+esc(tagFilter)+'" aria-label="Search tags"></label></div></details>'+
  '<details open><summary>Display</summary><div class="settings-group"><label class="settings-toggle"><span>Document counts</span><input type="checkbox" data-tag-counts'+(tagShowCounts?' checked':'')+'><i></i></label>'+
  '<label class="settings-slider"><span>Bubble size</span><input type="range" data-tag-size min="0.7" max="1.3" step="0.1" value="'+tagBubbleScale+'"></label></div></details>'+
  '</aside><span class="home-tags-count graph-node-count">'+count+' tags</span></section>'
}
function mountHomeTagCloud(){
 const host=$('.home-tag-cloud')
 if(!host||!window.d3)return
 const d3=window.d3
 const tags=tagCounts()
 if(!tags.length){host.textContent='No tags';return}
 const width=760,height=420
 const colors=['#8f9ec9','#bd9cce','#86bca8','#c9b17f','#d19a9a']
 const tint=tag=>{
  const kind=tag.startsWith('area/')?tag.slice(5):''
  if(categories[kind])return categories[kind].color
  return colors[[...tag].reduce((n,ch)=>n+ch.codePointAt(0),0)%colors.length]
 }
 const packed=d3.pack().size([width-28,height-28]).padding(8)(
  d3.hierarchy({children:tags}).sum(d=>d.count?Math.pow(d.count,.7)+3:0).sort((a,b)=>b.value-a.value)
 ).leaves()
 const svg=d3.select(host).append('svg').attr('viewBox','0 0 '+width+' '+height)
  .attr('role','group').attr('aria-label','Tag cloud; select a tag to filter documents')
 const layer=svg.append('g').attr('transform','translate(14,14)')
 const nodes=layer.selectAll('g').data(packed).join('g')
  .attr('class','home-tag-node').attr('transform',d=>'translate('+d.x+','+d.y+') scale('+tagBubbleScale+')')
  .attr('role','button').attr('tabindex',0)
  .attr('aria-label',d=>d.data.tag+', '+d.data.count+' documents')
 const open=d=>{search=d.data.tag;sidebarCollapsed=false;render();$('#sidebar-search')?.focus()}
 nodes.on('click',(_,d)=>open(d)).on('keydown',(event,d)=>{
  if(event.key==='Enter'||event.key===' '){event.preventDefault();open(d)}
 })
 nodes.append('circle').attr('r',d=>d.r)
  .attr('fill',d=>tint(d.data.tag)).attr('fill-opacity',.19)
  .attr('stroke',d=>tint(d.data.tag)).attr('stroke-opacity',.68)
 nodes.append('title').text(d=>'#'+d.data.tag+' · '+d.data.count+' documents')
 nodes.append('text').attr('class','home-tag-name')
  .attr('font-size',d=>Math.min(17,Math.max(9,d.r*.39)))
  .attr('dy',d=>d.r>29?'-0.1em':'0.32em')
  .text(d=>{
   const allowed=Math.max(3,Math.floor(d.r*1.65/(Math.min(17,Math.max(9,d.r*.39))*.55)))
   const label='#'+d.data.tag
   return label.length>allowed?label.slice(0,allowed-1)+'…':label
  })
 nodes.filter(d=>d.r>29 && tagShowCounts).append('text').attr('class','home-tag-frequency')
  .attr('dy','1.35em').text(d=>d.data.count)
 const matches=d=>d.data.tag.toLowerCase().includes(tagFilter.trim().toLowerCase())
 nodes.classed('tag-dimmed',d=>!!tagFilter.trim()&&!matches(d))
}
function graphHtml(){
  const checked=name=>graphOptions[name]?' checked':''
  const slider=(name,min,max,step,title)=>'<label class="settings-slider"><span>'+title+'</span><input type="range" data-graph-option="'+name+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+graphOptions[name]+'"></label>'
  const filters='<details open><summary>Filters</summary><div class="settings-group">'+
    '<label class="settings-search"><span class="search-icon" aria-hidden="true">⌕</span><input id="graph-search" type="search" placeholder="Search" value="'+esc(graphFilter)+'" aria-label="Search files"></label>'+
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
    slider('repel',80,900,20,'Repel force')+slider('linkDistance',30,260,10,'Link distance')+
    '</div></details>'
  const tabs='<div class="home-view-tabs" role="tablist" aria-label="Home views"><button type="button" role="tab" data-home-tab="graph" aria-selected="'+(homeTab==='graph')+'">Graph</button><button type="button" role="tab" data-home-tab="tags" aria-selected="'+(homeTab==='tags')+'">Tags</button></div>'
  const intro='<div class="graph-workspace">'+breadcrumb('home')+'<div class="graph-page-heading"><h1 class="graph-page-title">Home</h1>'+tabs+'</div>'
  if(homeTab==='tags')return intro+homeTagsHtml()+'</div>'
  return intro+'<section class="graph-shell" aria-label="Interactive Document Graph">'+
    '<div class="graph-head"><div class="graph-head-actions">'+
    '<button class="graph-toolbar-button" data-settings-toggle aria-expanded="'+graphSettingsOpen+'" title="Settings" aria-label="Settings">☷</button>'+
    '</div></div>'+
    '<div class="graph-canvas"></div>'+
    '<label class="graph-quick-search'+(graphSettingsOpen?' is-hidden':'')+'"><span class="search-icon" aria-hidden="true">⌕</span><input id="graph-quick-search" type="search" placeholder="Search" value="'+esc(graphFilter)+'" aria-label="Search graph nodes"></label>'+
    '<aside class="graph-settings'+(graphSettingsOpen?' is-open':'')+'" aria-label="Settings">'+
    '<div class="settings-top"><strong>Settings</strong><button type="button" data-settings-close title="Close settings" aria-label="Close settings">×</button></div>'+
    filters+groups+display+forces+'</aside>'+
    '<div class="graph-canvas-controls"><button data-zoom-in title="Zoom in" aria-label="Zoom in">+</button><button data-zoom-out title="Zoom out" aria-label="Zoom out">−</button><button data-graph-reset title="Reset view" aria-label="Reset view">⟲</button><span class="graph-node-count" aria-live="polite">0 nodes</span></div>'+
    
    '</section></div>'
}
function breadcrumb(path){
 const parts=path.split('/')
 return '<nav class="breadcrumbs" aria-label="Breadcrumb">'+parts.map((part,i)=>{
   const target=parts.slice(0,i+1).join('/')
   const current=i===parts.length-1
   const file=current&&path.endsWith('.md')
   const valid=target==='home'||(file?!!documents[target]:!!folders[target])
   const display=part
   if(!valid)return '<span>'+esc(display)+'</span>'
   return '<a '+(file?'data-doc':'data-section')+'="'+esc(target)+'" href="'+docUrl(target)+'"'+(current?' aria-current="page" class="breadcrumb-current"':'')+'>'+esc(display)+'</a>'
 }).join('<span class="breadcrumb-divider">/</span>')+'</nav>'
}

function documentTocHtml(doc){
 const headings=[],seen=new Map()
 let fence=null
 for(const line of doc.body.split(/\r?\n/)){
  const mark=line.match(/^\s*(`{3,}|~{3,})/)
  if(mark){
   if(!fence)fence=mark[1][0]
   else if(mark[1][0]===fence)fence=null
   continue
  }
  if(fence)continue
  const heading=line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/)
  if(!heading)continue
  const text=heading[2].replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[`*_~]/g,'')
  const key=window.noteMarkdown.slug(text),count=seen.get(key)||0
  seen.set(key,count+1)
  headings.push({id:key+(count?'-'+count:''),title:text,level:heading[1].length})
 }
 if(!headings.length)return ''
 return '<nav class="document-toc" aria-label="On this page"><div class="document-toc-heading">On this page</div>'+
  headings.map(h=>'<a class="document-toc-link'+(h.level===3?' is-subheading':'')+'" href="#'+esc(h.id)+'" data-toc-target="'+esc(h.id)+'">'+esc(h.title)+'</a>').join('')+'</nav>'
}
function folderHtml(folder){
 const doc=documents[folders[folder]]
 if(!doc)return ''
 const subfolders=Object.keys(folders).filter(path=>path.startsWith(folder+'/')&&!path.slice(folder.length+1).includes('/'))
 const files=pages.filter(path=>path.startsWith(folder+'/')&&!path.slice(folder.length+1).includes('/'))
 const children=[...subfolders.map(path=>({path,folder:true})),...files.map(path=>({path,folder:false}))]
 const sections=folder==='playbook'?[...new Set(files.map(path=>(documents[path]?.meta?.tags||[]).find(tag=>tag.startsWith('area/'))||'other'))]
  .sort((a,b)=>a.localeCompare(b)).map(group=>({
   name:group==='other'?'Other':group.replace(/^area\//,'').replace(/\b[a-z]/g,ch=>ch.toUpperCase()),
   items:files.filter(path=>((documents[path]?.meta?.tags||[]).find(tag=>tag.startsWith('area/'))||'other')===group).map(path=>({path,folder:false}))
  })):
  [{name:'Contents',items:children}]
 const contents=sections.filter(section=>section.items.length).map(section=>
  '<section class="folder-toc-section"><h2 class="folder-toc-heading">'+esc(section.name)+' <span>'+section.items.length+'</span></h2>'+
  '<ul class="folder-toc-list">'+section.items.map(item=>'<li><a href="'+docUrl(item.path)+'" '+(item.folder?'data-section':'data-doc')+'="'+esc(item.path)+'">'+
    '<span>'+esc(label(item.path))+'</span><span class="folder-toc-chevron" aria-hidden="true">›</span></a></li>').join('')+'</ul></section>').join('')
 return '<div class="article-wrap">'+breadcrumb(folder)+'<h1 class="document-title">'+esc(label(folder))+'</h1>'+
  '<div class="markdown">'+markdownHtml(doc)+'</div>'+
  (contents?'<nav class="folder-toc" aria-label="Document contents">'+contents+'</nav>':'')+pageMetadata(doc)+'</div>'
}
function articleHtml(doc){
 return '<div class="article-wrap">'+breadcrumb(doc.path)+'<h1 class="document-title">'+esc(label(doc.path))+'</h1>'+
 '<div class="document-layout">'+documentTocHtml(doc)+'<article class="markdown">'+markdownHtml(doc)+'</article></div>'+pageMetadata(doc)+'</div>'
}
function mainHtml(){
  return selected==='home'?graphHtml():folders[selected]?folderHtml(selected):articleHtml(documents[selected])
}
function select(path,heading=''){
  if(path==='home'){graphMode='global';graphFocus=null;graphFilter='';homeTab='graph'}
  if(path!=='home'&&!folders[path]&&!documents[path])return
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
  root.innerHTML='<div class="shell'+(sidebarCollapsed?' sidebar-collapsed':'')+'">'+(sidebarCollapsed?sidebarToggleHtml():sidebarHtml())+'<main class="main"><div class="page-content'+(selected==='home'?' is-graph':'')+'">'+mainHtml()+'</div></main></div>'
  $('[data-sidebar-visibility]')?.addEventListener('click',()=>{sidebarCollapsed=!sidebarCollapsed;render()})
  root.querySelectorAll('[data-doc]').forEach(node=>node.addEventListener('click',e=>{e.preventDefault();select(node.dataset.doc,node.dataset.heading||'')}))
  root.querySelectorAll('[data-section]').forEach(node=>node.addEventListener('click',e=>{e.preventDefault();select(node.dataset.section)}))
  root.querySelectorAll('[data-top]').forEach(node=>node.addEventListener('click',()=>{
    expanded.has(node.dataset.top)?expanded.delete(node.dataset.top):expanded.add(node.dataset.top);render()
  }))
  root.querySelectorAll('[data-folder]').forEach(node=>node.addEventListener('click',()=>{
    expanded.has(node.dataset.folder)?expanded.delete(node.dataset.folder):expanded.add(node.dataset.folder);render()
  }))
  $('#sidebar-search')?.addEventListener('keydown',e=>{
    if(e.key!=='Enter')return
    e.preventDefault()
    search=e.target.value
    render()
    $('#sidebar-search')?.focus()
  })
  if(selected==='home' && homeTab==='tags'){
    mountHomeTagCloud()
    const setTagSettings=open=>{
      tagSettingsOpen=open
      $('.home-tags .graph-settings')?.classList.toggle('is-open',open)
      $('.home-tags .graph-quick-search')?.classList.toggle('is-hidden',open)
      $('[data-tag-settings-toggle]')?.setAttribute('aria-expanded',String(open))
      const active=$(open?'#tag-settings-search':'#tag-quick-search')
      if(active)active.value=tagFilter
    }
    $('[data-tag-settings-toggle]')?.addEventListener('click',()=>setTagSettings(!tagSettingsOpen))
    $('[data-tag-settings-close]')?.addEventListener('click',()=>setTagSettings(false))
    for(const id of ['#tag-quick-search','#tag-settings-search']){
      $(id)?.addEventListener('input',e=>{
        tagFilter=e.target.value
        for(const node of root.querySelectorAll('.home-tag-node')){
          const match=(node.getAttribute('aria-label')||'').split(', ')[0].toLowerCase().includes(tagFilter.trim().toLowerCase())
          node.classList.toggle('tag-dimmed',!!tagFilter.trim()&&!match)
        }
        const other=$(id==='#tag-quick-search'?'#tag-settings-search':'#tag-quick-search')
        if(other)other.value=tagFilter
      })
    }
    $('[data-tag-counts]')?.addEventListener('change',e=>{tagShowCounts=e.target.checked;render()})
    $('[data-tag-size]')?.addEventListener('input',e=>{
      tagBubbleScale=Number(e.target.value)
      root.querySelectorAll('.home-tag-node').forEach(node=>{
        const original=node.getAttribute('transform').replace(/ scale\([^)]*\)$/,'')
        node.setAttribute('transform',original+' scale('+tagBubbleScale+')')
      })
    })
  }
  root.querySelectorAll('[data-tag]').forEach(node=>node.addEventListener('click',()=>{search=node.dataset.tag;sidebarCollapsed=false;render();$('#sidebar-search')?.focus()}))
  root.querySelectorAll('[data-toc-target]').forEach(node=>node.addEventListener('click',e=>{e.preventDefault();document.getElementById(node.dataset.tocTarget)?.scrollIntoView({block:'start',behavior:'smooth'})}))
  root.querySelectorAll('[data-home-tab]').forEach(node=>node.addEventListener('click',()=>{if(homeTab!==node.dataset.homeTab){homeTab=node.dataset.homeTab;render()}}))
  if(selected==='home' && homeTab==='graph'){
    const navigateFocus=id=>{
      graphFocus=id
      graphMode='local'
      render()
    }
    window.mountPlaybookGraph?.($('.graph-shell'),playbooks,documents,{
      mode:graphMode,focus:graphFocus,filter:graphFilter,
      ...graphOptions,
      selectNode:navigateFocus,openDocument:select,
      resetView:()=>{
        graphMode='global'
        graphFocus=null
        graphFilter=''
        graphOptions={...defaultGraphOptions}
        graphSettingsOpen=false
        render()
      }
    })
    const setSettingsOpen=open=>{
      graphSettingsOpen=open
      $('.graph-settings')?.classList.toggle('is-open',open)
      $('.graph-quick-search')?.classList.toggle('is-hidden',open)
      $('[data-settings-toggle]')?.setAttribute('aria-expanded',String(open))
      const activeInput=$(open?'#graph-search':'#graph-quick-search')
      if(activeInput)activeInput.value=graphFilter
    }
    $('[data-settings-toggle]')?.addEventListener('click',()=>setSettingsOpen(!graphSettingsOpen))
    $('[data-settings-close]')?.addEventListener('click',()=>setSettingsOpen(false))
    root.querySelectorAll('[data-graph-option]').forEach(control=>control.addEventListener('change',()=>{
      const name=control.dataset.graphOption
      graphOptions[name]=control.type==='checkbox'?control.checked:Number(control.value)
      render()
    }))
    for(const id of ['#graph-search','#graph-quick-search']){
      $(id)?.addEventListener('change',e=>{graphFilter=e.target.value;render()})
      $(id)?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();graphFilter=e.target.value;render()}})
    }
  }
}
window.addEventListener('popstate',()=>{
  const p=new URLSearchParams(location.search)
  const next=selectedFromParams(p)
  if(next!==selected && next==='home'){graphMode='global';graphFocus=null;graphFilter='';homeTab='graph'}
  selected=next
  render()
  const h=p.get('heading')
  if(h)document.getElementById(window.noteMarkdown.slug(h))?.scrollIntoView({block:'start'})
})
load().catch(error=>{root.innerHTML='<p class="loading-error">문서를 불러오지 못했습니다: '+esc(error.message)+'</p>';console.error(error)})
