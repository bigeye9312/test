/* D3 force-directed graph for the Markdown knowledge base.
 * Graph nodes and links are derived only from docs/playbooks frontmatter. */
(() => {
  const palette = {
    discovery: '#8f9ec9',
    runtime: '#bd9cce',
    error: '#d19a9a',
    performance: '#c9b17f',
    internal: '#86bca8',
    default: '#a7a7a7'
  }
  let release = () => {}
  window.disposePlaybookGraph = () => release()

  window.mountPlaybookGraph = (panel, paths, documents, options) => {
    release()
    const d3 = window.d3
    const canvas = panel?.querySelector('.graph-canvas')
    if (!d3 || !canvas) {
      if (canvas) canvas.textContent = 'Graph renderer unavailable'
      return
    }
    const allNodes = paths.map(path => ({
      id: String(documents[path].meta.id || path),
      path,
      title: String(documents[path].meta.title || path.split('/').pop()),
      category: String(documents[path].meta.category || 'default'),
      tags: documents[path].meta.tags || []
    }))
    const byId = new Map(allNodes.map(node => [node.id, node]))
    const allEdges = paths.flatMap(path => {
      const origin = documents[path].meta.id || path
      return (documents[path].meta.links || [])
        .filter(link => byId.has(link.to))
        .map(link => ({ source: origin, target: link.to, type: link.type || 'related' }))
    })
    const adjacency = new Map(allNodes.map(node => [node.id, new Set()]))
    for (const edge of allEdges) {
      adjacency.get(edge.source)?.add(edge.target)
      adjacency.get(edge.target)?.add(edge.source)
    }
    const mode = options.mode || 'global'
    const focus = byId.get(options.focus) || allNodes[0]
    const depth = Math.max(1, Math.min(2, Number(options.depth) || 1))
    let visible = new Set(allNodes.map(node => node.id))
    if (mode === 'local' && focus) {
      visible = new Set([focus.id])
      let frontier = new Set([focus.id])
      for (let i = 0; i < depth; i++) {
        const next = new Set()
        for (const id of frontier) {
          for (const neighbor of adjacency.get(id) || []) {
            if (!visible.has(neighbor)) next.add(neighbor)
            visible.add(neighbor)
          }
        }
        frontier = next
      }
    } else if (mode === 'category' && options.category) {
      const primary = allNodes.filter(node => node.category === options.category).map(node => node.id)
      visible = new Set(primary)
      // Show first-hop cross-category context without hiding the relationship.
      for (const id of primary) {
        for (const neighbor of adjacency.get(id) || []) visible.add(neighbor)
      }
    }
    if (options.orphans === false) {
      visible = new Set([...visible].filter(id => (adjacency.get(id)?.size || 0) > 0))
    }
    const nodes = allNodes.filter(node => visible.has(node.id)).map(node => ({...node}))
    const edges = allEdges.filter(edge => visible.has(edge.source) && visible.has(edge.target))
      .map(edge => ({...edge}))
    const selectedId = mode === 'local' && focus ? focus.id : null
    const width = 960, height = 560
    const svg = d3.select(canvas).append('svg')
      .attr('viewBox', '0 0 ' + width + ' ' + height)
      .attr('role', 'group').attr('aria-label', 'Interactive playbook graph')
    const viewport = svg.append('g')
    const edgeLayer = viewport.append('g')
    const nodeLayer = viewport.append('g')
    const linkSelection = edgeLayer.selectAll('line').data(edges).join('line')
      .attr('class', d => 'graph-edge ' + (d.type === 'related' ? 'related' : 'conditional'))
      .style('stroke-width', Number(options.linkThickness) || 1)
    const nodeSelection = nodeLayer.selectAll('g').data(nodes).join('g')
      .attr('class', d => 'force-node' + (d.id === selectedId ? ' is-focus' : ''))
      .attr('role', 'button').attr('tabindex', 0)
      .attr('aria-label', d => d.title + ', select local graph; select again to open document')
    nodeSelection.append('circle').attr('class', 'node-halo').attr('r', 18)
      .attr('fill', d => palette[d.category] || palette.default)
    nodeSelection.append('circle').attr('class', 'node-core')
      .attr('r', d => (Number(options.nodeSize) || 7) + (d.id === selectedId ? 3 : 0))
      .attr('fill', d => palette[d.category] || palette.default)
    nodeSelection.append('text').attr('class', 'node-title').attr('text-anchor', 'middle')
      .attr('dy', 30).text(d => d.title)
      .style('display', options.showLabels === false ? 'none' : null)

    const zoom = d3.zoom().scaleExtent([.45, 3])
      .filter(e => e.type !== 'dblclick' && !e.button)
      .on('zoom', event => viewport.attr('transform', event.transform))
    svg.call(zoom).on('dblclick.zoom', null)
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(Number(options.linkDistance) || (mode === 'local' ? 150 : 135)).strength(.5))
      .force('charge', d3.forceManyBody().strength(-(Number(options.repel) || 410)))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(67))
      .alphaDecay(.036)
      .on('tick', () => {
        linkSelection.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
        nodeSelection.attr('transform', d => 'translate(' + d.x + ',' + d.y + ')')
      })
    // d3.forceLink converts edge source and target strings to node objects.
    const info = panel.querySelector('.graph-info')
    const updateInfo = text => { if (info) info.textContent = text }
    const defaultInfo = mode === 'local' && focus
      ? focus.title + ' · ' + nodes.length + ' nodes · Select focused node to open document'
      : nodes.length + ' nodes · Select node to explore locally'
    updateInfo(defaultInfo)
    const matches = d => (d.title + ' ' + d.id + ' ' + d.tags.join(' ')).toLowerCase()
      .includes((options.filter || '').trim().toLowerCase())
    function highlight(node) {
      const connected = adjacency.get(node.id) || new Set()
      nodeSelection.classed('dimmed', d => d.id !== node.id && !connected.has(d.id))
      linkSelection.classed('dimmed', d => d.source.id !== node.id && d.target.id !== node.id)
      updateInfo(node.title + ' · ' + connected.size + ' connections')
    }
    function normal() {
      const hasFilter = !!(options.filter || '').trim()
      nodeSelection.classed('dimmed', d => hasFilter && !matches(d))
      linkSelection.classed('dimmed', d => hasFilter && !matches(d.source) && !matches(d.target))
      updateInfo(defaultInfo)
    }
    normal()
    let moved = false
    const dragging = d3.drag()
      .on('start', event => {
        moved = false
        event.sourceEvent?.stopPropagation()
        if (!event.active) simulation.alphaTarget(.2).restart()
        event.subject.fx = event.subject.x
        event.subject.fy = event.subject.y
      })
      .on('drag', event => {
        moved = true
        event.subject.fx = event.x
        event.subject.fy = event.y
      })
      .on('end', event => {
        if (!event.active) simulation.alphaTarget(0)
        event.subject.fx = null
        event.subject.fy = null
      })
    nodeSelection.call(dragging)
    const activate = node => {
      if (mode === 'local' && selectedId === node.id) options.openDocument(node.path)
      else options.selectNode(node.id)
    }
    nodeSelection
      .on('mouseenter', (_, node) => highlight(node))
      .on('mouseleave', normal)
      .on('focus', (_, node) => highlight(node))
      .on('blur', normal)
      .on('click', (event, node) => {
        if (event.defaultPrevented || moved) return
        activate(node)
      })
      .on('dblclick', (event, node) => {
        event.stopPropagation()
        event.preventDefault()
        options.openDocument(node.path)
      })
      .on('keydown', (event, node) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          activate(node)
        }
      })
    const resetButton = panel.querySelector('[data-graph-reset]')
    const zoomInButton = panel.querySelector('[data-zoom-in]')
    const zoomOutButton = panel.querySelector('[data-zoom-out]')
    const onReset = () => svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity)
    const onZoomIn = () => svg.transition().duration(180).call(zoom.scaleBy, 1.3)
    const onZoomOut = () => svg.transition().duration(180).call(zoom.scaleBy, 1 / 1.3)
    resetButton?.addEventListener('click', onReset)
    zoomInButton?.addEventListener('click', onZoomIn)
    zoomOutButton?.addEventListener('click', onZoomOut)
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      simulation.stop()
      for (let i = 0; i < 240; i++) simulation.tick()
      linkSelection.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      nodeSelection.attr('transform', d => 'translate(' + d.x + ',' + d.y + ')')
    }
    release = () => {
      simulation.stop()
      resetButton?.removeEventListener('click', onReset)
      zoomInButton?.removeEventListener('click', onZoomIn)
      zoomOutButton?.removeEventListener('click', onZoomOut)
      svg.on('.zoom', null).remove()
      release = () => {}
    }
  }
})()
