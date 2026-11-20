import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Copy, MoreHorizontal, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NODE_CATALOG_MAP } from '../../constants/nodeCatalog';
import type { WorkflowNode } from '../../types/orchestrator';
import { formatDuration } from '../../utils/formatters';
import { NodeIcon } from '../common/NodeIcon';
import { StatusBadge } from '../common/StatusBadge';

export interface WorkflowNodeCallbacks {
  onDeleteNode?: (id: string) => void;
  onDuplicateNode?: (id: string) => void;
}

export function WorkflowNodeCard({
  id,
  data,
  selected,
}: NodeProps<WorkflowNode>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const meta = NODE_CATALOG_MAP[data.nodeType];

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  const handleCallbacks = (window as unknown as { __woplaNodeCallbacks?: WorkflowNodeCallbacks })
    .__woplaNodeCallbacks;

  const statusBorder =
    data.executionStatus === 'running'
      ? 'border-[#2563EB] ring-2 ring-[#DBEAFE]'
      : data.executionStatus === 'failed'
        ? 'border-[#DC2626] ring-2 ring-[#FEE2E2]'
        : data.executionStatus === 'completed'
          ? 'border-[#16A34A]'
          : selected
            ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20'
            : 'border-[#E5E7EB] hover:border-[#CBD5E1]';

  const outputHandles = meta?.outputHandles ?? [{ id: 'default' }];
  const hasMultipleOutputs = outputHandles.length > 1;

  return (
    <div
      className={`w-[248px] bg-white rounded-[12px] border transition-all shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] ${statusBorder} ${
        data.executionStatus === 'skipped' ? 'opacity-60' : ''
      }`}
    >
      {/* Top Category Accent Strip */}
      <div
        className="h-1.5 w-full rounded-t-[11px]"
        style={{ backgroundColor: meta?.accentColor ?? '#2563EB' }}
      />

      {/* Input Port */}
      {(meta?.hasInputHandle ?? true) && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-[#64748B] hover:!bg-[#2563EB]"
        />
      )}

      {/* Node Header (40px structured zone) */}
      <div className="px-3.5 pt-2.5 pb-2 border-b border-[#F1F5F9] flex items-center justify-between gap-2 relative">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
            style={{
              backgroundColor: `${meta?.accentColor ?? '#2563EB'}15`,
              color: meta?.accentColor ?? '#2563EB',
            }}
          >
            <NodeIcon name={meta?.iconName ?? 'Bot'} className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-[#0F172A] truncate leading-tight">
              {data.label}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#64748B]">
              {meta?.label ?? data.nodeType}
            </div>
          </div>
        </div>

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
            className="p-1 rounded-[6px] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
            aria-label="Node actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-7 z-30 w-36 bg-white border border-[#E5E7EB] rounded-[8px] shadow-md py-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  handleCallbacks?.onDuplicateNode?.(id);
                }}
                className="w-full px-3 py-1.5 text-left text-[12px] text-[#0F172A] hover:bg-[#F8FAFC] flex items-center gap-2"
              >
                <Copy className="w-3.5 h-3.5 text-[#64748B]" />
                Duplicate
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  handleCallbacks?.onDeleteNode?.(id);
                }}
                className="w-full px-3 py-1.5 text-left text-[12px] text-[#DC2626] hover:bg-[#FEE2E2]/50 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Node
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Node Body */}
      <div className="px-3.5 py-2.5 space-y-2">
        <p className="text-[12px] text-[#64748B] line-clamp-2 leading-snug">
          {data.description || meta?.shortDescription}
        </p>

        {/* Sub-metadata by type */}
        {data.config.model && (
          <div className="text-[11px] font-mono text-[#475569] bg-[#F8FAFC] border border-[#E5E7EB] rounded-[6px] px-2 py-1 truncate">
            {data.config.llmProvider ? `${data.config.llmProvider} · ` : ''}
            {data.config.model}
          </div>
        )}

        {data.config.endpointUrl && (
          <div className="text-[11px] font-mono text-[#475569] bg-[#F8FAFC] border border-[#E5E7EB] rounded-[6px] px-2 py-1 truncate">
            {data.config.httpMethod ?? 'GET'} {data.config.endpointUrl}
          </div>
        )}

        {data.nodeType === 'condition' && data.config.inputVariable && (
          <div className="text-[11px] font-mono text-[#475569] bg-[#F8FAFC] border border-[#E5E7EB] rounded-[6px] px-2 py-1 truncate">
            if {data.config.inputVariable} {data.config.operator} {data.config.comparisonValue}
          </div>
        )}

        {/* Execution Status Footer */}
        <div className="pt-1 flex items-center justify-between gap-2">
          <StatusBadge status={data.executionStatus} compact />
          {typeof data.lastDurationMs === 'number' && data.executionStatus !== 'idle' && (
            <span className="text-[11px] font-mono text-[#64748B] tabular-nums">
              {formatDuration(data.lastDurationMs)}
            </span>
          )}
        </div>
      </div>

      {/* Output Ports */}
      {outputHandles.map((handle, index) => {
        const topPercent = hasMultipleOutputs
          ? index === 0
            ? '35%'
            : '70%'
          : '50%';
        const handleColor =
          handle.id === 'true'
            ? '#16A34A'
            : handle.id === 'false'
              ? '#DC2626'
              : meta?.accentColor ?? '#2563EB';

        return (
          <div key={handle.id}>
            {handle.label && (
              <span
                className="absolute right-3.5 text-[10px] font-mono font-semibold pointer-events-none select-none"
                style={{ top: topPercent, transform: 'translateY(-50%)', color: handleColor }}
              >
                {handle.label}
              </span>
            )}
            <Handle
              id={handle.id}
              type="source"
              position={Position.Right}
              style={{ top: topPercent, backgroundColor: handleColor }}
              className="!w-3 !h-3"
            />
          </div>
        );
      })}
    </div>
  );
}
