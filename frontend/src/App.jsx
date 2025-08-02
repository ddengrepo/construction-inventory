import React, { useState, useEffect, useCallback } from 'react';
// Import Lucide React icons
import { Search, Plus, Edit3, Trash2, Hammer, AlertTriangle, TrendingUp, MapPin, Calendar, Wrench, Package2 } from 'lucide-react';
// Import the external CSS file
import './App.css'; // Make sure this line is present to link the CSS

// Main App component (renamed from ConstructionInventoryApp for default export)
const App = () => {
  // State for items fetched from Django backend
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
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
  const [unitsList, setUnitsList] = useState(initialUnits); // Initialized with common units

  const API_BASE_URL = 'http://127.0.0.1:8000/api/'; // Base URL for your Django API - CORRECTED

  // --- Data Fetching from Django Backend ---

  // Fetch Disciplines (for Category dropdown)
  useEffect(() => {
    const fetchDisciplines = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}disciplines/`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setDisciplinesList(data);
      } catch (err) {
        console.error("Error fetching disciplines:", err);
        setError(err);
      }
    };
    fetchDisciplines();
  }, [API_BASE_URL]);

  // Fetch Materials (main data for the table)
  const fetchMaterials = useCallback(async () => {
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
      const response = await fetch(materialsUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

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
        // They would require backend schema/serializer changes if needed for persistence.
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
  }, [selectedCategory, selectedType, disciplinesList, API_BASE_URL]);

  // Initial fetch and re-fetch on filter changes
  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

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
      const response = await fetch(`${API_BASE_URL}materials/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = 'Failed to add item.';
        if (response.status === 400) {
          if (errorData.material_name && errorData.material_name.includes("dim material with this material name already exists.")) {
            errorMessage = "Material name already exists. Please choose a unique name.";
          } else if (errorData.material_name && errorData.material_name.includes("This field must be unique.")) {
            errorMessage = "Material name must be unique. Please choose a different name.";
          } else if (errorData.non_field_errors) {
            errorMessage = `Failed to add item: ${errorData.non_field_errors.join(', ')}`;
          } else {
            errorMessage = `Validation error: ${JSON.stringify(errorData)}`;
          }
        } else if (errorData.detail) {
          errorMessage = `Failed to add item: ${errorData.detail}`;
        } else {
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const addedMaterial = await response.json();
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
      const response = await fetch(`${API_BASE_URL}materials/${editingItem.id}/`, {
        method: 'PUT', // Use PUT for full update
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = 'Failed to update item.';
        if (response.status === 400) {
          if (errorData.material_name && errorData.material_name.includes("dim material with this material name already exists.")) {
            errorMessage = "Material name already exists. Please choose a unique name.";
          } else if (errorData.material_name && errorData.material_name.includes("This field must be unique.")) {
            errorMessage = "Material name must be unique. Please choose a different name.";
          } else if (errorData.non_field_errors) {
            errorMessage = `Failed to update item: ${errorData.non_field_errors.join(', ')}`;
          } else {
            errorMessage = `Validation error: ${JSON.stringify(errorData)}`;
          }
        } else if (errorData.detail) {
          errorMessage = `Failed to update item: ${errorData.detail}`;
        } else {
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const updatedMaterial = await response.json();
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
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-xl max-w-sm w-full p-6 text-center">
          <h3 class="text-lg font-bold mb-4">Confirm Deletion</h3>
          <p class="text-gray-700 mb-6">Are you sure you want to delete this item?</p>
          <div class="flex justify-center space-x-4">
            <button id="cancelDelete" class="px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">Cancel</button>
            <button id="confirmDelete" class="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">Delete</button>
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
      const response = await fetch(`${API_BASE_URL}materials/${id}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

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

  // --- Render Logic ---
  if (loading && items.length === 0) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700">Loading inventory...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-red-50 text-red-700 border border-red-200 p-4 m-4 rounded-lg">Error: {error.message}. Please check if the Django backend is running and CORS is configured correctly.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* All custom CSS moved to App.css */}

      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Hammer className="h-8 w-8 text-white mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-white">Construction Inventory</h1>
                <p className="text-orange-100">Materials & Equipment Management</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingItem(null); // Ensure we're in 'add' mode
                resetForm(); // Clear form fields
                setShowAddForm(true);
              }}
              className="bg-white text-orange-600 hover:bg-orange-50 px-6 py-3 rounded-lg flex items-center font-semibold transition-colors shadow-lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Item
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {/* Changed md:grid-cols-4 to sm:grid-cols-4 to make it responsive at smaller screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Items Card */}
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-l-blue-500 flex items-center">
            <div className="p-2 bg-blue-100 rounded-xl flex-shrink-0">
              <Package2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{items.length}</p>
            </div>
          </div>

          {/* Total Value Card */}
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-l-green-500 flex items-center">
            <div className="p-2 bg-green-100 rounded-xl flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Low Stock Items Card */}
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-l-orange-500 flex items-center">
            <div className="p-2 bg-orange-100 rounded-xl flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">{lowStockItems.length}</p>
            </div>
          </div>

          {/* Critical Items Card */}
          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-l-red-500 flex items-center">
            <div className="p-2 bg-red-100 rounded-xl flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Critical Items</p>
              <p className="text-2xl font-bold text-gray-900">{criticalItems.length}</p>
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
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name or SKU..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {disciplinesList.map(discipline => (
                <option key={discipline.discipline_id} value={discipline.discipline_name}>{discipline.discipline_name}</option>
              ))}
            </select>

            <select
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
        <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Details</th><th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th><th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th><th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th><th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th><th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Restocked</th><th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => {
                  const stockStatus = getStockStatus(item);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                          {/* Supplier not directly mapped */}
                        </div>
                      </td>
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{item.quantity} {item.unit}</div>
                        <div className="text-xs text-gray-500">Alert at {item.lowStock}</div> {/* lowStock is placeholder */}
                      </td>
                      <td className="px-6 py-4">
                        {/* Price is placeholder. cost_per_unit is on FactInventoryTransactions */}
                        <div className="text-sm font-medium text-gray-900">${item.price.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">per {item.unit.slice(0, -1)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${stockStatus.color}`}>
                          {stockStatus.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="h-4 w-4 mr-1" />
                          {item.location} {/* Placeholder */}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(item.lastRestocked).toLocaleDateString()} {/* Placeholder */}
                        </div>
                      </td>
                      <td className="px-6 py-4">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-screen overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h2>

            {formSubmitMessage && (
              <p className={`mb-4 p-3 rounded-lg text-center font-medium ${formSubmitMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {formSubmitMessage.text}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Item Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  placeholder="e.g., Concrete Mix - 50lb Bags"
                  required
                />
              </div>

              {/* SKU is not directly mapped to backend, but kept for UI consistency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={newItem.sku}
                  onChange={(e) => setNewItem({...newItem, sku: e.target.value})}
                  placeholder="e.g., CON-MIX-50"
                  disabled={editingItem ? true : false} // SKU typically not editable after creation
                />
              </div>

              {/* Supplier not directly mapped to backend */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={newItem.supplier}
                  onChange={(e) => setNewItem({...newItem, supplier: e.target.value})}
                  placeholder="e.g., BuildCorp Supply"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category (Discipline) <span className="text-red-500">*</span></label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type (Material Type)</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={newItem.type}
                  onChange={(e) => setNewItem({...newItem, type: e.target.value})}
                  placeholder="e.g., Consumable, Raw Material"
                />
              </div>

              {/* Quantity is current stock, not directly editable for DimMaterial */}
              {/* This field is typically updated via FactInventoryTransactions */}
              {/* For now, we omit it from the Material form, or make it display-only */}
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <input
                  type="number"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                  disabled // Quantity is derived, not set directly here
                />
              </div> */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unit of Measure <span className="text-red-500">*</span></label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={newItem.color}
                  onChange={(e) => setNewItem({...newItem, color: e.target.value})}
                  placeholder="e.g., White, Red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={newItem.size}
                  onChange={(e) => setNewItem({...newItem, size: e.target.value})}
                  placeholder="e.g., 8ft, #8 x 2.5''"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={newItem.brand}
                  onChange={(e) => setNewItem({...newItem, brand: e.target.value})}
                  placeholder="e.g., DeWalt, GRK"
                />
              </div>

              {/* Low Stock Alert, Location, Last Restocked are not directly mapped */}
              {/* If you add these to DimMaterial model, they can be uncommented and mapped */}
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Low Stock Alert</label>
                <input
                  type="number"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={newItem.lowStock}
                  onChange={(e) => setNewItem({...newItem, lowStock: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={newItem.location}
                  onChange={(e) => setNewItem({...newItem, location: e.target.value})}
                  placeholder="e.g., Yard A, Tool Shed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Restocked</label>
                <input
                  type="date"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={newItem.lastRestocked}
                  onChange={(e) => setNewItem({...newItem, lastRestocked: e.target.value})}
                />
              </div> */}
            </div>

            <div className="flex justify-end space-x-3 mt-8">
              <button
                onClick={resetForm}
                className="px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={editingItem ? handleUpdateItem : handleAddItem}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
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
