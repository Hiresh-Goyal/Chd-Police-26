import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ALL_CASES, CaseSummary } from '../data/mockData';
import { useCaseStore } from '../context/CaseStore';
import { PriorityBadge, StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const MyCases: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { cases, addCase } = useCaseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);

  // New Case form state
  const [newCaseSubject, setNewCaseSubject] = useState('');
  const [newCaseType, setNewCaseType] = useState('Investment Scam');
  const [newCasePriority, setNewCasePriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');

  // Filtered cases
  const filteredCases = cases.filter(c => {
    const matchesSearch =
      c.id.includes(searchTerm) ||
      c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || c.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleExportCSV = () => {
    const csvContent =
      'Case ID,Subject,Type,Priority,Status,Entities,Assigned IO,Last Activity\n' +
      filteredCases.map(c => `"${c.id}","${c.subject}","${c.type}","${c.priority}","${c.status}",${c.entitiesCount},"${c.assignedIO}","${c.lastActivity}"`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rakshak Setu_cases_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported cases CSV successfully.', 'success');
  };

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseSubject.trim()) {
      showToast('Please enter subject/entity name.', 'warning');
      return;
    }
    const newId = (2848 + cases.filter(c => c.id !== '2847').length + Math.floor(Math.random() * 10)).toString();
    const createdCase: CaseSummary = {
      id: newId,
      title: `${newCaseType} — ${newCaseSubject}`,
      subject: newCaseSubject,
      type: newCaseType,
      status: 'Active',
      priority: newCasePriority,
      openedDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      assignedIO: 'Amrit Singh',
      ioRole: 'Senior Inspector',
      ioStation: 'Sector 17, Chandigarh UT',
      fraudScore: 65,
      estimatedLoss: '₹2,00,000',
      entitiesCount: 1,
      lastActivity: 'Just now',
      stats: { cdr: 0, bank: 0, social: 0, ipdr: 0, anomalies: 0, evidence: 0 },
      entities: [],
      notes: [],
      alerts: []
    };

    addCase(createdCase);
    setIsNewCaseModalOpen(false);
    setNewCaseSubject('');
    showToast(`Case #${newId} created — upload evidence to begin analysis.`, 'success');
    // Navigate directly to upload page so user can start ingesting files
    navigate(`/cases/${newId}/upload-evidence`);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#191C1E] tracking-tight mb-1">My Cases</h1>
          <p className="text-sm text-[#424751]">Active investigations and cases assigned to your unit.</p>
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
          {/* Search Box */}
          <div className="relative max-w-xs w-full">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-[#64748B] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by Case ID, suspect..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#F8FAFC] rounded border border-[#D9E1EA] text-sm focus:outline-none focus:border-[#0B5CAB] focus:ring-1 focus:ring-[#0B5CAB]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="py-1.5 px-3 bg-[#F8FAFC] rounded border border-[#D9E1EA] text-sm focus:outline-none focus:border-[#0B5CAB] cursor-pointer"
          >
            <option value="All">Status: All</option>
            <option value="Active">Active</option>
            <option value="Under Review">Under Review</option>
            <option value="Pending">Pending</option>
            <option value="Closed">Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="py-1.5 px-3 bg-[#F8FAFC] rounded border border-[#D9E1EA] text-sm focus:outline-none focus:border-[#0B5CAB] cursor-pointer"
          >
            <option value="All">Priority: All</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Date Range Simulation */}
          <button
            onClick={() => showToast('Date Range filter active: Last 30 days', 'info')}
            className="py-1.5 px-3 bg-[#F8FAFC] rounded border border-[#D9E1EA] text-sm hover:bg-slate-100 flex items-center gap-1.5 transition-colors text-[#334155]"
          >
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            <span>Date Range</span>
          </button>
        </div>

        {/* View Toggle & Export */}
        <div className="flex items-center gap-2.5">
          <div className="flex bg-[#F8FAFC] rounded border border-[#D9E1EA] overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-1.5 flex items-center justify-center transition-colors ${
                viewMode === 'list' ? 'bg-[#EFF6FF] text-[#0B5CAB]' : 'text-[#64748B] hover:bg-slate-100'
              }`}
              title="List View"
            >
              <span className="material-symbols-outlined text-[18px]">list</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 py-1.5 flex items-center justify-center border-l border-[#D9E1EA] transition-colors ${
                viewMode === 'grid' ? 'bg-[#EFF6FF] text-[#0B5CAB]' : 'text-[#64748B] hover:bg-slate-100'
              }`}
              title="Grid View"
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="py-1.5 px-3 bg-[#F8FAFC] rounded border border-[#D9E1EA] font-mono text-xs font-semibold text-[#0B5CAB] hover:bg-[#EFF6FF] flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Cases Content */}
      {viewMode === 'list' ? (
        /* Case List Table */
        <div className="bg-white border border-[#D9E1EA] rounded shadow-xs overflow-hidden flex flex-col">


          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-[#F5F7FA] border-b border-[#D9E1EA] text-[11px] font-bold text-[#424751] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Case ID</th>
                  <th className="py-2.5 px-4">Subject/Entity</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Priority</th>
                  <th className="py-2.5 px-4 text-center">Entities</th>
                  <th className="py-2.5 px-4">Last Activity</th>
                  <th className="py-2.5 px-4">Assigned IO</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E1EA]/60">
                {filteredCases.map(c => {
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/cases/${c.id}`)}
                      className="transition-colors cursor-pointer hover:bg-[#EFF6FF]/60 border-l-4 border-l-[#0B5CAB]/40 hover:border-l-[#0B5CAB]"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#0B5CAB]">
                        #{c.id}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#191C1E]">
                        {c.subject}
                      </td>
                      <td className="py-3 px-4 text-[#424751]">{c.type}</td>
                      <td className="py-3 px-4">
                        <PriorityBadge priority={c.priority} />
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-xs text-[#334155]">
                        {c.entitiesCount}
                      </td>
                      <td className="py-3 px-4 text-[#64748B] text-xs font-mono">{c.lastActivity}</td>
                      <td className="py-3 px-4 text-[#191C1E] font-medium">{c.assignedIO}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <Link
                          to={`/cases/${c.id}`}
                          className="font-mono text-xs text-[#0B5CAB] hover:underline font-bold uppercase tracking-wider inline-flex items-center gap-1"
                        >
                          Analyze
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination bar */}
          <div className="px-4 py-2.5 border-t border-[#D9E1EA] bg-[#F8FAFC] flex justify-between items-center text-xs text-[#64748B]">
            <span>Showing {filteredCases.length} of {cases.length} cases</span>
            <div className="flex items-center gap-2">
              <button disabled className="p-1 rounded hover:bg-slate-200 disabled:opacity-40">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <span className="font-medium text-[#191C1E]">Page 1 of 1</span>
              <button disabled className="p-1 rounded hover:bg-slate-200 disabled:opacity-40">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Case Cards Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCases.map(c => {
            const isPrimary = c.id === '2847';
            return (
              <div
                key={c.id}
                onClick={() => navigate(`/cases/${c.id}`)}
                className={`bg-white border rounded-md p-4 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
                  isPrimary ? 'border-[#0B5CAB] ring-1 ring-[#0B5CAB]/20' : 'border-[#D9E1EA]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-sm text-[#0B5CAB]">#{c.id}</span>
                    <PriorityBadge priority={c.priority} />
                  </div>
                  <h3 className="font-semibold text-[#191C1E] text-base mb-1">{c.subject}</h3>
                  <div className="text-xs text-[#424751] mb-3">{c.type}</div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-[#D9E1EA]/60 py-2.5 my-2">
                    <div>
                      <span className="text-[#64748B] block">Assigned IO:</span>
                      <span className="font-semibold text-[#191C1E]">{c.assignedIO}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block">Entities:</span>
                      <span className="font-mono font-bold text-[#191C1E]">{c.entitiesCount} tracked</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <StatusBadge status={c.status} />
                  <span className="text-xs font-mono text-[#0B5CAB] font-bold flex items-center gap-1">
                    Analyze <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Case Modal */}
      <Modal
        isOpen={isNewCaseModalOpen}
        onClose={() => setIsNewCaseModalOpen(false)}
        title="Create New Investigation Case"
        subtitle="Register a new cyber or financial inquiry into the unit registry."
        icon="create_new_folder"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsNewCaseModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateCase}>
              Create Case
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateCase} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#424751] uppercase mb-1">
              Primary Subject / Entity Name
            </label>
            <input
              type="text"
              required
              value={newCaseSubject}
              onChange={e => setNewCaseSubject(e.target.value)}
              placeholder="e.g. Vikram Batra, Target_Beta_12, etc."
              className="w-full px-3 py-2 border border-[#D9E1EA] rounded text-sm focus:outline-none focus:border-[#0B5CAB]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#424751] uppercase mb-1">
                Investigation Type
              </label>
              <select
                value={newCaseType}
                onChange={e => setNewCaseType(e.target.value)}
                className="w-full px-3 py-2 border border-[#D9E1EA] rounded text-sm focus:outline-none focus:border-[#0B5CAB]"
              >
                <option value="Investment Scam">Investment Scam</option>
                <option value="Mule Account">Mule Account</option>
                <option value="Cyber Intrusion">Cyber Intrusion</option>
                <option value="SIM Swap">SIM Swap</option>
                <option value="Digital Arrest">Digital Arrest</option>
                <option value="Data Breach">Data Breach</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#424751] uppercase mb-1">
                Priority Tier
              </label>
              <select
                value={newCasePriority}
                onChange={e => setNewCasePriority(e.target.value as any)}
                className="w-full px-3 py-2 border border-[#D9E1EA] rounded text-sm focus:outline-none focus:border-[#0B5CAB]"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#424751] uppercase mb-1">
              Assigned Investigating Officer
            </label>
            <input
              type="text"
              disabled
              value="Insp. Amrit Singh (ID: 1042) — Sector 17 Unit"
              className="w-full px-3 py-2 bg-slate-100 border border-[#D9E1EA] rounded text-sm text-[#64748B]"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
