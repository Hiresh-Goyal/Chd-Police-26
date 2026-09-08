import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCases } from '../hooks/useCases';
import { createCase } from '../api/client';
import type { CaseAPI } from '../types/api';
import { PriorityBadge, StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

const formatDate = (value: string) => {
  return new Date(value).toLocaleDateString('en-IN');
};

const formatDateTime = (value: string) => {
  return new Date(value).toLocaleString('en-IN');
};

const displayStatus = (status: string) => {
  switch (status) {
    case 'OPEN':
      return 'Active';
    case 'IN_PROGRESS':
      return 'Under Review';
    case 'CLOSED':
      return 'Closed';
    case 'ARCHIVED':
      return 'Archived';
    default:
      return status;
  }
};

const displayPriority = (priority: string): Priority => {
  return priority.toUpperCase() as Priority;
};

export const MyCases: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    data: cases,
    loading: casesLoading,
    error: casesError,
  } = useCases();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);

  // New Case form state
  const [newCaseSubject, setNewCaseSubject] = useState('');
  const [newCasePriority, setNewCasePriority] =
    useState<Priority>('HIGH');
  const [newCaseAssignedIO, setNewCaseAssignedIO] = useState('');

  const filteredCases = cases.filter((c) => {
    const search = searchTerm.trim().toLowerCase();

    const matchesSearch =
      !search ||
      c.id.toLowerCase().includes(search) ||
      c.name.toLowerCase().includes(search) ||
      (c.assigned_io ?? '').toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === 'All' ||
      displayStatus(c.status) === statusFilter;

    const matchesPriority =
      priorityFilter === 'All' ||
      displayPriority(c.priority) === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleExportCSV = () => {
    const csvContent =
      'Case ID,Subject,Priority,Status,Entities,Assigned IO,Created At,Last Activity\n' +
      filteredCases
        .map(
          (c) =>
            `"${c.id}","${c.name}","${displayPriority(c.priority)}","${displayStatus(
              c.status
            )}",${c.entities_count},"${c.assigned_io ?? ''}","${formatDate(
              c.created_at
            )}","${formatDateTime(c.last_activity)}"`
        )
        .join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Rakshak_Setu_cases_export_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    showToast('Exported cases CSV successfully.', 'success');
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCaseSubject.trim()) {
      showToast('Please enter subject/entity name.', 'warning');
      return;
    }

    try {
      const created: CaseAPI = await createCase({
        name: newCaseSubject.trim(),
        title: newCaseSubject.trim(),
        description: '',
        priority: newCasePriority,
        assigned_io: newCaseAssignedIO.trim() || null,
      });

      setIsNewCaseModalOpen(false);
      setNewCaseSubject('');
      setNewCasePriority('HIGH');
      setNewCaseAssignedIO('');

      showToast(
        `Case #${created.id} created successfully.`,
        'success'
      );

      navigate(`/cases/${created.id}/upload-evidence`);
    } catch (err: any) {
      showToast(
        err?.message ?? 'Failed to create case.',
        'error'
      );
    }
  };

  if (casesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm text-[#64748B] font-mono">
          Loading cases...
        </div>
      </div>
    );
  }

  if (casesError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <span className="material-symbols-outlined text-3xl text-red-500">
          error
        </span>

        <p className="text-sm text-[#424751]">
          Failed to load cases.
        </p>

        <p className="text-xs text-[#64748B] font-mono">
          {casesError.message}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#191C1E] tracking-tight mb-1">
            My Cases
          </h1>

          <p className="text-sm text-[#424751]">
            Active investigations and cases assigned to your unit.
          </p>
        </div>

        <Button
          onClick={() => setIsNewCaseModalOpen(true)}
          icon="add"
          variant="primary"
          className="self-start sm:self-auto"
        >
          New Case
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded border border-[#D9E1EA] p-3 shadow-xs flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative max-w-xs w-full">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-[#64748B] text-[18px]">
              search
            </span>

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Case ID, subject, IO..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#F8FAFC] rounded border border-[#D9E1EA] text-sm focus:outline-none focus:border-[#0B5CAB] focus:ring-1 focus:ring-[#0B5CAB]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-3 bg-[#F8FAFC] rounded border border-[#D9E1EA] text-sm focus:outline-none focus:border-[#0B5CAB] cursor-pointer"
          >
            <option value="All">Status: All</option>
            <option value="Active">Active</option>
            <option value="Under Review">Under Review</option>
            <option value="Closed">Closed</option>
            <option value="Archived">Archived</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="py-1.5 px-3 bg-[#F8FAFC] rounded border border-[#D9E1EA] text-sm focus:outline-none focus:border-[#0B5CAB] cursor-pointer"
          >
            <option value="All">Priority: All</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* View Toggle & Export */}
        <div className="flex items-center gap-2.5">
          <div className="flex bg-[#F8FAFC] rounded border border-[#D9E1EA] overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-1.5 flex items-center justify-center transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#EFF6FF] text-[#0B5CAB]'
                  : 'text-[#64748B] hover:bg-slate-100'
              }`}
              title="List View"
            >
              <span className="material-symbols-outlined text-[18px]">
                list
              </span>
            </button>

            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 py-1.5 flex items-center justify-center border-l border-[#D9E1EA] transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#EFF6FF] text-[#0B5CAB]'
                  : 'text-[#64748B] hover:bg-slate-100'
              }`}
              title="Grid View"
            >
              <span className="material-symbols-outlined text-[18px]">
                grid_view
              </span>
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={filteredCases.length === 0}
            className="py-1.5 px-3 bg-[#F8FAFC] rounded border border-[#D9E1EA] font-mono text-xs font-semibold text-[#0B5CAB] hover:bg-[#EFF6FF] flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[16px]">
              download
            </span>

            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredCases.length === 0 ? (
        <div className="bg-white border border-[#D9E1EA] rounded shadow-xs flex flex-col items-center justify-center py-16 px-6">
          <span className="material-symbols-outlined text-4xl text-[#94A3B8] mb-3">
            folder_open
          </span>

          <h3 className="font-semibold text-[#191C1E] mb-1">
            No cases found
          </h3>

          <p className="text-sm text-[#64748B] text-center">
            {cases.length === 0
              ? 'Create a new investigation case to get started.'
              : 'No cases match the current search and filters.'}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* Case List Table */
        <div className="bg-white border border-[#D9E1EA] rounded shadow-xs overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-[#F5F7FA] border-b border-[#D9E1EA] text-[11px] font-bold text-[#424751] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Case ID</th>
                  <th className="py-2.5 px-4">Subject/Entity</th>
                  <th className="py-2.5 px-4">Priority</th>
                  <th className="py-2.5 px-4 text-center">
                    Entities
                  </th>
                  <th className="py-2.5 px-4">Created</th>
                  <th className="py-2.5 px-4">Last Activity</th>
                  <th className="py-2.5 px-4">Assigned IO</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#D9E1EA]/60">
                {filteredCases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/cases/${c.id}`)}
                    className="transition-colors cursor-pointer hover:bg-[#EFF6FF]/60 border-l-4 border-l-[#0B5CAB]/40 hover:border-l-[#0B5CAB]"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-[#0B5CAB]">
                      #{c.id}
                    </td>

                    <td className="py-3 px-4 font-medium text-[#191C1E]">
                      {c.name}
                    </td>

                    <td className="py-3 px-4">
                      <PriorityBadge
                        priority={displayPriority(c.priority)}
                      />
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-medium text-xs text-[#334155]">
                      {c.entities_count}
                    </td>

                    <td className="py-3 px-4 text-[#64748B] text-xs font-mono">
                      {formatDate(c.created_at)}
                    </td>

                    <td className="py-3 px-4 text-[#64748B] text-xs font-mono">
                      {formatDateTime(c.last_activity)}
                    </td>

                    <td className="py-3 px-4 text-[#191C1E] font-medium">
                      {c.assigned_io ?? 'Unassigned'}
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge
                        status={displayStatus(c.status)}
                      />
                    </td>

                    <td
                      className="py-3 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        to={`/cases/${c.id}`}
                        className="font-mono text-xs text-[#0B5CAB] hover:underline font-bold uppercase tracking-wider inline-flex items-center gap-1"
                      >
                        Analyze

                        <span className="material-symbols-outlined text-[14px]">
                          arrow_forward
                        </span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-2.5 border-t border-[#D9E1EA] bg-[#F8FAFC] flex justify-between items-center text-xs text-[#64748B]">
            <span>
              Showing {filteredCases.length} of {cases.length} cases
            </span>

            <span className="font-medium text-[#191C1E]">
              {cases.length} total
            </span>
          </div>
        </div>
      ) : (
        /* Case Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCases.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/cases/${c.id}`)}
              className="bg-white border border-[#D9E1EA] rounded-md p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-sm text-[#0B5CAB]">
                    #{c.id}
                  </span>

                  <PriorityBadge
                    priority={displayPriority(c.priority)}
                  />
                </div>

                <h3 className="font-semibold text-[#191C1E] text-base mb-3">
                  {c.name}
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs border-t border-b border-[#D9E1EA]/60 py-2.5 my-2">
                  <div>
                    <span className="text-[#64748B] block">
                      Assigned IO:
                    </span>

                    <span className="font-semibold text-[#191C1E]">
                      {c.assigned_io ?? 'Unassigned'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#64748B] block">
                      Entities:
                    </span>

                    <span className="font-mono font-bold text-[#191C1E]">
                      {c.entities_count} resolved
                    </span>
                  </div>

                  <div>
                    <span className="text-[#64748B] block">
                      Created:
                    </span>

                    <span className="font-mono font-semibold text-[#191C1E]">
                      {formatDate(c.created_at)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#64748B] block">
                      Last Activity:
                    </span>

                    <span className="font-mono font-semibold text-[#191C1E]">
                      {formatDateTime(c.last_activity)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <StatusBadge
                  status={displayStatus(c.status)}
                />

                <span className="text-xs font-mono text-[#0B5CAB] font-bold flex items-center gap-1">
                  Analyze

                  <span className="material-symbols-outlined text-[14px]">
                    arrow_forward
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Case Modal */}
      <Modal
        isOpen={isNewCaseModalOpen}
        onClose={() => setIsNewCaseModalOpen(false)}
        title="Create New Investigation Case"
        subtitle="Register a new investigation case into the unit registry."
        icon="create_new_folder"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsNewCaseModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={handleCreateCase}
            >
              Create Case
            </Button>
          </>
        }
      >
        <form
          onSubmit={handleCreateCase}
          className="space-y-4"
        >
          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-[#424751] uppercase mb-1">
              Primary Subject / Entity Name
            </label>

            <input
              type="text"
              required
              value={newCaseSubject}
              onChange={(e) =>
                setNewCaseSubject(e.target.value)
              }
              placeholder="e.g. Vikram Batra, Target_Beta_12, etc."
              className="w-full px-3 py-2 border border-[#D9E1EA] rounded text-sm focus:outline-none focus:border-[#0B5CAB]"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold text-[#424751] uppercase mb-1">
              Priority Tier
            </label>

            <select
              value={newCasePriority}
              onChange={(e) =>
                setNewCasePriority(
                  e.target.value as Priority
                )
              }
              className="w-full px-3 py-2 border border-[#D9E1EA] rounded text-sm focus:outline-none focus:border-[#0B5CAB]"
            >
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Assigned IO */}
          <div>
            <label className="block text-xs font-bold text-[#424751] uppercase mb-1">
              Assigned Investigating Officer
            </label>

            <input
              type="text"
              value={newCaseAssignedIO}
              onChange={(e) =>
                setNewCaseAssignedIO(e.target.value)
              }
              placeholder="e.g. sentinel_inv"
              className="w-full px-3 py-2 border border-[#D9E1EA] rounded text-sm focus:outline-none focus:border-[#0B5CAB]"
            />

            <p className="mt-1 text-[11px] text-[#64748B]">
              Leave blank if the case is currently unassigned.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
};
