import React, { useMemo, useRef, useEffect, useState} from 'react';
import CytoscapeComponent from 'react-cytoscapejs';

function NetworkOverview({ elements }) {
  // Create a ref to control the Cytoscape canvas
  const cyRef = useRef(null);
  const isInitialized = useRef(false);
  const [tooltip, setTooltip] = useState(null)

  const positionedElements = useMemo(() => {
    return [... elements.nodes, ...elements.edges];
  }, [elements]);

    {/*let tfCount = 0, ligandCount = 0, receptorCount = 0;
    
    const nodes = elements.nodes.map(node => {
      const type = node.data.moltype;
      let x = 0, y = 0;
      const verticalSpacing = 100; 

      // Map into three distinct layer columns
      if (type === 'TF') { x = 100; y = (tfCount++) * verticalSpacing; } 
      else if (type === 'ligand') { x = 600; y = (ligandCount++) * verticalSpacing; } 
      else if (type === 'receptor') { x = 1100; y = (receptorCount++) * verticalSpacing; }

      return { ...node, position: { x, y } };
    });

    return [...nodes, ...elements.edges];
  }, [elements]);
  */}

  useEffect(() => {
    if (cyRef.current) {
      const cy = cyRef.current;

    if (!isInitialized.current) {
      cy.fit(cy.elements(), 50);
      isInitialized.current = true;
    }
      // Auto-fit the camera to the nodes on load
      //cy.fit(cy.elements(), 40); // 40px of padding around the edges
      

      // 2. E2 Hover Lens: Show names when the mouse touches a node
      cy.on('mouseover', 'node', (event) => {
        const node = event.target
        if (!node || typeof node.addClass !== 'function') return;

        node.addClass('hovered')

        setTooltip({
          x: event.originalEvent.offsetX,
          y: event.originalEvent.offsetY,
          content: `
            <strong>Node Details</strong><br/>
            Molecule: ${node.data('name') || node.data('id')}<br/>
            Type: ${node.data('moltype') || 'Unknown'}
          `
        });
      });
        
      
      cy.on('mouseout', 'node', (event) => {
        const node = event.target;
        if (node && typeof node.removeClass === 'function') {
          node.removeClass('hovered');
        }
        setTooltip(null);
      });

      cy.on('mouseover', 'edge', (event) => {
        const edge = event.target;
        if (!edge || typeof edge.addClass !== 'function') return;
        const weight = edge.data('weight') || 0;
        const effect = weight > 0 ? 'Promoting' : 'Inhibiting';

        const sourceNode = edge.source();
        const targetNode = edge.target();
        const sourceTriplet = `${sourceNode.data('name')} (${sourceNode.data('moltype')})`;
        const targetTriplet = `${targetNode.data('name')} (${targetNode.data('moltype')})`;

        edge.addClass('hovered-edge');

        setTooltip({
          x: event.originalEvent.offsetX,
          y: event.originalEvent.offsetY,
          content: `
            <strong>Interaction</strong><br/>
            Source: ${sourceTriplet}<br/>
            Target: ${targetTriplet}<br/>
            Weight: ${weight} (${effect})
          `
        });
      });

      cy.on('mouseout', 'edge', () => {
        const edge = event.target;
        if (edge && typeof edge.removeClass === 'function') {
          edge.removeClass('hovered-edge');
        }
        setTooltip(null);  
      });
      
      return () => cy.removeAllListeners();
    }
  }, [positionedElements]);


  const cyStylesheet = [
    {
      selector: 'node',
      style: {
        'width': '20', 
        'height': '20',
        
        // Label settings
        'label': '',
        'font-size': '16px',
        // E2 Semantic Zoom: Hides labels when zoomed out
        'min-zoomed-font-size': 8, 
        
        'text-valign': 'top',
        'text-halign': 'center',
        'text-margin-y': -4,
        'text-background-color': '#ffffff',
        'text-background-opacity': 0.8,
        'text-background-padding': '4px',
        'border-width': 1,
        'border-color': '#fff'
      }
    },
    // Distinct colors for the 3 Layers
    { selector: 'node[moltype = "TF"]', style: { 'background-color': '#ff7f0e' } },
    { selector: 'node[moltype = "ligand"]', style: { 'background-color': '#2ca02c' } },
    { selector: 'node[moltype = "receptor"]', style: { 'background-color': '#1f77b4' } },
    
    // E2 Hover State overrides
    {
      selector: 'node.hovered',
      style: {
        'label': 'data(name)', 
        'font-size': '14px',
        'text-valign': 'top',
        'text-halign': 'center',
        'text-margin-y': -6,
        'text-outline-width': 3,
        'z-index': 9999, // Brings the hovered node in front of edges
        'border-width': 3,
        'border-color': '#333'
      }
    },
    
    // Edge styles
    {
      selector: 'edge',
      style: {
        'width': 1,
        'line-color': '#ccc',
        'opacity': 0.15,
        'curve-style': 'straight', 
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#ccc'
      }
    },
    {
      selector: 'edge[weight < 0]',
      style: { 'line-color': '#d62728', 'target-arrow-color': '#d62728', 'line-style': 'dashed' }
    },
    {
      selector: 'edge.hovered-edge',
      style: {
        'opacity': 1,
        'width': 3,
        'z-index': 9998
      }
    }
  ];

  return (
  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <CytoscapeComponent
      elements={positionedElements}
      style={{ width: '100%', height: '100%' }}
      stylesheet={cyStylesheet}
      layout={{ 
        name: 'cose',
        animate: false,
        //animationDuration: 500,
        nodeRepulsion: 8000,
        idealEdgeLength: 100,
        edgeElasticity: 0.45 

      }}
      cy={(cy) => { 
        cyRef.current = cy; 
      }}
    />
    
    {tooltip && (
        <div style={{
          position: 'absolute',
          top: tooltip.y + 15,
          left: tooltip.x + 15,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #333',
          padding: '10px',
          borderRadius: '4px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          pointerEvents: 'none',
          zIndex: 100,
          fontSize: '12px',
          lineHeight: '1.4'
        }} dangerouslySetInnerHTML={{ __html: tooltip.content }} />
      )}
    </div>
  );
}

export default NetworkOverview;