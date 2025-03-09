import React, { useState, useEffect } from 'react';
import { useInventoryContext } from '../contexts/InventoryContext';
import { calculateDaysLeft, calculateReorderDate } from '../utils/calculations';

const InventoryTable = () => {
  const { 
    inventory, 
    loading, 
    error, 
    deleteItem, 
    setSelectedItem,
    updateItem
  } = useInventoryContext();
  
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [filters, setFilters] = useState({
    name: '',
    category: 'all',
    status: 'all'
  });
  const [filteredInventory, setFilteredInventory] = useState([]);

  // Apply AI-enhanced sorting and filtering
  useEffect(() => {
    let filtered = [...inventory];
    
    // Apply name filter
    if (filters.name) {
      const searchTerms = filters.name.toLowerCase().split(' ');
      filtered = filtered.filter(item =>
        searchTerms.every(term => 
          item.name.toLowerCase().includes(term) || 
          (item.notes && item.notes.toLowerCase().includes(term)) ||
          (item.preferredBrand && item.preferredBrand.toLowerCase().includes(term))
        )
      );
    }
    
    // Apply category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(item => item.category === filters.category);
    }
    
    // Apply status filter
    if (filters.status !== 'all') {
      switch(filters.status) {
        case 'low':
          filtered = filtered.filter(item => item.quantity <= item.minThreshold);
          break;
        case 'out':
          filtered = filtered.filter(item => item.quantity === 0);
          break;
        case 'ok':
          filtered = filtered.filter(item => item.quantity > item.minThreshold);
          break;
        default:
          break;
      }
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
    
    setFilteredInventory(filtered);
  }, [inventory, filters, sortConfig]);

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const getItemStatus = (item) => {
    if (item.quantity === 0) return 'out';
    if (item.quantity <= item.minThreshold) return 'low';
    return 'ok';
  };

  const handleQuickUpdate = (id, change) => {
    const item = inventory.find(item => item.id === id);
    if (item) {
      const updatedItem = {
        ...item,
        quantity: Math.max(0, item.quantity + change),
        lastUpdated: new Date().toISOString(),
        // Track user behavior for AI learning
        usageHistory: [
          ...(item.usageHistory || []),
          {
            action: change < 0 ? 'decrement' : 'increment',
            amount: Math.abs(change),
            timestamp: new Date().toISOString()
          }
        ]
      };
      updateItem(updatedItem);
    }
  };

  if (loading) return <div className="loading">Loading inventory...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="inventory-table-container">
      <div className="filters">
        <div className="filter-group">
          <input
            type="text"
            name="name"
            placeholder="Search items..."
            value={filters.name}
            onChange={handleFilterChange}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <label htmlFor="category-filter">Category:</label>
          <select
            id="category-filter"
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
          >
            <option value="all">All Categories</option>
            <option value="general">General</option>
            <option value="grocery">Grocery</option>
            <option value="household">Household</option>
            <option value="personal">Personal Care</option>
            <option value="electronics">Electronics</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="status-filter">Status:</label>
          <select
            id="status-filter"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
          >
            <option value="all">All Status</option>
            <option value="out">Out of Stock</option>
            <option value="low">Low Stock</option>
            <option value="ok">In Stock</option>
          </select>
        </div>
      </div>
      
      <table className="inventory-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('name')}>
              Item Name {sortConfig.key === 'name' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
            </th>
            <th onClick={() => handleSort('quantity')}>
              Quantity {sortConfig.key === 'quantity' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
            </th>
            <th onClick={() => handleSort('category')}>
              Category {sortConfig.key === 'category' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
            </th>
            <th>Status</th>
            <th>Predicted Reorder</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredInventory.length > 0 ? (
            filteredInventory.map(item => {
              const status = getItemStatus(item);
              const daysLeft = calculateDaysLeft(item);
              const reorderDate = calculateReorderDate(item);
              
              return (
                <tr key={item.id} className={`status-${status}`}>
                  <td>{item.name}</td>
                  <td>
                    <div className="quantity-control">
                      <button 
                        className="quantity-btn"
                        onClick={() => handleQuickUpdate(item.id, -1)}
                        disabled={item.quantity <= 0}
                      >
                        -
                      </button>
                      <span>
                        {item.quantity} {item.unit}
                      </span>
                      <button 
                        className="quantity-btn"
                        onClick={() => handleQuickUpdate(item.id, 1)}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td>{item.category}</td>
                  <td className={`status status-${status}`}>
                    {status === 'out' ? 'Out of Stock' : 
                      status === 'low' ? 'Low Stock' : 'In Stock'}
                  </td>
                  <td>
                    {status === 'out' ? 'Order Now' :
                      daysLeft <= 0 ? 'Order Now' :
                      daysLeft === 1 ? 'Tomorrow' :
                      `In ${daysLeft} days (${reorderDate})`
                    }
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-edit"
                        onClick={() => setSelectedItem(item)}
                        title="Edit Item"
                      >
                        Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete ${item.name}?`)) {
                            deleteItem(item.id);
                          }
                        }}
                        title="Delete Item"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="6" className="no-items">
                {inventory.length === 0 ? 
                  "No items in inventory. Add items using the form above." : 
                  "No items match your current filters."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;