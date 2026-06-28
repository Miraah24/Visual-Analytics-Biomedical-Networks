import { useMemo, useRef, useEffect, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
  
function NetworkOverview({ 
  elements,
  activeSenders,
  activeReceivers,
  weightThreshold,
  localSearch,
  lensMode,
  setLensMetadata,
  setBrushedNodes,
  activeTab
 }) {
  const cyRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const maxBcValue = useMemo(() => {
    if (!elements || !elements.nodes) return 0.001; 
    const max = Math.max(...elements.nodes.map(n => Math.sqrt(n.data.betweenness_centrality || 0)));
    return max > 0 ? max : 0.001;
  }, [elements]);

  // ADDED: Visual rules for :selected and .hovered states
  const cyStylesheet = useMemo(() => [
    { 
      selector: 'node', 
      style: { 
        'border-width': 1, 
        'border-color': '#fff',
        'width': `mapData(visual_score, 0, ${maxBcValue}, 12, 50)`,
        'height': `mapData(visual_score, 0, ${maxBcValue}, 12, 50)`
      } 
    },
    { selector: 'node[moltype = "TF"]', style: { 'background-color': '#ff7f0e' } },
    { selector: 'node[moltype = "ligand"]', style: { 'background-color': '#2ca02c' } },
    { selector: 'node[moltype = "receptor"]', style: { 'background-color': '#1f77b4' } },
    { selector: 'node:selected', style: { 'border-width': 4, 'border-color': '#eab308', 'background-color': '#eab308' } },
    { selector: 'node.hovered', style: { 'border-width': 3, 'border-color': '#10b981' } },
    { selector: 'node.search-match', style: { 'border-width': 5, 'border-color': '#eab308', 'background-color': '#eab308', 'label': 'data(name)', 'z-index': 9999 } },
    { selector: 'node.lens-magnified', style: { 'width': 60, 'height': 60, 'label': 'data(name)', 'font-size': 14, 'z-index': 9999, 'border-width': 4, 'border-color': '#10b981', 'text-valign': 'center' } },
    { selector: 'edge', style: { 'width': 1, 'opacity': 0.15, 'curve-style': 'straight', 'line-color': '#bbb', 'target-arrow-shape': 'triangle' } },
    { selector: 'edge[weight < 0]', style: { 'line-color': '#d62728', 'target-arrow-shape': 'tee' } },
    { selector: 'edge[weight > 0]', style: { 'line-color': '#2ca02c' } }
  ], [maxBcValue]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const processedElements = useMemo(() => {
    if (!elements || !elements.nodes || !elements.edges) return [];

    const nMap = new Map();
    elements.nodes.forEach(n => nMap.set(n.data.id, n.data));

    const edgeMap = new Map();
    elements.edges.forEach(edge => {
      const edgeKey = `${edge.data.source}->${edge.data.target}`;
      const currentWeight = Math.abs(edge.data.weight || 0);
      if (!edgeMap.has(edgeKey) || Math.abs(edgeMap.get(edgeKey).data.weight || 0) < currentWeight) {
        edgeMap.set(edgeKey, edge);
      }
    });

    const filteredEdges = Array.from(edgeMap.values()).filter(edge => {
      const srcNode = nMap.get(edge.data.source);
      const tgtNode = nMap.get(edge.data.target);
      if (!srcNode || !tgtNode) return false;

      if (activeSenders[srcNode.celltype] === false) return false;
      if (activeReceivers[tgtNode.celltype] === false) return false;

      return (edge.data.weight || 0) >= weightThreshold;
    });

    const connectedNodeIds = new Set();
    filteredEdges.forEach(edge => {
      connectedNodeIds.add(edge.data.source);
      connectedNodeIds.add(edge.data.target);
    });

    let tfCount = 0, ligandCount = 0, receptorCount = 0;
    const nodesPerRow = 10; 
    const spacing = 55;    

    const positionedNodes = elements.nodes
      .filter(node => connectedNodeIds.has(node.data.id))
      .map(node => {
        const type = node.data.moltype;
        let x = 0, y = 0;

        if (type === 'TF') { 
          x = (tfCount % nodesPerRow) * spacing;
          y = Math.floor(tfCount / nodesPerRow) * spacing;
          tfCount++;
        } else if (type === 'ligand') { 
          x = 850 + (ligandCount % nodesPerRow) * spacing; 
          y = Math.floor(ligandCount / nodesPerRow) * spacing;
          ligandCount++;
        } else if (type === 'receptor') { 
          x = 1700 + (receptorCount % nodesPerRow) * spacing; 
          y = Math.floor(receptorCount / nodesPerRow) * spacing;
          receptorCount++;
        }

        const rawScore = node.data.betweenness_centrality || 0;
        const visualScore = Math.sqrt(rawScore);

        return { 
          ...node, 
          data: { ...node.data, visual_score: visualScore },
          position: { x, y } 
        };
      });

    return [...positionedNodes, ...filteredEdges];
  }, [elements, activeSenders, activeReceivers, weightThreshold]);

  useEffect(() => {
    if (cyRef.current && (!activeTab || activeTab === 'graph')) {
      const cy = cyRef.current;
      cy.nodes().removeClass('search-match');
    
      if (localSearch?.trim()) {
        const searchLower = localSearch.toLowerCase();
        const matches = cy.nodes().filter(node => {
          return (node.data('name') || '').toLowerCase().includes(searchLower) || (node.data('id') || '').toLowerCase().includes(searchLower);
        });

        if (matches.length > 0) {
          matches.addClass('search-match');
          cy.animate({ center: { eles: matches.first() }, zoom: 1.2 }, { duration: 450 });
        }
      }
    }
  }, [localSearch, activeTab]);

  useEffect(() => {
    if (cyRef.current && (!activeTab || activeTab === 'graph')) {
      const cy = cyRef.current;
      cy.fit(cy.elements(), 40);

      // --- ANALYTICAL LENS ---
      cy.on('mousemove', (event) => {
        if (!lensMode) return;
        
        const radius = 100;
        const mousePos = event.position;

        cy.nodes().removeClass('lens-magnified');

        const nodesInRadius = cy.nodes().filter(node => {
          const nodePos = node.position();
          const dx = nodePos.x - mousePos.x;
          const dy = nodePos.y - mousePos.y;
          return Math.sqrt(dx * dx + dy * dy) <= radius;
        });

        nodesInRadius.addClass('lens-magnified');
      });

      // --- HOVER LOGIC ---
      cy.on('mouseover', 'node', (event) => {
        const node = event.target;
        if (!node) return;
        
        const score = node.data('betweenness_centrality') || 0;

        if (lensMode) {
          setLensMetadata({
            id: node.data('id'),
            name: node.data('name'),
            moltype: node.data('moltype'),
            celltype: node.data('celltype'),
            metric: score.toFixed(4)
          });
        } else {
          node.addClass('hovered');
          setTooltip({
            x: event.renderedPosition.x, 
            y: event.renderedPosition.y,
            content: `<strong>Molecule:</strong> ${node.data('name')}<br/><strong>BC Centrality:</strong> ${score.toFixed(4)}`
          });
        }
      });

      // --- MOUSEOUT LOGIC ---
      cy.on('mouseout', 'node', (event) => {
        if (event.target) event.target.removeClass('hovered');
        setTooltip(null);
        setLensMetadata(null);
      });

      cy.on('mouseout', (event) => {
        if (event.target === cy && lensMode) {
          cy.nodes().removeClass('lens-magnified');
        }
      });

      // --- SELECTION / BRUSHING LOGIC ---
      const handleSelectionChange = () => {
        const selections = cy.nodes(':selected').map(node => {
          const nId = node.data('id');
          const interactions = node.connectedEdges().map(edge => {
            const isSrc = edge.data('source') === nId;
            const targetNode = isSrc ? edge.target() : edge.source();
            return {
              role: isSrc ? 'Outbound Target' : 'Inbound Source',
              name: targetNode.data('name') || targetNode.data('id'),
              type: targetNode.data('moltype'),
              cell: targetNode.data('celltype') || 'N/A'
            };
          });
          return {
            id: nId,
            name: node.data('name'),
            moltype: node.data('moltype'),
            celltype: node.data('celltype') || 'N/A',
            metric: (node.data('betweenness_centrality') || 0).toFixed(4),
            interactions
          };
        });
        setBrushedNodes(selections);
      };
      
      cy.on('select unselect boxselect', 'node', handleSelectionChange);
      
      return () => {
        cy.off('mouseover', 'node');
        cy.off('mouseout', 'node');
        cy.off('select unselect boxselect', 'node');
        cy.off('mousemove');
        cy.off('mouseout');
      };
    }
  }, [processedElements, activeTab, lensMode, setLensMetadata, setBrushedNodes]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <CytoscapeComponent 
        elements={processedElements} 
        style={{ width: '100%', height: '100%' }} 
        stylesheet={cyStylesheet} 
        layout={{ name: 'preset' }} 
        boxSelectionEnabled={true} 
        cy={(cy) => { cyRef.current = cy; }} 
      />
      {tooltip && !lensMode && (
        <div style={{ position: 'absolute', top: tooltip.y + 12, left: tooltip.x + 12, backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '11px', pointerEvents: 'none', zIndex: 1000 }} dangerouslySetInnerHTML={{ __html: tooltip.content }} />
      )}
    </div>
  );
}

export default NetworkOverview;
