function formatLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'number') return Number.isInteger(value) ? value : value.toFixed(4);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function MetadataRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '6px 0', borderBottom: '1px solid #eee', fontSize: '12px' }}>
      <span style={{ color: '#666', flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right', wordBreak: 'break-word' }}>{formatValue(value)}</span>
    </div>
  );
}

function MetadataSection({ title, data, exclude = [] }) {
  if (!data || Object.keys(data).length === 0) return null;

  const entries = Object.entries(data).filter(([key]) => !exclude.includes(key));

  return (
    <div style={{ marginBottom: '20px' }}>
      <p style={{ fontWeight: 'bold', fontSize: '13px', margin: '0 0 8px 0', color: '#334155' }}>{title}</p>
      <div style={{ backgroundColor: '#fff', borderRadius: '6px', padding: '4px 10px', border: '1px solid #e2e8f0' }}>
        {entries.map(([key, value]) => (
          <MetadataRow key={key} label={formatLabel(key)} value={value} />
        ))}
      </div>
    </div>
  );
}

function ConnectionList({ title, items, color }) {
  if (!items?.length) return null;

  return (
    <div style={{ marginBottom: '16px' }}>
      <p style={{ fontWeight: 'bold', fontSize: '12px', margin: '0 0 6px 0', color }}>
        {title} ({items.length})
      </p>
      <div style={{ maxHeight: '140px', overflowY: 'auto', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
        {items.map((item, index) => (
          <div key={`${item.id}-${index}`} style={{ padding: '8px 10px', borderBottom: index < items.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: '11px' }}>
            <div style={{ fontWeight: 600 }}>{item.name || item.id}</div>
            <div style={{ color: '#64748b', marginTop: '2px' }}>
              {item.moltype}{item.celltype ? ` · ${item.celltype}` : ''}
              {item.weight !== undefined ? ` · weight ${item.weight}` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SidebarMetadata({ selection }) {
  if (!selection) {
    return (
      <div style={{ padding: '20px' }}>
        <h2 style={{ borderBottom: '2px solid #ccc', paddingBottom: '10px', marginTop: 0 }}>Selection Details</h2>
        <p style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.5 }}>
          Click a node or edge in the graph to view its full metadata here.
        </p>
      </div>
    );
  }

  const { kind, data, connections, sourceNode, targetNode } = selection;
  const isNode = kind === 'node';

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ borderBottom: '2px solid #ccc', paddingBottom: '10px', marginTop: 0 }}>Selection Details</h2>

      <div style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 'bold',
        marginBottom: '16px',
        backgroundColor: isNode ? '#dbeafe' : '#fef3c7',
        color: isNode ? '#1d4ed8' : '#b45309'
      }}>
        {isNode ? 'Node' : 'Edge'}
      </div>

      {isNode && data.name && (
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>{data.name}</h3>
      )}

      {!isNode && (
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#0f172a' }}>
          {data.source} → {data.target}
        </h3>
      )}

      <MetadataSection title={isNode ? 'Node Metadata' : 'Edge Metadata'} data={data} exclude={['visual_score']} />

      {isNode && connections && (
        <>
          <ConnectionList title="Edges Away From Node" items={connections.outbound} color="#16a34a" />
          <ConnectionList title="Edges Toward Node" items={connections.inbound} color="#ea580c" />
        </>
      )}

      {!isNode && sourceNode && (
        <MetadataSection title="Source Node" data={sourceNode} exclude={['visual_score']} />
      )}

      {!isNode && targetNode && (
        <MetadataSection title="Target Node" data={targetNode} exclude={['visual_score']} />
      )}
    </div>
  );
}

export default SidebarMetadata;
