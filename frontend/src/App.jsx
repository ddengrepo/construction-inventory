import React, { useState, useEffect, useCallback } from 'react';
// Import Lucide React icons
import { Search, Plus, Edit3, Trash2, Hammer, AlertTriangle, TrendingUp, MapPin, Calendar, Wrench, Package2, LogIn, User, Lock } from 'lucide-react';
// Import the external CSS file
import './App.css'; // Make sure this line is present to link the CSS

// Main App component (renamed from ConstructionInventoryApp for default export)
const App = () => {
  // State for items fetched from Django backend
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auth states
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);


  // Filter states
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState(''); // Corrected: useState('')
  const [selectedCategory, setSelectedCategory] = useState('All'); // Maps to Django Discipline
  const [selectedType, setSelectedType] = useState('All');     // Maps to Django Material Type

  // Form states for Add/Edit Modal
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // Stores item being edited
  const [newItem, setNewItem] = useState({
    name: '', // material_name
    sku: '', // Not directly mapped to Django model, will be ignored or mapped to name for now
    category: '', // discipline_name (for dropdown display)
    type: '', // material_type
    quantity: 0, // current_stock (read-only from backend)
    unit: '', // unit_of_measure
    // The following fields from your example are NOT directly in DimMaterial,
    // and would require backend schema/serializer changes if needed for persistence:
    // price: 0, lowStock: 10, location: '', supplier: '', lastRestocked: new Date().toISOString().split('T')[0]
  });
  const [formSubmitMessage, setFormSubmitMessage] = useState(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Data for dropdowns (fetched from backend)
  const [disciplinesList, setDisciplinesList] = useState([]); // For Category dropdown
  const [materialTypesList, setMaterialTypesList] = useState([]); // For Type dropdown

  // Initial list of common units for the form dropdown, will be augmented by fetched data
  const initialUnits = ['each', 'pieces', 'bags', 'sheets', 'feet', 'meters', 'gallons', 'liters', 'boxes', 'kits', 'sections', 'rolls', 'bundles', 'yards', 'sq ft', 'cu yd'];
  const [unitsList, setUnitsList] = useState(initialUnits); // CORRECTED: Initialize with useState

  const API_BASE_URL = 'http://127.0.0.1:8000/api/'; // Base URL for your Django API

  // --- Auth Functions ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      // CORRECTED: Use 'token-auth/' for the login endpoint
      const response = await fetch(`${API_BASE_URL}token-auth/`, { // FIXED: Removed accidental 'import React...'
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.non_field_errors || 'Login failed');
      }
      const data = await response.json();
      localStorage.setItem('token', data.token);
      setToken(data.token);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };


  // --- Data Fetching from Django Backend ---

  const fetchWithAuth = useCallback(async (url, options = {}) => {
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      'Authorization': `Token ${token}`
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      handleLogout();
      throw new Error('Unauthorized: Session expired. Please log in again.');
    }
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }, [token]);


  // Fetch Disciplines (for Category dropdown)
  useEffect(() => {
    if (!token) return;
    const fetchDisciplines = async () => {
      try {
        const data = await fetchWithAuth(`${API_BASE_URL}disciplines/`);
        setDisciplinesList(data);
      } catch (err) {
        console.error("Error fetching disciplines:", err);
        setError(err);
      }
    };
    fetchDisciplines();
  }, [API_BASE_URL, fetchWithAuth, token]);

  // Fetch Materials (main data for the table)
  const fetchMaterials = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    let queryParams = new URLSearchParams();

    // Map selected category (discipline name) to discipline_id for backend filter
    const disciplineId = disciplinesList.find(d => d.discipline_name === selectedCategory)?.discipline_id;
    if (disciplineId) {
      queryParams.append('discipline__discipline_id', disciplineId);
    }
    if (selectedType !== 'All') { // Map frontend 'type' to backend 'material_type'
      queryParams.append('material_type', selectedType);
    }
    // No direct filter for brand in your current backend, but you have it in your Django viewset.
    // If you add a brand filter to your backend, you can uncomment this:
    // if (selectedBrand && selectedBrand !== 'All') {
    //   queryParams.append('brand', selectedBrand);
    // }

    const materialsUrl = `${API_BASE_URL}materials/?${queryParams.toString()}`;

    try {
      const data = await fetchWithAuth(materialsUrl);

      // Map Django data structure to the frontend's desired 'item' structure
      const mappedItems = data.map(m => ({
        id: m.material_id,
        name: m.material_name,
        sku: m.material_name.replace(/\s/g, '-').toUpperCase(), // Generate a simple SKU from name
        category: m.discipline ? m.discipline.discipline_name : 'Uncategorized', // Use discipline name as category
        type: m.material_type || 'N/A',
        quantity: m.current_stock !== null ? parseFloat(m.current_stock) : 0, // Convert to number
        unit: m.unit_of_measure || 'units',
        // These fields are not directly from your current Django models (DimMaterial/FactInventoryTransactions)
        // They would require backend schema/serializer changes if needed for persistence:
        price: 0, // Placeholder, as cost_per_unit is in FactInventoryTransactions
        lowStock: 10, // Placeholder
        location: 'Warehouse', // Placeholder
        supplier: 'Various', // Placeholder
        lastRestocked: new Date().toISOString().split('T')[0] // Placeholder
      }));

      setItems(mappedItems);
      setLoading(false);

      // Dynamically populate filter dropdowns and unit list from fetched data
      const uniqueMaterialTypes = [...new Set(data.map(m => m.material_type).filter(Boolean))];
      setMaterialTypesList(['All', ...uniqueMaterialTypes]); // Include 'All' option

      const fetchedUnits = [...new Set(data.map(m => m.unit_of_measure).filter(Boolean))];
      // Combine initial units with fetched units, ensuring uniqueness
      setUnitsList(prevUnits => [...new Set([...prevUnits, ...fetchedUnits])]);

    } catch (err) {
      console.error("Error fetching materials:", err);
      setError(err);
      setLoading(false);
    }
  }, [selectedCategory, selectedType, disciplinesList, API_BASE_URL, fetchWithAuth, token]);

  // Initial fetch and re-fetch on filter changes
  useEffect(() => {
    if (token) {
      fetchMaterials();
    } else {
      setLoading(false);
    }
  }, [fetchMaterials, token]);

  // --- Frontend Filtering Logic (operates on 'items' state) ---
  useEffect(() => {
    let filtered = items;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    if (selectedType !== 'All') {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    setFilteredItems(filtered);
  }, [items, searchTerm, selectedCategory, selectedType]);

  // --- CRUD Operations (interacting with Django API) ---

  const handleAddItem = async () => {
    setIsSubmittingForm(true);
    setFormSubmitMessage(null);

    // Map frontend fields to Django backend fields
    const disciplineId = disciplinesList.find(d => d.discipline_name === newItem.category)?.discipline_id;

    const payload = {
      material_name: newItem.name,
      material_type: newItem.type || null,
      unit_of_measure: newItem.unit || 'units', // Ensure a default unit if not selected
      brand: newItem.brand || null, // Assuming brand can be added here
      color: newItem.color || null, // Assuming color can be added here
      size: newItem.size || null,   // Assuming size can be added here
      discipline: disciplineId || null, // Send discipline_id
    };

    try {
      const addedMaterial = await fetchWithAuth(`${API_BASE_URL}materials/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setFormSubmitMessage({ type: 'success', text: `Item '${addedMaterial.material_name}' added successfully!` });
      fetchMaterials(); // Refresh the list from the backend
      resetForm();

    } catch (err) {
      console.error("Error adding item:", err);
      setFormSubmitMessage({ type: 'error', text: `${err.message}` });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleEditItem = (item) => {
    // Map backend item structure to frontend form structure for editing
    const disciplineName = disciplinesList.find(d => d.discipline_id === item.discipline?.discipline_id)?.discipline_name || '';

    setEditingItem(item);
    setNewItem({
      name: item.name,
      sku: item.sku,
      category: disciplineName, // Set category name for dropdown
      type: item.type,
      quantity: item.quantity,
      unit: item.unit,
      // Placeholders for fields not in Django model
      price: item.price,
      lowStock: item.lowStock,
      location: item.location,
      supplier: item.supplier,
      lastRestocked: item.lastRestocked
    });
    setShowAddForm(true);
  };

  const handleUpdateItem = async () => {
    setIsSubmittingForm(true);
    setFormSubmitMessage(null);

    if (!editingItem) return; // Should not happen if editingItem is set

    const disciplineId = disciplinesList.find(d => d.discipline_name === newItem.category)?.discipline_id;

    const payload = {
      material_name: newItem.name,
      material_type: newItem.type || null,
      unit_of_measure: newItem.unit || 'units',
      brand: newItem.brand || null,
      color: newItem.color || null,
      size: newItem.size || null,
      discipline: disciplineId || null,
    };

    try {
      const updatedMaterial = await fetchWithAuth(`${API_BASE_URL}materials/${editingItem.id}/`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setFormSubmitMessage({ type: 'success', text: `Item '${updatedMaterial.material_name}' updated successfully!` });
      fetchMaterials(); // Refresh the list from the backend
      setEditingItem(null);
      resetForm();

    } catch (err) {
      console.error("Error updating item:", err);
      setFormSubmitMessage({ type: 'error', text: `${err.message}` });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleDeleteItem = async (id) => {
    // Custom confirmation modal instead of window.confirm
    const confirmed = await new Promise(resolve => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content">
          <h3 class="modal-header">Confirm Deletion</h3>
          <p>Are you sure you want to delete this item?</p>
          <div class="flex justify-end space-x-4">
            <button id="cancelDelete" class="btn">Cancel</button>
            <button id="confirmDelete" class="btn btn-primary">Delete</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('cancelDelete').onclick = () => {
        document.body.removeChild(modal);
        resolve(false);
      };
      document.getElementById('confirmDelete').onclick = () => {
        document.body.removeChild(modal);
        resolve(true);
      };
    });

    if (!confirmed) return;

    try {
      await fetchWithAuth(`${API_BASE_URL}materials/${id}/`, { method: 'DELETE' });
      setFormSubmitMessage({ type: 'success', text: `Item deleted successfully!` });
      fetchMaterials(); // Refresh the list

    } catch (err) {
      console.error("Error deleting item:", err);
      setFormSubmitMessage({ type: 'error', text: `Failed to delete item: ${err.message}` });
    }
  };

  const resetForm = () => {
    setNewItem({
      name: '', sku: '', category: '', type: '', quantity: 0, unit: '',
      price: 0, lowStock: 10, location: '', supplier: '', lastRestocked: new Date().toISOString().split('T')[0]
    });
    setEditingItem(null);
    setShowAddForm(false);
    setFormSubmitMessage(null); // Clear form message on reset
  };

  // --- Dashboard Stats & UI Helpers ---
  const lowStockItems = filteredItems.filter(item => item.quantity <= item.lowStock);
  const totalValue = filteredItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const criticalItems = filteredItems.filter(item => item.quantity === 0);

  const getStockStatus = (item) => {
    if (item.quantity === 0) return { status: 'Out of Stock', color: 'text-red-600 bg-red-50 border-red-200' };
    if (item.quantity <= item.lowStock) return { status: 'Low Stock', color: 'text-orange-600 bg-orange-50 border-orange-200' }; // Corrected border color
    return { status: 'In Stock', color: 'text-green-600 bg-green-50 border-green-200' };
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Power Tools': return <Wrench className="h-5 w-5" />;
      case 'Safety Equipment': return <AlertTriangle className="h-5 w-5" />;
      case 'Equipment': return <Package2 className="h-5 w-5" />;
      case 'Electrical': return <Hammer className="h-5 w-5" />; // Example for Electrical discipline
      case 'Plumbing': return <Hammer className="h-5 w-5" />; // Example for Plumbing discipline
      case 'Finishing': return <Hammer className="h-5 w-5" />; // Example for Finishing discipline
      case 'HVAC': return <Hammer className="h-5 w-5" />; // Example for HVAC discipline
      default: return <Hammer className="h-5 w-5" />; // Default icon
    }
  };

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-form-container">
          <div className="login-header">
            <Hammer className="h-12 w-12 text-orange-600 mb-4" />
            <h1 className="text-3xl font-bold text-gray-800">Construction Inventory</h1>
            <p className="text-gray-600">Please log in to continue</p>
          </div>
          <form onSubmit={handleLogin}>
            {authError && <p className="bg-red-100 text-red-700 p-3 mb-4 rounded-lg text-center">{authError}</p>}
            <div className="input-group">
              <User className="input-icon" />
              <input
                type="text"
                placeholder="Username"
                className="input-dark"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <Lock className="input-icon" />
              <input
                type="password"
                placeholder="Password"
                className="input-dark"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full mt-6"
              disabled={isLoggingIn}
            >
              <LogIn className="btn-icon" />
              {isLoggingIn ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }


  // --- Render Logic ---
  if (loading && items.length === 0) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700">Loading inventory...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-red-50 text-red-700 border border-red-200 p-4 m-4 rounded-lg">Error: {error.message}. Please check if the Django backend is running and CORS is configured correctly.</div>;
  }

  return (
    <div className="app-container">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="header-title">
            <Hammer className="h-8 w-8 text-white mr-3" />
            <div className="header-text">
              <h1>Construction Inventory</h1>
              <p>Materials & Equipment Management</p>
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="btn btn-primary mr-4"
            >
              Logout
            </button>
            <button
              onClick={() => {
                setEditingItem(null); // Ensure we're in 'add' mode
                resetForm(); // Clear form fields
                setShowAddForm(true);
              }}
              className="btn btn-primary"
            >
              <Plus className="btn-icon" />
              Add Item
            </button>
          </div>
        </div>
      </div>

      <div className="main-content">
        {/* Stats Cards */}
        <div className="stats-grid">
          {/* Total Items Card */}
          <div className="stat-card border-l-blue-500">
            <div className="stat-card-icon bg-blue-100">
              <Package2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3 stat-card-info">
              <p>Total Items</p>
              <p>{items.length}</p>
            </div>
          </div>

          {/* Total Value Card */}
          <div className="stat-card border-l-green-500">
            <div className="stat-card-icon bg-green-100">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3 stat-card-info">
              <p>Total Value</p>
              <p>${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Low Stock Items Card */}
          <div className="stat-card border-l-orange-500">
            <div className="stat-card-icon bg-orange-100">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-3 stat-card-info">
              <p>Low Stock Items</p>
              <p>{lowStockItems.length}</p>
            </div>
          </div>

          {/* Critical Items Card */}
          <div className="stat-card border-l-red-500">
            <div className="stat-card-icon bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3 stat-card-info">
              <p>Critical Items</p>
              <p>{criticalItems.length}</p>
            </div>
          </div>
        </div>

        {/* Critical Alerts */}
        {criticalItems.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-lg">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Critical Stock Alert</h3>
                <p className="text-sm text-red-700 mt-1">
                  {criticalItems.length} item(s) are out of stock: {criticalItems.map(item => item.name).join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="filters-container">
          <div className="filters-grid">
            <div className="input-group">
              <Search className="input-icon" />
              <input
                type="text"
                placeholder="Search by name or SKU..."
                className="input-dark"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="select-dark"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {disciplinesList.map(discipline => (
                <option key={discipline.discipline_id} value={discipline.discipline_name}>{discipline.discipline_name}</option>
              ))}
            </select>

            <select
              className="select-dark"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="All">All Types</option>
              {materialTypesList.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Items Table */}
        <div className="table-container">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th>Item Details</th><th>Category</th><th>Stock</th><th>Unit Price</th><th>Status</th><th>Location</th><th>Last Restocked</th><th>Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {filteredItems.map((item) => {
                  const stockStatus = getStockStatus(item);
                  return (
                    <tr key={item.id} className="table-row">
                      <td className="table-cell">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                          {/* Supplier not directly mapped */}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center">
                          <div className="text-gray-500 mr-2">
                            {getCategoryIcon(item.category)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.category}</div>
                            <div className="text-xs text-gray-500">{item.type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm font-bold text-gray-900">{item.quantity} {item.unit}</div>
                        <div className="text-xs text-gray-500">Alert at {item.lowStock}</div> {/* lowStock is placeholder */}
                      </td>
                      <td className="table-cell">
                        {/* Price is placeholder. cost_per_unit is on FactInventoryTransactions */}
                        <div className="text-sm font-medium text-gray-900">${item.price.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">per {item.unit.slice(0, -1)}</div>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${stockStatus.color}`}>
                          {stockStatus.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="h-4 w-4 mr-1" />
                          {item.location} {/* Placeholder */}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(item.lastRestocked).toLocaleDateString()} {/* Placeholder */}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="text-orange-600 hover:text-orange-900 p-1 rounded"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-header">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h2>

            {formSubmitMessage && (
              <p className={`mb-4 p-3 rounded-lg text-center font-medium ${formSubmitMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {formSubmitMessage.text}
              </p>
            )}

            <div className="form-grid">
              <div className="form-group col-span-full">
                <label className="form-label">Item Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="input-dark"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  placeholder="e.g., Concrete Mix - 50lb Bags"
                  required
                />
              </div>

              {/* SKU is not directly mapped to backend, but kept for UI consistency */}
              <div className="form-group">
                <label className="form-label">SKU</label>
                <input
                  type="text"
                  className="input-dark"
                  value={newItem.sku}
                  onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                  placeholder="e.g., CON-MIX-50"
                  disabled={editingItem ? true : false} // SKU typically not editable after creation
                />
              </div>

              {/* Supplier not directly mapped to backend */}
              <div className="form-group">
                <label className="form-label">Supplier</label>
                <input
                  type="text"
                  className="input-dark"
                  value={newItem.supplier}
                  onChange={(e) => setNewItem({...newItem, supplier: e.target.value})}
                  placeholder="e.g., BuildCorp Supply"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category (Discipline) <span className="text-red-500">*</span></label>
                <select
                  className="select-dark"
                  value={newItem.category}
                  onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                  required
                >
                  <option value="">Select Category</option>
                  {disciplinesList.map(discipline => (
                    <option key={discipline.discipline_id} value={discipline.discipline_name}>{discipline.discipline_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Type (Material Type)</label>
                <input
                  type="text"
                  className="input-dark"
                  value={newItem.type}
                  onChange={(e) => setNewItem({...newItem, type: e.target.value})}
                  placeholder="e.g., Consumable, Raw Material"
                />
              </div>

              {/* Quantity is current stock, not directly editable for DimMaterial */}
              {/* This field is typically updated via FactInventoryTransactions */}
              {/* For now, we omit it from the Material form, or make it display-only */}
              {/* <div className="form-group">
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  className="input-dark"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                  disabled // Quantity is derived, not set directly here
                />
              </div> */}

              <div className="form-group">
                <label className="form-label">Unit of Measure <span className="text-red-500">*</span></label>
                <select
                  className="select-dark"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                  required
                >
                  <option value="">Select Unit</option>
                  {unitsList.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              {/* Price per Unit not directly on DimMaterial */}
              <div className="form-group">
                <label className="form-label">Color</label>
                <input
                  type="text"
                  className="input-dark"
                  value={newItem.color}
                  onChange={(e) => setNewItem({...newItem, color: e.target.value})}
                  placeholder="e.g., White, Red"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Size</label>
                <input
                  type="text"
                  className="input-dark"
                  value={newItem.size}
                  onChange={(e) => setNewItem({...newItem, size: e.target.value})}
                  placeholder="e.g., 8ft, #8 x 2.5''"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Brand</label>
                <input
                  type="text"
                  className="input-dark"
                  value={newItem.brand}
                  onChange={(e) => setNewItem({...newItem, brand: e.target.value})}
                  placeholder="e.g., DeWalt, GRK"
                />
              </div>

              {/* Low Stock Alert, Location, Last Restocked are not directly mapped */}
              {/* If you add these to DimMaterial model, they can be uncommented and mapped */}
              {/* <div className="form-group">
                <label className="form-label">Low Stock Alert</label>
                <input
                  type="number"
                  className="input-dark"
                  value={newItem.lowStock}
                  onChange={(e) => setNewItem({...newItem, lowStock: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  className="input-dark"
                  value={newItem.location}
                  onChange={(e) => setNewItem({...newItem, location: e.target.value})}
                  placeholder="e.g., Yard A, Tool Shed"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Restocked</label>
                <input
                  type="date"
                  className="input-dark"
                  value={newItem.lastRestocked}
                  onChange={(e) => setNewItem({...newItem, lastRestocked: e.target.value})}
                />
              </div> */}
            </div>

            <div className="flex justify-end space-x-3 mt-8">
              <button
                onClick={resetForm}
                className="btn btn-primary"
              >
                Cancel
              </button>
              <button
                onClick={editingItem ? handleUpdateItem : handleAddItem}
                className="btn btn-primary"
                disabled={isSubmittingForm || !newItem.name || !newItem.unit || !newItem.category}
              >
                {isSubmittingForm ? (editingItem ? 'Updating...' : 'Adding...') : (editingItem ? 'Update Item' : 'Add Item')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
