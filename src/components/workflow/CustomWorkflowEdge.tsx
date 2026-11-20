import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { X } from 'lucide-react';
import type { WorkflowEdge } from '../../types/orchestrator';

export function CustomWorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<WorkflowEdge>) {
  const { setEdges } = useReactFlow();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const execState = data?.executionState ?? 'idle';

  const strokeColor =
    execState === 'failed'
      ? '#DC2626'
      : execState === 'completed'
        ? '#16A34A'
        : execState === 'active' || selected
          ? '#2563EB'
          : '#94A3B8';

  const strokeWidth = selected || execState !== 'idle' ? 2.5 : 1.75;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: execState === 'active' ? '6 4' : undefined,
        }}
      />
      {(data?.label || selected) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="flex items-center gap-1"
          >
            {data?.label && (
              <span
                className={`px-2 py-0.5 rounded-[6px] border text-[10px] font-mono font-semibold shadow-xs ${
                  data.branchType === 'true'
                    ? 'bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0]'
                    : data.branchType === 'false'
                      ? 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]'
                      : 'bg-white text-[#475569] border-[#E5E7EB]'
                }`}
              >
                {data.label}
              </span>
            )}
            {selected && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEdges((eds) => eds.filter((edge) => edge.id !== id));
                }}
                className="w-5 h-5 rounded-full bg-[#DC2626] text-white flex items-center justify-center shadow-sm hover:bg-[#B91C1C] transition-colors"
                title="Delete connection"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
