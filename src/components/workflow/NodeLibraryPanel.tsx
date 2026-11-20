import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';
import { useMemo, useState, type DragEvent } from 'react';
import { NODE_CATALOG, NODE_CATEGORY_META, type NodeCatalogEntry } from '../../constants/nodeCatalog';
import type { NodeCategory, NodeTypeId } from '../../types/orchestrator';
import { NodeIcon } from '../common/NodeIcon';

const CATEGORIES: NodeCategory[] = ['core', 'ai', 'tool', 'logic', 'data'];

interface NodeLibraryPanelProps {
  onAddNode: (nodeType: NodeTypeId) => void;
}

export function NodeLibraryPanel({ onAddNode }: NodeLibraryPanelProps) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<NodeCategory, boolean>>({
    core: true,
    ai: true,
    tool: true,
    logic: true,
    data: true,
  });

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map: Record<NodeCategory, NodeCatalogEntry[]> = {
      core: [],
      ai: [],
      tool: [],
      logic: [],
      data: [],
    };
    NODE_CATALOG.forEach((entry) => {
      if (
        !q ||
        entry.label.toLowerCase().includes(q) ||
        entry.shortDescription.toLowerCase().includes(q) ||
        entry.category.toLowerCase().includes(q)
      ) {
        map[entry.category].push(entry);
      }
    });
    return map;
  }, [search]);

  const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: NodeTypeId) => {
    event.dataTransfer.setData('application/wopla-node-type', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 bg-white border-r border-[#E5E7EB] flex flex-col h-full shrink-0 select-none">
      <div className="p-3 border-b border-[#E5E7EB] space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-[#0F172A]">Node Library</h2>
          <span className="text-[11px] font-mono text-[#64748B]">{NODE_CATALOG.length} nodes</span>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="w-full h-8 pl-8 pr-2.5 rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] text-[12px] text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#2563EB]"
          />
        </div>
        <p className="text-[11px] text-[#64748B]">
          Drag onto canvas or click <span className="font-semibold text-[#0F172A]">+</span> to add.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
        {CATEGORIES.map((cat) => {
          const items = grouped[cat];
          if (items.length === 0) return null;
          const catMeta = NODE_CATEGORY_META[cat];
          const isOpen = expandedCategories[cat] || search.trim().length > 0;

          return (
            <div key={cat} className="space-y-1">
              <button
                type="button"
                onClick={() =>
                  setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }))
                }
                className="w-full flex items-center justify-between px-2 py-1 rounded-[6px] hover:bg-[#F8FAFC] text-left"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  {catMeta.label} ({items.length})
                </span>
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
                )}
              </button>

              {isOpen && (
                <div className="space-y-1">
                  {items.map((item) => (
                    <div
                      key={item.nodeType}
                      draggable
                      onDragStart={(e) => onDragStart(e, item.nodeType)}
                      onClick={() => onAddNode(item.nodeType)}
                      className="group p-2 rounded-[8px] border border-transparent hover:border-[#E5E7EB] hover:bg-[#F8FAFC] cursor-grab active:cursor-grabbing flex items-start gap-2.5 transition-colors"
                    >
                      <div
                        className="w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          backgroundColor: `${item.accentColor}15`,
                          color: item.accentColor,
                        }}
                      >
                        <NodeIcon name={item.iconName} className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[12px] font-medium text-[#0F172A] truncate">
                            {item.label}
                          </span>
                          <Plus className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#2563EB] shrink-0" />
                        </div>
                        <p className="text-[11px] text-[#64748B] line-clamp-1">
                          {item.shortDescription}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
