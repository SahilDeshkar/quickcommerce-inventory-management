import React, { useState, useMemo } from 'react';
import { useInventoryContext } from '../contexts/InventoryContext';
import { calculateReorderSuggestions, optimizeShoppingList } from '../utils/calculations';

const ReorderSuggestions = () => {
  const { inventory, updateItem } = useInventoryContext();
  const [shoppingCart, setShoppingCart] = useState([]);
  const [viewMode, setViewMode] = useState('smart'); // 'smart', 'grouped', 'urgent'
  const [optimizationPreference, setOptimizationPreference] = useState('balanced');
  
  // AI-generated shopping suggestions
  const suggestions = useMemo(() => {
    return calculateReorderSuggestions(inventory);
  }, [inventory]);
  
  // Optimize shopping list based on user preferences
  const optimizedList = useMemo(() => {
    return optimizeShoppingList(suggestions, optimizationPreference);
  }, [suggestions, optimizationPreference]);

  // Group items by category or urgency
  const organizedSuggestions = useMemo(() => {
    if (viewMode === 'smart') {
      return optimizedList;
    } else if (viewMode === 'grouped') {
      // Group by category
      const grouped = {};
      suggestions.forEach(item => {
        if (!grouped[item.category]) {
          grouped[item.category] = [];
        }
        grouped[item.category].push(item);
      });
      return grouped;
    } else if (viewMode === 'urgent') {
      // Sort by urgency (days until out of stock)
      return [...suggestions].sort((a, b) => a.daysLeft - b.daysLeft);
    }
    return optimizedList;
  }, [suggestions, optimizedList, viewMode]);

  const handleAddToCart = (item) => {
    // Check if item is already in cart
    const existingItemIndex = shoppingCart.findIndex(cartItem => 
      cartItem.id === item.id
    );
    
    if (existingItemIndex >= 0) {
      // Update quantity if already in cart
      const updatedCart = [...shoppingCart];
      updatedCart[existingItemIndex] = {
        ...updatedCart[existingItemIndex],
        orderQuantity: updatedCart[existingItemIndex].orderQuantity + item.suggestedOrderQuantity
      };
      setShoppingCart(updatedCart);
    } else {
      // Add to cart with suggested order quantity
      setShoppingCart([...shoppingCart, {
        id: item.id,
        name: item.name,
        orderQuantity: item.suggestedOrderQuantity,
        unit: item.unit,
        category: item.category,
        preferredBrand: item.preferredBrand,
        price: item.price
      }]);
    }
  };

  const handleRemoveFromCart = (itemId) => {
    setShoppingCart(shoppingCart.filter(item => item.id !== itemId));
  };

  const handleProcessOrder = () => {
    // In a real application, this would send the order to a service
    // Here we'll just update the inventory
    shoppingCart.forEach(cartItem => {
      const inventoryItem = inventory.find(item => item.id === cartItem.id);
      
      if (inventoryItem) {
        // Update the inventory with the ordered quantity
        const updatedItem = {
          ...inventoryItem,
          quantity: inventoryItem.quantity + cartItem.orderQuantity,
          lastPurchased: new Date().toISOString().split('T')[0],
          // Add purchase history for AI learning
          purchaseHistory: [
            ...(inventoryItem.purchaseHistory || []),
            {
              quantity: cartItem.orderQuantity,
              date: new Date().toISOString(),
              price: cartItem.price || 0
            }
          ]
        };
        
        updateItem(updatedItem);
      }
    });
    
    // Clear the cart after processing
    setShoppingCart([]);
    alert('Order has been processed successfully!');
  };

  const calculateCartTotal = () => {
    return shoppingCart.reduce((total, item) => 
      total + (item.price * item.orderQuantity || 0), 0
    ).toFixed(2);
  };

  // Render AI-powered savings insights
  const renderSavingsInsights = () => {
    // Calculate potential savings from bulk purchases
    const bulkSavings = shoppingCart.reduce((savings, item) => {
      if (item.orderQuantity >= 3 && item.price > 0) {
        return savings + (item.price * item.orderQuantity * 0.1);
      }
      return savings;
    }, 0);

    // Calculate subscription savings
    const subscriptionEligibleItems = shoppingCart.filter(item => 
      item.purchaseFrequency && item.purchaseFrequency !== 'asNeeded'
    );
    
    const subscriptionSavings = subscriptionEligibleItems.reduce((savings, item) => 
      savings + (item.price * item.orderQuantity * 0.15), 0
    );

    return (
      <div className="savings-insights">
        <h4>AI-Powered Savings Insights</h4>
        {bulkSavings > 0 && (
          <div className="saving-item">
            <span className="saving-icon">🔄</span>
            <span className="saving-text">
              Bulk purchase savings: ${bulkSavings.toFixed(2)}
            </span>
          </div>
        )}
        {subscriptionSavings > 0 && (
          <div className="saving-item">
            <span className="saving-icon">📅</span>
            <span className="saving-text">
              Potential subscription savings: ${subscriptionSavings.toFixed(2)}
            </span>
          </div>
        )}
        {bulkSavings === 0 && subscriptionSavings === 0 && (
          <div className="no-savings">No additional savings found for current cart.</div>
        )}
      </div>
    );
  };

  return (
    <div className="reorder-suggestions-container">
      <div className="suggestions-header">
        <h2>Smart Reorder Suggestions</h2>
        <div className="view-controls">
          <div className="view-selector">
            <label>View Mode:</label>
            <select 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value)}
            >
              <option value="smart">AI Optimized</option>
              <option value="grouped">By Category</option>
              <option value="urgent">By Urgency</option>
            </select>
          </div>
          
          {viewMode === 'smart' && (
            <div className="optimization-selector">
              <label>Optimization:</label>
              <select 
                value={optimizationPreference} 
                onChange={(e) => setOptimizationPreference(e.target.value)}
              >
                <option value="cost">Save Money</option>
                <option value="balanced">Balanced</option>
                <option value="time">Save Time</option>
                <option value="urgent">Prioritize Urgent Items</option>
              </select>
            </div>
          )}
        </div>
      </div>
      
      <div className="reorder-content">
        <div className="suggestions-list">
          <h3>Recommended Items ({suggestions.length})</h3>
          
          {viewMode === 'grouped' ? (
            // Render grouped by category
            Object.entries(organizedSuggestions).map(([category, items]) => (
              <div key={category} className="category-group">
                <h4>{category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                {items.map(item => (
                  <div key={item.id} className="suggestion-item">
                    <div className="item-details">
                      <span className="item-name">{item.name}</span>
                      <span className="item-meta">
                        Current: {item.quantity} {item.unit}
                        {item.preferredBrand && ` • ${item.preferredBrand}`}
                      </span>
                      <span className="item-urgency">
                        {item.daysLeft <= 0 
                          ? 'Out of stock!' 
                          : `${item.daysLeft} days left`}
                      </span>
                    </div>
                    <div className="item-actions">
                      <div className="suggested-quantity">
                        Suggest: {item.suggestedOrderQuantity} {item.unit}
                        {item.price > 0 && ` • $${(item.price * item.suggestedOrderQuantity).toFixed(2)}`}
                      </div>
                      <button 
                        onClick={() => handleAddToCart(item)}
                        className="add-to-cart-btn"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          ) : (
            // Render flat list (smart or urgent)
            Array.isArray(organizedSuggestions) && organizedSuggestions.map(item => (
              <div 
                key={item.id} 
                className={`suggestion-item ${
                  item.daysLeft <= 0 ? 'urgent' : 
                  item.daysLeft <= 3 ? 'warning' : ''
                }`}
              >
                <div className="item-details">
                  <span className="item-name">{item.name}</span>
                  <span className="item-meta">
                    Current: {item.quantity} {item.unit}
                    {item.preferredBrand && ` • ${item.preferredBrand}`}
                    {` • ${item.category}`}
                  </span>
                  <span className="item-urgency">
                    {item.daysLeft <= 0 
                      ? 'Out of stock!' 
                      : `${item.daysLeft} days left`}
                  </span>
                </div>
                <div className="item-actions">
                  <div className="suggested-quantity">
                    Suggest: {item.suggestedOrderQuantity} {item.unit}
                    {item.price > 0 && ` • $${(item.price * item.suggestedOrderQuantity).toFixed(2)}`}
                  </div>
                  <button 
                    onClick={() => handleAddToCart(item)}
                    className="add-to-cart-btn"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))
          )}
          
          {suggestions.length === 0 && (
            <div className="no-suggestions">
              No items need reordering at this time.
            </div>
          )}
        </div>
        
        <div className="shopping-cart">
          <h3>Shopping Cart ({shoppingCart.length})</h3>
          
          {shoppingCart.length > 0 ? (
            <>
              <div className="cart-items">
                {shoppingCart.map(item => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-details">
                      <span className="item-name">{item.name}</span>
                      <span className="item-quantity">
                        {item.orderQuantity} {item.unit}
                        {item.price > 0 && ` • $${(item.price * item.orderQuantity).toFixed(2)}`}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleRemoveFromCart(item.id)}
                      className="remove-item-btn"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              
              {renderSavingsInsights()}
              
              <div className="cart-total">
                <span>Total: ${calculateCartTotal()}</span>
                <button 
                  onClick={handleProcessOrder}
                  className="process-order-btn"
                >
                  Process Order
                </button>
              </div>
            </>
          ) : (
            <div className="empty-cart">
              Your cart is empty. Add items from the suggestions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReorderSuggestions;