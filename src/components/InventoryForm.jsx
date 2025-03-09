import React, { useState, useEffect } from 'react';
import { useInventoryContext } from '../contexts/InventoryContext';
import { predictConsumptionRate } from '../utils/calculations';

const InventoryForm = () => {
  const { addItem, updateItem, selectedItem, setSelectedItem } = useInventoryContext();
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    quantity: 0,
    unit: 'items',
    minThreshold: 0,
    purchaseFrequency: 'weekly',
    lastPurchased: new Date().toISOString().split('T')[0],
    category: 'general',
    price: 0,
    preferredBrand: '',
    notes: ''
  });

  // AI-powered suggestion states
  const [suggestedThreshold, setSuggestedThreshold] = useState(null);
  const [suggestedFrequency, setSuggestedFrequency] = useState(null);
  const [aiConfidence, setAiConfidence] = useState(0);

  useEffect(() => {
    if (selectedItem) {
      setFormData(selectedItem);
    } else {
      resetForm();
    }
  }, [selectedItem]);

  const resetForm = () => {
    setFormData({
      id: null,
      name: '',
      quantity: 0,
      unit: 'items',
      minThreshold: 0,
      purchaseFrequency: 'weekly',
      lastPurchased: new Date().toISOString().split('T')[0],
      category: 'general',
      price: 0,
      preferredBrand: '',
      notes: ''
    });
    setSuggestedThreshold(null);
    setSuggestedFrequency(null);
    setAiConfidence(0);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // AI prediction when enough data is available
    if ((name === 'name' && value.length > 2) || 
        name === 'category' || 
        name === 'quantity') {
      // Get AI predictions based on item characteristics and historical data
      const predictions = predictConsumptionRate(formData.name, formData.category);
      if (predictions) {
        setSuggestedThreshold(predictions.suggestedThreshold);
        setSuggestedFrequency(predictions.suggestedFrequency);
        setAiConfidence(predictions.confidence);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const itemToSave = { ...formData };

    // If user accepted the AI suggestions, use them
    if (suggestedThreshold && document.getElementById('useAiThreshold').checked) {
      itemToSave.minThreshold = suggestedThreshold;
    }
    
    if (suggestedFrequency && document.getElementById('useAiFrequency').checked) {
      itemToSave.purchaseFrequency = suggestedFrequency;
    }

    if (itemToSave.id) {
      updateItem(itemToSave);
    } else {
      // Generate a unique ID for new items
      itemToSave.id = Date.now().toString();
      // Add AI metadata for future learning
      itemToSave.aiMetadata = {
        suggestedThreshold,
        suggestedFrequency,
        userAcceptedThreshold: document.getElementById('useAiThreshold')?.checked || false,
        userAcceptedFrequency: document.getElementById('useAiFrequency')?.checked || false,
        predictionConfidence: aiConfidence,
        predictionTimestamp: new Date().toISOString()
      };
      addItem(itemToSave);
    }

    setSelectedItem(null);
    resetForm();
  };

  return (
    <div className="inventory-form-container">
      <h2>{formData.id ? 'Edit Item' : 'Add New Item'}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Item Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="quantity">Quantity *</label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="unit">Unit</label>
            <select
              id="unit"
              name="unit"
              value={formData.unit}
              onChange={handleChange}
            >
              <option value="items">Items</option>
              <option value="oz">Ounces</option>
              <option value="lbs">Pounds</option>
              <option value="gallons">Gallons</option>
              <option value="ml">Milliliters</option>
              <option value="liters">Liters</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="minThreshold">Minimum Threshold</label>
            <input
              type="number"
              id="minThreshold"
              name="minThreshold"
              value={formData.minThreshold}
              onChange={handleChange}
              min="0"
            />
            {suggestedThreshold && (
              <div className="ai-suggestion">
                <input
                  type="checkbox"
                  id="useAiThreshold"
                  name="useAiThreshold"
                />
                <label htmlFor="useAiThreshold">
                  Use AI suggested threshold: {suggestedThreshold} 
                  <span className="confidence-indicator" title={`${aiConfidence}% confidence`}>
                    {aiConfidence > 80 ? '★★★' : aiConfidence > 60 ? '★★' : '★'}
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="purchaseFrequency">Purchase Frequency</label>
            <select
              id="purchaseFrequency"
              name="purchaseFrequency"
              value={formData.purchaseFrequency}
              onChange={handleChange}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="asNeeded">As Needed</option>
            </select>
            {suggestedFrequency && (
              <div className="ai-suggestion">
                <input
                  type="checkbox"
                  id="useAiFrequency"
                  name="useAiFrequency"
                />
                <label htmlFor="useAiFrequency">
                  Use AI suggested frequency: {suggestedFrequency}
                  <span className="confidence-indicator" title={`${aiConfidence}% confidence`}>
                    {aiConfidence > 80 ? '★★★' : aiConfidence > 60 ? '★★' : '★'}
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="general">General</option>
              <option value="grocery">Grocery</option>
              <option value="household">Household</option>
              <option value="personal">Personal Care</option>
              <option value="electronics">Electronics</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="price">Price (optional)</label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="preferredBrand">Preferred Brand (optional)</label>
            <input
              type="text"
              id="preferredBrand"
              name="preferredBrand"
              value={formData.preferredBrand}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastPurchased">Last Purchased</label>
            <input
              type="date"
              id="lastPurchased"
              name="lastPurchased"
              value={formData.lastPurchased}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notes (optional)</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">
            {formData.id ? 'Update Item' : 'Add Item'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSelectedItem(null);
              resetForm();
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default InventoryForm;