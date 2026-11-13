(function(){
 const {marked,DOMPurify}=window
 const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
 const slug=s=>String(s).toLowerCase().replace(/<[^>]+>/g,'').replace(/[^\p{L}\p{N}\s_-]/gu,'').trim().replace(/\s+/g,'-')
 function resolve(raw,current,documents){
   const [file,heading='']=String(raw).split('#')
   const value=file.trim().replace(/\.md$/,'')
   if(!value)return {path:current,heading}
   const paths=Object.keys(documents)
   let path=paths.find(p=>p.replace(/\.md$/,'')===value)
   if(!path){
     const parts=current.split('/').slice(0,-1)
     for(const bit of value.split('/')){if(bit==='..')parts.pop();else if(bit!=='.')parts.push(bit)}
     path=paths.find(p=>p.replace(/\.md$/,'')===parts.join('/'))
   }
   if(!path){
     const matches=paths.filter(p=>p.replace(/\.md$/,'').split('/').pop()===value)
     if(matches.length===1)path=matches[0]
   }
   return path?{path,heading}:null
 }
 const refs=body=>[...body.matchAll(/(?<!!)\[\[([^\]\n]+)\]\]/g)].map(m=>m[1].split('|')[0])
 function render(doc,documents,docUrl,label){
   const counts=new Map(),renderer=new marked.Renderer()
   renderer.heading=({text,depth})=>{
     const key=slug(text),count=counts.get(key)||0
     counts.set(key,count+1)
     return '<h'+depth+' id="'+esc(key+(count?'-'+count:''))+'">'+text+'</h'+depth+'>'
   }
   renderer.link=({href,text})=>{
     const [base,fragment='']=String(href||'').split('#')
     let target=null
     if(documents[base])target={path:base,heading:fragment}
     else if(base&&!/^(?:https?:|mailto:|data:|javascript:)/i.test(base)){
       const parts=doc.path.split('/').slice(0,-1)
       for(const bit of base.split('/')){if(bit==='..')parts.pop();else if(bit!=='.')parts.push(bit)}
       const path=parts.join('/')
       if(documents[path])target={path,heading:fragment}
     }
     if(target)return '<a href="'+docUrl(target.path,target.heading)+'" data-doc="'+esc(target.path)+'" data-heading="'+esc(target.heading)+'">'+text+'</a>'
     if(!href||/^(javascript:|data:|vbscript:)/i.test(href))return esc(text)
     return '<a href="'+esc(href)+'"'+(/^https?:/i.test(href)?' target="_blank" rel="noopener noreferrer"':'')+'>'+text+'</a>'
   }
   const convert=raw=>raw.replace(/(?<!!)\[\[([^\]\n]+)\]\]/g,(_,value)=>{
     const [ref,alias]=value.split('|'),target=resolve(ref,doc.path,documents)
     if(!target)return alias||ref
     return '['+(alias||target.heading||label(target.path)).replace(/[\[\]]/g,'')+']('+target.path+(target.heading?'#'+slug(target.heading):'')+')'
   })
   const renderNormal=raw=>{
     // Fenced code examples must remain literal; WikiLinks are not expanded there.
     const fenced=/((?:^|\n)(?:\x60{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^|\n)(?:\x60{3,}|~{3,})[ \t]*(?=\n|$))/g
     return marked.parse(raw.split(fenced).map(part=>/^(?:\n)?(?:\x60{3,}|~{3,})/.test(part)?part:convert(part)).join(''),{renderer})
   }
   const lines=doc.body.split(/\r?\n/),out=[],normal=[]
   const flush=()=>{if(normal.length){out.push(renderNormal(normal.join('\n')));normal.length=0}}
   for(let i=0;i<lines.length;){
     const m=lines[i].match(/^>\s*\[!([A-Za-z]+)\]([+-])?\s*(.*)$/)
     if(!m){normal.push(lines[i++]);continue}
     flush()
     const types=['note','info','tip','warning','caution','danger','important','example','question','success','failure','bug','quote','abstract']
     const kind=types.includes(m[1].toLowerCase())?m[1].toLowerCase():'note'
     const title=m[3]||kind.charAt(0).toUpperCase()+kind.slice(1)
     const inner=[];i++
     while(i<lines.length&&/^>/.test(lines[i]))inner.push(lines[i++].replace(/^>\s?/,''))
     out.push('<aside class="callout callout-'+kind+'"><div class="callout-title">'+esc(title)+'</div><div class="callout-body">'+renderNormal(inner.join('\n'))+'</div></aside>')
   }
   flush()
   return DOMPurify.sanitize(out.join('\n'))
 }
 window.noteMarkdown={render,resolve,refs,slug}
})()
