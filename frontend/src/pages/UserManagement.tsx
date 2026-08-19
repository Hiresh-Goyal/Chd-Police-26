import React, { useState } from 'react';
import { SYSTEM_USERS, UserOfficer } from '../data/mockData';
import { StatusBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';

export const UserManagement: React.FC = () => {
  const { showToast } = useToast();

  const [users, setUsers] = useState<UserOfficer[]>(SYSTEM_USERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // Form states
  const [newUserName, setNewUserName] = useState('');
  const [newUserRank, setNewUserRank] = useState('Sub-Inspector');
  const [newUserUnit, setNewUserUnit] = useState('Cyber Cell');
  const [newUserRole, setNewUserRole] = useState<'Investigator' | 'Analyst' | 'Lead Investigator' | 'Admin'>('Investigator');

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.badgeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.rank.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUnit = !unitFilter || u.unit.toLowerCase().includes(unitFilter.toLowerCase());
    return matchesSearch && matchesUnit;
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    const idNum = Math.floor(Math.random() * 9000) + 1000;
    const newUser: UserOfficer = {
      id: `usr_${idNum}`,
      badgeId: `ID: ${idNum}`,
      name: newUserName.trim(),
      rank: newUserRank,
      unit: newUserUnit,
      station: 'Sector 17, Chandigarh UT',
      email: `${newUserName.toLowerCase().replace(/\s+/g, '.')}@chdpolice.gov.in`,
      role: newUserRole,
      status: 'ACTIVE',
      mfaEnabled: true,
      activeSessions: 0,
      auditCount24h: 0
    };

    setUsers([...users, newUser]);
    setIsAddUserModalOpen(false);
    setNewUserName('');
    showToast(`Personnel ${newUser.name} provisioned with role ${newUser.role}.`, 'success');
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#0B2340] tracking-tight mb-1">
            User Management
          </h1>
          <p className="text-sm text-[#424751] max-w-2xl">
            Manage department personnel, role-based access credentials, and multi-factor authorization for Rakshak Setu.
          </p>
        </div>

        <Button
          variant="primary"
          icon="person_add"
          onClick={() => setIsAddUserModalOpen(true)}
          className="self-start sm:self-auto"
        >
          Add New User
        </Button>
      </div>



      {/* Search & Filter Bar */}
      <div className="bg-white border border-[#D9E1EA] rounded-md p-3.5 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by Name, Rank, or Badge ID..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#D9E1EA] rounded text-sm focus:outline-none focus:border-[#0B5CAB]"
          />
        </div>

        <div className="flex gap-2.5 w-full sm:w-auto">
          <select
            value={unitFilter}
            onChange={e => setUnitFilter(e.target.value)}
            className="w-full sm:w-44 bg-white border border-[#D9E1EA] rounded px-3 py-1.5 text-xs font-medium cursor-pointer"
          >
            <option value="">All Units</option>
            <option value="cyber">Cyber Cell</option>
            <option value="surveillance">Technical Surveillance</option>
            <option value="forensic">Digital Forensics</option>
            <option value="hq">Headquarters</option>
          </select>
        </div>
      </div>

      {/* Users Directory Table */}
      <div className="bg-white border border-[#D9E1EA] rounded-md shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-[#F5F7FA] border-b border-[#D9E1EA] text-[11px] font-bold text-[#424751] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Officer Name & Badge</th>
                <th className="py-3 px-4">Unit & Station</th>
                <th className="py-3 px-4">Role Permissions</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">MFA</th>
                <th className="py-3 px-4 text-right">24h Audit Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF0F4] text-xs">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3 px-4 font-medium text-[#191C1E]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded bg-[#0B2340] text-white font-bold flex items-center justify-center text-[10px]">
                        {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-[#191C1E]">{u.name}</div>
                        <div className="text-[11px] text-[#64748B] font-mono">{u.rank} • {u.badgeId}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-[#424751]">
                    <div>{u.unit}</div>
                    <div className="text-[11px] text-[#64748B]">{u.station}</div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#EFF6FF] text-[#0B5CAB] font-mono text-[11px] font-bold border border-[#0B5CAB]/20">
                      {u.role}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <StatusBadge status={u.status} />
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]" title="MFA Active">
                      verified_user
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-bold text-[#191C1E]">
                    {u.auditCount24h} logs
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => showToast(`Audit trail filtered for officer ${u.name}.`, 'info')}
                      className="text-[#0B5CAB] hover:underline font-mono text-xs font-semibold"
                    >
                      Audit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title="Provision Department Personnel"
        subtitle="Grant role-based credentials for Rakshak Setu platform access."
        icon="person_add"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddUserModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddUser}>
              Provision User
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddUser} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-[#424751] mb-1">Full Officer Name</label>
            <input
              type="text"
              required
              value={newUserName}
              onChange={e => setNewUserName(e.target.value)}
              placeholder="e.g. Jaspreet Singh"
              className="w-full px-3 py-2 border border-[#D9E1EA] rounded text-xs focus:outline-none focus:border-[#0B5CAB]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#424751] mb-1">Rank / Designation</label>
              <select
                value={newUserRank}
                onChange={e => setNewUserRank(e.target.value)}
                className="w-full px-3 py-2 border border-[#D9E1EA] rounded text-xs focus:outline-none focus:border-[#0B5CAB]"
              >
                <option value="Inspector">Inspector</option>
                <option value="Senior Inspector">Senior Inspector</option>
                <option value="Sub-Inspector">Sub-Inspector</option>
                <option value="DSP">DSP (Deputy Superintendent)</option>
                <option value="Senior Analyst">Senior Analyst</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#424751] mb-1">Assigned Role</label>
              <select
                value={newUserRole}
                onChange={e => setNewUserRole(e.target.value as any)}
                className="w-full px-3 py-2 border border-[#D9E1EA] rounded text-xs focus:outline-none focus:border-[#0B5CAB]"
              >
                <option value="Investigator">Investigator</option>
                <option value="Lead Investigator">Lead Investigator</option>
                <option value="Analyst">Analyst</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#424751] mb-1">Department Unit</label>
            <input
              type="text"
              value={newUserUnit}
              onChange={e => setNewUserUnit(e.target.value)}
              placeholder="e.g. Cyber Crime Unit, Narcotics, etc."
              className="w-full px-3 py-2 border border-[#D9E1EA] rounded text-xs focus:outline-none focus:border-[#0B5CAB]"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
