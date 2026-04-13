import React, { useState, useEffect } from 'react';
import { teamMemberAPI, configAPI } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { FiTrash2, FiCheck, FiX, FiPlus, FiSearch, FiToggleLeft, FiToggleRight, FiLock } from 'react-icons/fi';
import clsx from 'clsx';

// Fallback defaults if API fails or data not available
const DEFAULT_ROLES = ['Engineer', 'Senior Engineer', 'Staff Engineer', 'Architect', 'Product Manager', 'QA', 'QA Lead', 'DevOps', 'Scrum Master'];
const DEFAULT_DEPARTMENTS = ['Backend', 'Frontend', 'Full Stack', 'DevOps', 'QA', 'Product', 'Design'];
const DEFAULT_POSITIONS = ['Junior', 'Mid-level', 'Senior', 'Lead', 'Principal'];

const PasswordResetModal = ({ member, onSubmit, onCancel, loading }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const validatePassword = (pwd) => {
    const errors = [];
    if (pwd.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(pwd)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(pwd)) errors.push('One lowercase letter');
    if (!/\d/.test(pwd)) errors.push('One number');
    if (!/[!@#$%^&*(),.?":{}<>|]/.test(pwd)) errors.push('One special character (!@#$%^&*(),.?":{}|<>)');
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Both fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const validationErrors = validatePassword(password);
    if (validationErrors.length > 0) {
      setError('Password must include: ' + validationErrors.join(', '));
      return;
    }

    onSubmit(password);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Reset Password for {member?.name}</h3>

        <form onSubmit={handleSubmit}>
          {error && <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm">{error}</div>}

          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">Password Requirements:</p>
            <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
              <li>✓ Minimum 8 characters</li>
              <li>✓ At least one UPPERCASE letter</li>
              <li>✓ At least one lowercase letter</li>
              <li>✓ At least one number (0-9)</li>
              <li>✓ At least one special character (!@#$%^&*(),.?":{}|&lt;&gt;)</li>
            </ul>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              disabled={loading}
              autoFocus
            />
            {password && (
              <div className="mt-2 space-y-1">
                <p className={`text-xs ${password.length >= 8 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {password.length >= 8 ? '✓' : '○'} At least 8 characters
                </p>
                <p className={`text-xs ${/[A-Z]/.test(password) ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {/[A-Z]/.test(password) ? '✓' : '○'} Uppercase letter
                </p>
                <p className={`text-xs ${/[a-z]/.test(password) ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {/[a-z]/.test(password) ? '✓' : '○'} Lowercase letter
                </p>
                <p className={`text-xs ${/\d/.test(password) ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {/\d/.test(password) ? '✓' : '○'} Number
                </p>
                <p className={`text-xs ${/[!@#$%^&*(),.?":{}<>|]/.test(password) ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {/[!@#$%^&*(),.?":{}<>|]/.test(password) ? '✓' : '○'} Special character
                </p>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              disabled={loading}
            />
            {password && confirmPassword && (
              <p className={`text-xs mt-1 ${password === confirmPassword ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditableCell = ({ value, onChange, onCancel, type = 'text', options = [] }) => {
  const [localValue, setLocalValue] = useState(value || '');

  const handleSave = () => {
    onChange(localValue);
  };

  if (type === 'select' && options.length) {
    return (
      <div className="flex gap-1 items-center">
        <select
          autoFocus
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          className="px-2 py-1 border border-blue-400 rounded bg-blue-50 dark:bg-blue-900/30 text-sm"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <button onClick={handleSave} className="text-green-600 hover:text-green-700 dark:text-green-400" title="Save">
          <FiCheck size={16} />
        </button>
        <button onClick={onCancel} className="text-red-600 hover:text-red-700 dark:text-red-400" title="Cancel">
          <FiX size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-1 items-center">
      <input
        autoFocus
        type={type}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="px-2 py-1 border border-blue-400 rounded bg-blue-50 dark:bg-blue-900/30 text-sm flex-1"
      />
      <button onClick={handleSave} className="text-green-600 hover:text-green-700 dark:text-green-400" title="Save">
        <FiCheck size={16} />
      </button>
      <button onClick={onCancel} className="text-red-600 hover:text-red-700 dark:text-red-400" title="Cancel">
        <FiX size={16} />
      </button>
    </div>
  );
};

const TeamMemberRow = ({ member, onEdit, onDelete, onToggleActive, onResetPassword, isDark, roles = [], positions = [], departments = [] }) => {
  const [editingField, setEditingField] = useState(null);

  const handleEditCell = async (field, value) => {
    try {
      await onEdit(member.id, { [field]: value });
      setEditingField(null);
    } catch (err) {
      alert(`Failed to update ${field}: ${err.message}`);
    }
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-100' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-100';
  };

  const statusText = member.is_active ? 'Active' : 'Inactive';

  return (
    <tr className={clsx('border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition')}>
      {/* Name */}
      <td className="px-4 py-3">
        {editingField === 'name' ? (
          <EditableCell
            value={member.name}
            onChange={(val) => handleEditCell('name', val)}
            onCancel={() => setEditingField(null)}
          />
        ) : (
          <div className="flex items-center gap-3">
            {member.avatar && (
              <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full" />
            )}
            <div className="font-medium text-gray-900 dark:text-white cursor-pointer hover:text-blue-600" onClick={() => setEditingField('name')}>
              {member.name}
            </div>
          </div>
        )}
      </td>

      {/* Email */}
      <td className="px-4 py-3">
        {editingField === 'email' ? (
          <EditableCell
            value={member.email}
            type="email"
            onChange={(val) => handleEditCell('email', val)}
            onCancel={() => setEditingField(null)}
          />
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-blue-600" onClick={() => setEditingField('email')}>
            {member.email || '—'}
          </div>
        )}
      </td>

      {/* Role */}
      <td className="px-4 py-3">
        {editingField === 'role' ? (
          <EditableCell
            value={member.role}
            type="select"
            options={roles}
            onChange={(val) => handleEditCell('role', val)}
            onCancel={() => setEditingField(null)}
          />
        ) : (
          <div className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600" onClick={() => setEditingField('role')}>
            {member.role}
          </div>
        )}
      </td>

      {/* Position */}
      <td className="px-4 py-3">
        {editingField === 'position' ? (
          <EditableCell
            value={member.position}
            type="select"
            options={['', ...positions]}
            onChange={(val) => handleEditCell('position', val)}
            onCancel={() => setEditingField(null)}
          />
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-blue-600" onClick={() => setEditingField('position')}>
            {member.position || '—'}
          </div>
        )}
      </td>

      {/* Department */}
      <td className="px-4 py-3">
        {editingField === 'department' ? (
          <EditableCell
            value={member.department}
            type="select"
            options={['', ...departments]}
            onChange={(val) => handleEditCell('department', val)}
            onCancel={() => setEditingField(null)}
          />
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-blue-600" onClick={() => setEditingField('department')}>
            {member.department || '—'}
          </div>
        )}
      </td>

      {/* Phone */}
      <td className="px-4 py-3">
        {editingField === 'phone' ? (
          <EditableCell
            value={member.phone}
            type="tel"
            onChange={(val) => handleEditCell('phone', val)}
            onCancel={() => setEditingField(null)}
          />
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-blue-600" onClick={() => setEditingField('phone')}>
            {member.phone || '—'}
          </div>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <div className={clsx('inline-block px-2 py-1 rounded text-xs font-semibold', getStatusColor(member.is_active))}>
          {statusText}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {member.is_active && (
            <button
              onClick={() => onResetPassword(member.id)}
              title="Reset password"
              className="p-1.5 rounded text-purple-600 hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-900/30 transition"
            >
              <FiLock size={18} />
            </button>
          )}
          <button
            onClick={() => onToggleActive(member.id, member.is_active)}
            title={member.is_active ? 'Disable access (deactivates user account)' : 'Enable access (creates/activates user account)'}
            className={clsx(
              'p-1.5 rounded transition',
              member.is_active
                ? 'text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900/30'
            )}
          >
            {member.is_active ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
          </button>
          <button
            onClick={() => onDelete(member.id, member.name)}
            title="Delete"
            className="p-1.5 rounded text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 transition"
          >
            <FiTrash2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export const TeamManagement = () => {
  const { teamMembers, fetchAllData } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [resetPasswordMember, setResetPasswordMember] = useState(null);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  
  // Dynamic configuration lists
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [positions, setPositions] = useState(DEFAULT_POSITIONS);
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: DEFAULT_ROLES[0],
    position: '',
    department: '',
    phone: '',
    password: '',
    is_active: 1,
  });

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Load roles, positions, and departments from API
  useEffect(() => {
    const loadConfigData = async () => {
      try {
        const [rolesRes, positionsRes, departmentsRes] = await Promise.all([
          configAPI.getRoles(),
          configAPI.getPositions(),
          configAPI.getDepartments(),
        ]);
        
        const roleNames = rolesRes.data.map(r => r.name);
        const positionNames = positionsRes.data.map(p => p.name);
        const departmentNames = departmentsRes.data.map(d => d.name);
        
        if (roleNames.length > 0) setRoles(roleNames);
        if (positionNames.length > 0) setPositions(positionNames);
        if (departmentNames.length > 0) setDepartments(departmentNames);
        
        // Update form data with first role from dynamic list
        setFormData(prev => ({
          ...prev,
          role: roleNames[0] || prev.role
        }));
      } catch (err) {
        console.warn('Failed to load configuration data, using defaults:', err);
        // Use default values if API fails
      }
    };
    
    loadConfigData();
  }, []);

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    // Validate email is provided if app access is enabled
    if (formData.is_active === 1 && !formData.email.trim()) {
      alert('Email is required to enable application access');
      return;
    }

    // Validate password if app access is enabled
    if (formData.is_active === 1 && formData.password) {
      if (formData.password.length < 8) {
        alert('Password must be at least 8 characters');
        return;
      }
    }

    setLoading(true);
    try {
      const dataToSend = { ...formData, name: formData.name.trim() };
      // Only include password if one is provided
      if (!dataToSend.password) {
        delete dataToSend.password;
      }
      
      await teamMemberAPI.create(dataToSend);
      setFormData({
        name: '',
        email: '',
        role: 'Engineer',
        position: '',
        department: '',
        phone: '',
        password: '',
        is_active: 1,
      });
      setShowForm(false);
      await fetchAllData();
    } catch (error) {
      alert('Failed to add team member: ' + error.response?.data?.detail || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditMember = async (memberId, updates) => {
    try {
      await teamMemberAPI.update(memberId, updates);
      await fetchAllData();
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteMember = async (memberId, name) => {
    if (window.confirm(`Delete team member "${name}"? This cannot be undone.`)) {
      try {
        await teamMemberAPI.delete(memberId);
        await fetchAllData();
      } catch (error) {
        alert('Failed to delete: ' + error.response?.data?.detail || error.message);
      }
    }
  };

  const handleToggleActive = async (memberId, currentStatus) => {
    try {
      await handleEditMember(memberId, { is_active: currentStatus ? 0 : 1 });
      // Provide user feedback
      const newStatus = currentStatus ? 'Disabled' : 'Enabled';
      console.log(`Access ${newStatus} for team member`);
    } catch (error) {
      const detail = error.response?.data?.detail || error.message;
      alert(`Failed to update access: ${detail}`);
    }
  };

  const handleResetPassword = (memberId) => {
    const member = teamMembers.find((m) => m.id === memberId);
    setResetPasswordMember(member);
  };

  const handlePasswordResetSubmit = async (newPassword) => {
    setResetPasswordLoading(true);
    try {
      await teamMemberAPI.resetPassword(resetPasswordMember.id, newPassword);
      alert(`Password reset successfully for ${resetPasswordMember.name}`);
      setResetPasswordMember(null);
      await fetchAllData();
    } catch (error) {
      alert('Failed to reset password: ' + error.response?.data?.detail || error.message);
    } finally {
      setResetPasswordLoading(false);
    }
  };

  // Filter team members
  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (member.phone?.includes(searchTerm) || false);

    const matchesRole = filterRole === 'all' || member.role === filterRole;
    const matchesDept = filterDepartment === 'all' || member.department === filterDepartment;

    return matchesSearch && matchesRole && matchesDept;
  });

  const uniqueRoles = Array.from(new Set(teamMembers.map((m) => m.role))).sort();
  const uniqueDepts = Array.from(new Set(teamMembers.filter((m) => m.department).map((m) => m.department))).sort();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6 border dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Team Members</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage your team ({teamMembers.length} total)</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition text-sm flex items-center gap-2"
        >
          <FiPlus size={18} />
          {showForm ? 'Cancel' : 'Add Member'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Add New Team Member</h4>
          <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email {formData.is_active === 1 && '*'}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                placeholder="john@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                required={formData.is_active === 1}
              />
              {formData.is_active === 1 && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Required for app access</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleFormChange('phone', e.target.value)}
                placeholder="+1 234-567-8900"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => handleFormChange('role', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position Level</label>
              <select
                value={formData.position}
                onChange={(e) => handleFormChange('position', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="">Select Position...</option>
                {positions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => handleFormChange('department', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="">Select Department...</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Application Access</label>
              <select
                value={formData.is_active}
                onChange={(e) => handleFormChange('is_active', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value={1}>Enabled</option>
                <option value={0}>Disabled</option>
              </select>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">If OIDC is enabled, no password setup required</p>
            </div>

            {/* Password - Only show when app access is enabled */}
            {formData.is_active === 1 && formData.email && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password (Optional)</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleFormChange('password', e.target.value)}
                  placeholder="Leave blank to set password later via reset"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {formData.password ? 'Min 8 chars, uppercase, lowercase, number, special char' : 'User must reset password to login'}
                </p>
              </div>
            )}

            {/* Submit */}
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
              >
                {loading ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[250px]">
          <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </div>

        {uniqueRoles.length > 0 && (
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            {uniqueRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        )}

        {uniqueDepts.length > 0 && (
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Departments</option>
            {uniqueDepts.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      {filteredMembers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Role</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Position</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Department</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Phone</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <TeamMemberRow
                  key={member.id}
                  member={member}
                  onEdit={handleEditMember}
                  onDelete={handleDeleteMember}
                  onToggleActive={handleToggleActive}
                  onResetPassword={handleResetPassword}
                  isDark={isDark}
                  roles={roles}
                  positions={positions}
                  departments={departments}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            {teamMembers.length === 0 ? 'No team members yet. Add one to get started!' : 'No matching team members found.'}
          </p>
        </div>
      )}

      {/* Stats */}
      {teamMembers.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamMembers.length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Total Members</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{teamMembers.filter((m) => m.is_active).length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Active</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{teamMembers.filter((m) => !m.is_active).length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Inactive</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{uniqueRoles.length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Role Types</p>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetPasswordMember && (
        <PasswordResetModal
          member={resetPasswordMember}
          onSubmit={handlePasswordResetSubmit}
          onCancel={() => setResetPasswordMember(null)}
          loading={resetPasswordLoading}
        />
      )}
    </div>
  );
};

