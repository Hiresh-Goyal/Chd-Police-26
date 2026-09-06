import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';
import { apiClient } from '../api/client';

export const UserManagement: React.FC = () => {
  const { showToast } = useToast();
  const role = localStorage.getItem('ds_role');
  const isAdmin = role === 'admin';

  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isAdmin) {
      apiClient.getUsers()
        .then(data => setUsers(data || []))
        .catch(() => showToast('Failed to load users', 'error'))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleDeactivate = async (userId: string) => {
    try {
      await apiClient.deactivateUser(userId);
      setUsers(u => u.map(x => x.id === userId ? { ...x, is_active: false } : x));
      showToast('User deactivated.', 'success');
    } catch {
      showToast('Failed to deactivate user.', 'error');
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      await apiClient.updateUserRole(userId, newRole);
      setUsers(u => u.map(x => x.id === userId ? { ...x, role: newRole } : x));
      showToast(`Role updated to ${newRole}.`, 'success');
    } catch {
      showToast('Failed to update role.', 'error');
    }
  };

  const filteredUsers = users.filter(u =>
    !searchTerm ||
    (u.username || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <span className="material-symbols-outlined text-5xl text-[#CBD5E1]">lock</span>
        <div className="text-center">
          <p className="font-bold text-[#0B2340]">Access Restricted</p>
          <p className="text-sm text-[#64748B] mt-1">User management requires Admin privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <header className="border-b border-[#D9E1EA] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2340] tracking-tight">User Management</h1>
          <p className="text-sm text-[#424751] mt-0.5">
            Manage officer accounts and access levels. Admin only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search username..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="border border-[#D9E1EA] rounded px-3 py-1.5 text-sm outline-none focus:border-[#0B5CAB] w-52"
          />
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <span className="text-[#64748B] text-sm">Loading users...</span>
        </div>
      ) : (
        <div className="bg-white border border-[#D9E1EA] rounded-md shadow-xs overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#D9E1EA] text-[10px] uppercase tracking-wider text-[#64748B]">
                <th className="px-4 py-2.5 text-left">Username</th>
                <th className="px-4 py-2.5 text-left">Role</th>
                <th className="px-4 py-2.5 text-left">Status</th>
                <th className="px-4 py-2.5 text-left">Created</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF0F4]">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#191C1E]">{user.username}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={e => handleRoleUpdate(user.id, e.target.value)}
                      className="text-xs border border-[#D9E1EA] rounded px-1.5 py-0.5 bg-white"
                    >
                      <option value="admin">Admin</option>
                      <option value="investigator">Investigator</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {user.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#64748B] font-mono">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.is_active && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDeactivate(user.id)}
                      >
                        Deactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#64748B] text-sm">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
