import React, { useState, useEffect, useCallback } from 'react';
import { configAPI } from '../services/api';

const ConfigurationManagement = () => {
  const [activeTab, setActiveTab] = useState('roles');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', is_default: 0, order: 0 });

  // Load items for active tab
  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let response;
      console.log(`Loading ${activeTab} from API...`); // Debug logging
      switch (activeTab) {
        case 'roles':
          response = await configAPI.getRoles();
          break;
        case 'positions':
          response = await configAPI.getPositions();
          break;
        case 'departments':
          response = await configAPI.getDepartments();
          break;
        default:
          return;
      }
      console.log(`Loaded ${activeTab}:`, response.data); // Debug logging
      setItems(response.data || []);
    } catch (err) {
      const errorMsg = `Failed to load ${activeTab}: ${err.response?.data?.detail || err.message}`;
      console.error(errorMsg, err); // Debug logging
      setError(errorMsg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Load items when tab changes
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : (name === 'order' ? parseInt(value) : value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        // Update
        switch (activeTab) {
          case 'roles':
            await configAPI.updateRole(editingId, formData);
            break;
          case 'positions':
            await configAPI.updatePosition(editingId, formData);
            break;
          case 'departments':
            await configAPI.updateDepartment(editingId, formData);
            break;
          default:
            return;
        }
      } else {
        // Create
        switch (activeTab) {
          case 'roles':
            await configAPI.createRole(formData);
            break;
          case 'positions':
            await configAPI.createPosition(formData);
            break;
          case 'departments':
            await configAPI.createDepartment(formData);
            break;
          default:
            return;
        }
      }
      resetForm();
      loadItems();
    } catch (err) {
      setError(`Failed to save: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      description: item.description || '',
      is_default: item.is_default,
      order: item.order
    });
    setShowForm(true);
  };

  const handleDelete = async (id, isDefault) => {
    if (isDefault) {
      setError('Cannot delete default items');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    setError('');
    try {
      switch (activeTab) {
        case 'roles':
          await configAPI.deleteRole(id);
          break;
        case 'positions':
          await configAPI.deletePosition(id);
          break;
        case 'departments':
          await configAPI.deleteDepartment(id);
          break;
        default:
          return;
      }
      loadItems();
    } catch (err) {
      setError(`Failed to delete: ${err.response?.data?.detail || err.message}`);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', description: '', is_default: 0, order: 0 });
  };

  return (
    <div className="configuration-management p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Configuration Management</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-300 dark:border-gray-700 mb-6">
        {['roles', 'positions', 'departments'].map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              resetForm();
            }}
            className={`px-4 py-2 font-medium capitalize transition ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && <div className="text-center py-4 text-gray-600 dark:text-gray-400">Loading...</div>}

      {/* Content */}
      {!loading && (
        <div>
          {/* Add Button */}
          <div className="mb-6">
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition"
            >
              + Add {activeTab.slice(0, -1)}
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-white rounded focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Order
                  </label>
                  <input
                    type="number"
                    name="order"
                    value={formData.order}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-white rounded focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-white rounded focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                />
              </div>

              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="is_default"
                  name="is_default"
                  checked={formData.is_default === 1}
                  onChange={handleInputChange}
                  disabled={editingId !== null}
                  className="w-4 h-4 text-blue-500 rounded focus:ring-0 cursor-pointer dark:bg-gray-600 dark:border-gray-500"
                />
                <label htmlFor="is_default" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Set as default {editingId !== null && '(cannot change after creation)'}
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Items Table */}
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No {activeTab} configured yet. Create one to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white font-semibold">Name</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-white font-semibold">Description</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center text-gray-900 dark:text-white font-semibold">Order</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center text-gray-900 dark:text-white font-semibold">Default</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right text-gray-900 dark:text-white font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 font-medium text-gray-900 dark:text-white">{item.name}</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-600 dark:text-gray-400">
                        {item.description || '-'}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center text-gray-900 dark:text-white">{item.order}</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center text-gray-900 dark:text-white">
                        {item.is_default ? '✓' : '-'}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                        <button
                          onClick={() => handleEdit(item)}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition mr-2 dark:bg-blue-600 dark:hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.is_default)}
                          disabled={item.is_default}
                          className={`px-3 py-1 text-white rounded text-sm transition ${
                            item.is_default
                              ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                              : 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700'
                          }`}
                          title={item.is_default ? 'Cannot delete default items' : 'Delete'}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConfigurationManagement;
