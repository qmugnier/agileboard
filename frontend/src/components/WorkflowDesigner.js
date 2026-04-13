import React, { useCallback, useState, useEffect, useMemo } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  SmoothStepEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FiSave, FiRefreshCw, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { projectAPI } from '../services/api';

const TERMINAL_STATUSES = ['done'];
const START_STATUS = 'ready';

const StatusNode = ({ data }) => (
  <div
    className="px-4 py-2 rounded-lg border-2 text-white font-medium shadow-lg relative"
    style={{
      backgroundColor: data.color,
      borderColor: data.isTerminal ? '#DC2626' : 'rgba(0,0,0,0.2)',
      borderWidth: data.isTerminal ? '3px' : '2px',
    }}
  >
    <Handle type="target" position={Position.Top} />
    <div className="flex items-center gap-2">
      <span>{data.label}</span>
      {data.isTerminal && (
        <span className="text-xs bg-red-700 px-2 py-0.5 rounded font-bold">FINAL</span>
      )}
    </div>
    {data.isStart && (
      <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1.5 shadow-md border-2 border-white">
        <FiCheckCircle size={16} className="text-white" />
      </div>
    )}
    {data.isTerminal && (
      <div className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1.5 shadow-md border-2 border-white">
        <FiAlertCircle size={16} className="text-white" />
      </div>
    )}
    <Handle type="source" position={Position.Bottom} />
  </div>
);

const WorkflowDesigner = ({ projectId, projects, statuses, onWorkflowUpdate, setError }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [originalEdges, setOriginalEdges] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);

  // Log edges whenever they change
  useEffect(() => {
    console.log('Edges updated:', edges);
  }, [edges]);

  // Initialize nodes and edges from statuses and transitions
  useEffect(() => {
    if (!statuses || statuses.length === 0 || !projectId) return;

    const initializeWorkflow = async () => {
      // Create nodes from statuses
      const newNodes = statuses.map((status, index) => ({
        id: status.id.toString(),
        data: {
          label: status.status_name,
          color: status.color,
          isStart: status.status_name === START_STATUS,
          isTerminal: !!status.is_final || TERMINAL_STATUSES.includes(status.status_name),
        },
        position: {
          x: (index % 3) * 300,
          y: Math.floor(index / 3) * 200,
        },
        draggable: true,
        connectable: true,
        selectable: true,
      }));

      // Fetch transitions from API
      try {
        const transitionsRes = await projectAPI.getTransitions(projectId);
        const transitions = transitionsRes.data || [];
        
        const newEdges = transitions.map((transition) => {
          const fromStatus = statuses.find(s => s.id === transition.from_status_id);
          const toStatus = statuses.find(s => s.id === transition.to_status_id);
          return {
            id: transition.id,
            source: transition.from_status_id.toString(),
            target: transition.to_status_id.toString(),
            animated: true,
            markerEnd: { type: 'arrowclosed' },
            type: 'smoothstep',
            label: `${fromStatus?.status_name || 'Unknown'} → ${toStatus?.status_name || 'Unknown'}`,
            selectable: true,
            deletable: true,
            focusable: true,
            style: {
              stroke: '#3b82f6',
              strokeWidth: 4,
              cursor: 'pointer',
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            },
          };
        });

        setNodes(newNodes);
        setEdges(newEdges);
        setOriginalEdges(newEdges);
        setIsDirty(false);
        validateWorkflow(newEdges, newNodes);
      } catch (err) {
        console.error('Failed to load transitions:', err);
        setNodes(newNodes);
        setEdges([]);
        setOriginalEdges([]);
      }
    };

    initializeWorkflow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses, projectId]);

  // Validate workflow structure
  const validateWorkflow = useCallback((edges, nodeList) => {
    const errors = [];

    // Check if "ready" status exists and has outgoing connections
    const readyNode = nodeList.find(n => n.data.isStart);
    if (!readyNode) {
      errors.push('⚠️ Workflow must start with "ready" status');
    } else {
      const hasOutgoing = edges.some(e => e.source === readyNode.id);
      if (!hasOutgoing && nodeList.length > 1) {
        errors.push('⚠️ "ready" status should have outgoing transitions');
      }
    }

    // Check if terminal statuses exist and have no outgoing connections
    nodeList.forEach(node => {
      if (node.data.isTerminal) {
        const hasOutgoing = edges.some(e => e.source === node.id);
        if (hasOutgoing) {
          errors.push(`⚠️ Terminal status "${node.data.label}" should not have outgoing transitions`);
        }
      }
    });

    setValidationErrors(errors);
  }, []);

  // Handle edge changes from React Flow (user interactions)
  const handleEdgesChange = useCallback(
    (changes) => {
      console.log('Edge change event:', changes);
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  const nodeTypes = useMemo(() => ({
    default: StatusNode,
  }), []);

  const edgeTypes = useMemo(() => ({
    smoothstep: SmoothStepEdge,
  }), []);

  // Handle new connections with validation
  const onConnect = useCallback(
    (connection) => {
      console.log('Connection attempt:', connection);
      const sourceStatusId = parseInt(connection.source);
      const targetStatusId = parseInt(connection.target);
      const sourceNode = nodes.find(n => n.id === connection.source);

      // Validate connection
      if (sourceNode?.data.isTerminal) {
        setError('❌ Cannot create transition FROM final status. Final status "done" cannot have outgoing transitions.');
        return;
      }

      // Check if connection already exists
      const connectionExists = edges.some(
        e => e.source === connection.source && e.target === connection.target
      );

      if (connectionExists) {
        setError('This connection already exists');
        return;
      }

      // Create new edge
      const newEdge = {
        id: `${sourceStatusId}-${targetStatusId}`,
        source: connection.source,
        target: connection.target,
        animated: true,
        markerEnd: { type: 'arrowclosed' },
        type: 'smoothstep',
        label: `${sourceNode?.data.label || 'Unknown'} → ${nodes.find(n => n.id === connection.target)?.data.label || 'Unknown'}`,
        selectable: true,
        deletable: true,
        style: {
          stroke: '#3b82f6',
          strokeWidth: 3,
          cursor: 'pointer',
        },
      };

      console.log('Creating new edge:', newEdge);
      const newEdges = [...edges, newEdge];
      setEdges(newEdges);
      setIsDirty(true);
      validateWorkflow(newEdges, nodes);
    },
    [edges, setEdges, nodes, setError, validateWorkflow]
  );

  // Save workflow changes
  const handleSave = async () => {
    if (!projectId) {
      setError('No project selected');
      return;
    }

    if (validationErrors.length > 0) {
      setError('❌ Please fix workflow validation errors before saving');
      return;
    }

    setIsSaving(true);
    try {
      // Get transitions that need to be updated
      const edgesToAdd = edges.filter(
        e => !originalEdges.some(oe => oe.id === e.id)
      );
      const edgesToRemove = originalEdges.filter(
        e => !edges.some(ne => ne.id === e.id)
      );

      console.log('Saving workflow - Edges to add:', edgesToAdd);
      console.log('Saving workflow - Edges to remove:', edgesToRemove);

      // Add new transitions
      for (const edge of edgesToAdd) {
        const sourceId = parseInt(edge.source);
        const targetId = parseInt(edge.target);
        await projectAPI.createTransition(sourceId, targetId);
      }

      // Remove old transitions
      for (const edge of edgesToRemove) {
        const sourceId = parseInt(edge.source);
        const targetId = parseInt(edge.target);
        await projectAPI.deleteTransition(sourceId, targetId);
      }

      setOriginalEdges(edges);
      setIsDirty(false);
      setError('✓ Workflow updated successfully');
      setTimeout(() => setError(''), 3000);

      if (onWorkflowUpdate) {
        onWorkflowUpdate();
      }
    } catch (err) {
      console.error('Failed to update workflow:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to update workflow');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to original state
  const handleReset = () => {
    setEdges(originalEdges);
    setIsDirty(false);
    validateWorkflow(originalEdges, nodes);
  };

  // Handle edge deletion
  const handleEdgeDelete = useCallback((edgeId) => {
    setEdges(prevEdges => {
      const newEdges = prevEdges.filter(e => e.id !== edgeId);
      if (newEdges.length < prevEdges.length) {
        validateWorkflow(newEdges, nodes);
        setIsDirty(true);
      }
      return newEdges;
    });
  }, [nodes, validateWorkflow, setEdges]);

  // Handle keyboard events (Delete key to remove selected edges)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Find selected edges
        const selectedEdges = edges.filter(edge => edge.selected);
        if (selectedEdges.length > 0) {
          e.preventDefault();
          selectedEdges.forEach(edge => {
            handleEdgeDelete(edge.id);
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [edges, handleEdgeDelete]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Workflow Designer
          </h3>
          {projectId && projects && (
            <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-sm rounded">
              Project: {projects.find(p => p.id === projectId)?.name}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              disabled={!isDirty || isSaving}
              className={`px-3 py-2 rounded font-medium flex items-center gap-2 transition ${
                isDirty && !isSaving
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-400 dark:hover:bg-gray-500 cursor-pointer'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              <FiRefreshCw size={16} /> Reset
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving || validationErrors.length > 0}
              className={`px-3 py-2 rounded font-medium flex items-center gap-2 transition ${
                isDirty && !isSaving && validationErrors.length === 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              <FiSave size={16} /> {isSaving ? 'Saving...' : 'Save Workflow'}
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          🔗 <strong>Draw transitions:</strong> Click and drag from one status to another. <strong>Delete transitions:</strong> Click directly on any arrow to delete it (turns lighter). Then click "Save Workflow". <strong>Final statuses</strong> (marked with red "FINAL" badge) cannot have outgoing transitions.
        </p>
        {isDirty && (
          <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
            ⚠️ You have unsaved changes
          </p>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-700 space-y-1">
          {validationErrors.map((error, idx) => (
            <p key={idx} className="text-sm text-yellow-800 dark:text-yellow-200">
              {error}
            </p>
          ))}
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 relative">
        {statuses && statuses.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onEdgeClick={(event, edge) => {
              event.preventDefault();
              event.stopPropagation();
              handleEdgeDelete(edge.id);
            }}
            fitView
            minZoom={0.1}
            maxZoom={4}
          >
            <Background color="#aaa" gap={16} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            No statuses available. Create statuses first to design the workflow.
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-700 text-sm text-blue-900 dark:text-blue-100 space-y-2">
        <p><strong>💡 How to use:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Drag between statuses to create a workflow transition</li>
          <li><strong>Click on any blue arrow to delete it instantly</strong></li>
          <li>Or select an arrow and press Delete key</li>
        </ul>
        <p className="mt-2"><strong>📋 Workflow Rules:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>🟢 <strong>Start (ready):</strong> Workflow always starts with "ready" status</li>
          <li>🔴 <strong>End (done):</strong> Ends with terminal status "done" which cannot have outgoing transitions</li>
        </ul>
      </div>
    </div>
  );
};

export default WorkflowDesigner;
