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
  selected=documents[p.get('doc')]?p.get('doc'):(folders[p.get('folder')]?p.get('folder'):p.get('view')==='products'?'products':'playbooks')
  render()
  const h=p.get('heading')
  if(h)document.getElementById(window.noteMarkdown.slug(h))?.scrollIntoView({block:'start'})
})
load().catch(error=>{root.innerHTML='<p class="loading-error">문서를 불러오지 못했습니다: '+esc(error.message)+'</p>';console.error(error)})
function folderHtml(folder){
  const doc=documents[folders[folder]]
  if(!doc)return ''
  const hasGraph=folder==='playbooks'&&doc.body.includes('<!-- graph -->')
  const parts=doc.body.split('<!-- graph -->')
  const textDoc=body=>markdownHtml({...doc,body})
  if(hasGraph){
    return '<div class="folder-graph-page"><div class="folder-graph-heading">'+breadcrumb(folder)+'<h1 class="document-title">'+esc(label(folder))+'</h1>'+
      (parts[0]?'<div class="markdown folder-intro">'+textDoc(parts[0])+'</div>':'')+'</div>'+
      graphHtml()+(parts[1]?'<div class="article-wrap markdown">'+textDoc(parts[1])+'</div>':'')+'</div>'
  }
  const immediateFolders=Object.keys(folders).filter(key=>key.startsWith(folder+'/')&&key.slice(folder.length+1).indexOf('/')<0)
  const immediateFiles=[...playbooks,...products].filter(path=>path.startsWith(folder+'/')&&path.slice(folder.length+1).indexOf('/')<0)
  const children=[...immediateFolders.map(key=>({key,isFolder:true})),...immediateFiles.map(key=>({key,isFolder:false}))]
  return '<div class="article-wrap">'+breadcrumb(folder)+'<h1 class="document-title">'+esc(label(folder))+'</h1>'+
    propertyHtml(doc)+'<div class="markdown folder-intro">'+textDoc(doc.body)+'</div>'+
    (children.length?'<div class="folder-children">'+children.map(item=>'<a href="'+docUrl(item.key)+'" '+(item.isFolder?'data-section':'data-doc')+'="'+esc(item.key)+'"><span>'+(item.isFolder?'▸':'▧')+'</span><strong>'+esc(label(item.key))+'</strong><span class="folder-child-arrow">›</span></a>').join('')+'</div>':'')+'</div>'
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
