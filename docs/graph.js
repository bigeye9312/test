/* Interactive Obsidian-inspired graph for the static docs viewer.
 * Derived from Markdown frontmatter; no Quartz runtime required.
 * Requires D3 v7 loaded before app.js. */
(() => {
  const palette = {
    discovery: '#69b7ff',
    runtime: '#b299ff',
    error: '#ff8795',
    performance: '#f5bf6a',
    internal: '#55d9b5',
    default: '#a9b8d0',
  }
  let dispose = () => {}
  const svgNS = 'http://www.w3.org/2000/svg'

  window.disposePlaybookGraph = () => dispose()

  window.mountPlaybookGraph = (container, paths, docs, navigate) => {
    dispose()
    const d3 = window.d3
    if (!d3) {
      container.textContent = '그래프 라이브러리를 불러올 수 없습니다. 연결 상태를 확인하세요.'
      return
    }
    const width = 960
    const height = 590
    const nodes = paths.map(path => ({
      id: String(docs[path].meta.id || path),
      path,
      title: String(docs[path].meta.title || path.split('/').pop()),
      category: String(docs[path].meta.category || 'default'),
      tags: docs[path].meta.tags || [],
    }))
    const ids = new Set(nodes.map(node => node.id))
    const links = paths.flatMap(path => {
      const src = docs[path].meta.id || path
      return (docs[path].meta.links || [])
        .filter(ref => ids.has(ref.to))
        .map(ref => ({ source: src, target: ref.to, type: ref.type || 'related' }))
    })
    const neighbors = new Map(nodes.map(n => [n.id, new Set([n.id])]))
    links.forEach(link => {
      neighbors.get(link.source)?.add(link.target)
      neighbors.get(link.target)?.add(link.source)
    })

    const svg = d3.select(container).append('svg')
      .attr('viewBox', '0 0 ' + width + ' ' + height)
      .attr('role', 'img')
      .attr('aria-label', 'Playbooks 상호작용 그래프: 노드를 클릭하면 문서가 열립니다')
    const defs = svg.append('defs')
    const glow = defs.append('filter').attr('id', 'graph-node-glow')
      .attr('x', '-100%').attr('y', '-100%')
      .attr('width', '300%').attr('height', '300%')
    glow.append('feGaussianBlur').attr('stdDeviation', 6)
    const viewport = svg.append('g').attr('class', 'graph-viewport')
    const linkLayer = viewport.append('g').attr('class', 'graph-links')
    const nodeLayer = viewport.append('g').attr('class', 'graph-nodes')
    const edgeSel = linkLayer.selectAll('line').data(links).join('line')
      .attr('class', link => link.type === 'related' ? 'graph-edge related' : 'graph-edge conditional')
    const nodeSel = nodeLayer.selectAll('g').data(nodes).join('g')
      .attr('class', 'force-node')
      .attr('tabindex', 0)
      .attr('role', 'button')
      .attr('aria-label', d => d.title + ' 문서 열기')
    nodeSel.append('circle').attr('class', 'node-halo')
      .attr('r', 15)
      .attr('fill', d => palette[d.category] || palette.default)
    nodeSel.append('circle').attr('class', 'node-core')
      .attr('r', d => 7 + Math.min(links.filter(l => l.source === d.id || l.target === d.id).length, 4))
      .attr('fill', d => palette[d.category] || palette.default)
    nodeSel.append('text').attr('class', 'node-title')
      .attr('dy', 30).attr('text-anchor', 'middle')
      .text(d => d.title)

    const info = container.querySelector('.graph-info')
    const defaultInfo = info ? info.textContent : ''
    const zoom = d3.zoom().scaleExtent([0.45, 3.0])
      .filter(e => !e.button && (e.type !== 'dblclick'))
      .on('zoom', event => viewport.attr('transform', event.transform))
    svg.call(zoom).on('dblclick.zoom', null)

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(160).strength(0.45))
      .force('charge', d3.forceManyBody().strength(-610))
      .force('center', d3.forceCenter(width/2, height/2))
      .force('collide', d3.forceCollide(75).iterations(2))
      .alphaDecay(0.027)
      .on('tick', () => {
        edgeSel
          .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
        nodeSel.attr('transform', d => 'translate(' + d.x + ',' + d.y + ')')
      })

    // ForceLink mutates source/target into objects after simulation initializes.
    function showRelations(node) {
      const adj = neighbors.get(node.id)
      nodeSel.classed('dimmed', d => !adj.has(d.id))
      edgeSel.classed('dimmed', l => l.source.id !== node.id && l.target.id !== node.id)
      nodeSel.classed('focused', d => d.id === node.id)
      if (info) info.textContent = node.title + ' · 연결된 관점 ' + (adj.size - 1) + '개 · 클릭하여 열기'
    }
    function clearRelations() {
      nodeSel.classed('dimmed', false).classed('focused', false)
      edgeSel.classed('dimmed', false)
      if (info) info.textContent = defaultInfo
    }
    nodeSel.on('mouseenter', (_, d) => showRelations(d))
      .on('mouseleave', clearRelations)
      .on('focus', (_, d) => showRelations(d))
      .on('blur', clearRelations)
      .on('click', (event, d) => {
        if (event.defaultPrevented) return
        navigate(d.path)
      })
      .on('keydown', (event, d) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          navigate(d.path)
        }
      })
    nodeSel.call(d3.drag()
      .on('start', event => {
        event.sourceEvent.stopPropagation()
        if (!event.active) simulation.alphaTarget(0.18).restart()
        event.subject.fx = event.subject.x
        event.subject.fy = event.subject.y
      })
      .on('drag', event => {
        event.subject.fx = event.x
        event.subject.fy = event.y
      })
      .on('end', event => {
        if (!event.active) simulation.alphaTarget(0)
        event.subject.fx = null
        event.subject.fy = null
      }))

    function reset() {
      svg.transition().duration(450).call(zoom.transform, d3.zoomIdentity)
      simulation.alpha(0.6).restart()
    }
    const resetButton = container.querySelector('[data-graph-reset]')
    resetButton?.addEventListener('click', reset)
    // Gracefully follow the user's reduced-motion preference.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      simulation.stop()
      for (let i = 0; i < 250; i++) simulation.tick()
      edgeSel.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      nodeSel.attr('transform', d => 'translate(' + d.x + ',' + d.y + ')')
    }
    dispose = () => {
      simulation.stop()
      resetButton?.removeEventListener('click', reset)
      svg.on('.zoom', null)
      nodeSel.on('mouseenter', null).on('mouseleave', null).on('click', null).on('keydown', null)
      svg.remove()
      dispose = () => {}
    }
  }
})()
