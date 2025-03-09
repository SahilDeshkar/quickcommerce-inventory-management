import React, { useState, useEffect, useCallback } from 'react';
import { useInventoryContext } from '../contexts/InventoryContext';
import { calculateDaysLeft, shouldNotify } from '../utils/calculations';

const Notification = () => {
  const { inventory } = useInventoryContext();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newNotificationsCount, setNewNotificationsCount] = useState(0);

  // AI-powered notification generation
  const generateNotifications = useCallback(() => {
    if (!inventory || inventory.length === 0) return;

    const newNotifications = [];
    const now = new Date();

    inventory.forEach(item => {
      // Check if item is out of stock or below threshold
      if (item.quantity === 0) {
        newNotifications.push({
          id: `outofstock-${item.id}-${now.getTime()}`,
          type: 'outofstock',
          itemId: item.id,
          itemName: item.name,
          message: `${item.name} is out of stock. Add to your shopping list?`,
          timestamp: now.toISOString(),
          actions: ['add-to-cart', 'dismiss'],
          read: false,
          priority: 'high'
        });
      } else if (item.quantity <= item.minThreshold) {
        const daysLeft = calculateDaysLeft(item);
        
        if (daysLeft <= 7) {
          newNotifications.push({
            id: `lowstock-${item.id}-${now.getTime()}`,
            type: 'lowstock',
            itemId: item.id,
            itemName: item.name,
            message: `${item.name} is running low (${item.quantity} ${item.unit} left). Estimated to run out in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`,
            timestamp: now.toISOString(),
            actions: ['add-to-cart', 'dismiss'],
            read: false,
            priority: daysLeft <= 2 ? 'high' : 'medium'
          });
        }
      }

      // Check for subscription recommendations based on usage patterns
      if (shouldNotify(item)) {
        newNotifications.push({
          id: `subscription-${item.id}-${now.getTime()}`,
          type: 'subscription',
          itemId: item.id,
          itemName: item.name,
          message: `Based on your usage patterns, we recommend setting up a subscription for ${item.name}.`,
          details: `You typically use ${item.aiMetadata?.averageUsage || '1-2'} ${item.unit} per ${item.aiMetadata?.usageFrequency || 'week'}.`,
          timestamp: now.toISOString(),
          actions: ['setup-subscription', 'not-now', 'dismiss'],
          read: false,
          priority: 'low'
        });
      }
    });

    // AI-powered bulk purchase recommendations
    const bulkItems = inventory.filter(item => 
      item.quantity <= item.minThreshold && 
      item.category === 'grocery' && 
      item.price > 0
    );
    
    if (bulkItems.length >= 3) {
      const itemNames = bulkItems.map(item => item.name).join(', ');
      const totalSavings = bulkItems.reduce((sum, item) => sum + (item.price * 0.15), 0).toFixed(2);
      
      newNotifications.push({
        id: `bulk-${now.getTime()}`,
        type: 'bulk-savings',
        message: `Bulk purchase opportunity: Save approximately $${totalSavings} by ordering ${itemNames} together.`,
        timestamp: now.toISOString(),
        actions: ['view-details', 'dismiss'],
        read: false,
        priority: 'medium',
        items: bulkItems
      });
    }

    // Check for intelligent reordering suggestions
    const seasonalItems = inventory.filter(item => 
      item.aiMetadata?.seasonal && 
      item.quantity < item.minThreshold * 2
    );
    
    if (seasonalItems.length > 0) {
      seasonalItems.forEach(item => {
        newNotifications.push({
          id: `seasonal-${item.id}-${now.getTime()}`,
          type: 'seasonal',
          itemId: item.id,
          itemName: item.name,
          message: `${item.name} might be harder to find soon due to seasonal availability.`,
          timestamp: now.toISOString(),
          actions: ['stock-up', 'dismiss'],
          read: false,
          priority: 'medium'
        });
      });
    }

    // Add new notifications and update count
    if (newNotifications.length > 0) {
      setNotifications(prev => {
        const existing = new Set(prev.map(notification => notification.id));
        const filtered = newNotifications.filter(notification => !existing.has(notification.id));
        setNewNotificationsCount(count => count + filtered.length);
        return [...filtered, ...prev];
      });
    }
  }, [inventory]);

  useEffect(() => {
    // Generate notifications when inventory changes
    generateNotifications();
    
    // Also set up interval to periodically check
    const interval = setInterval(generateNotifications, 3600000); // Every hour
    
    return () => clearInterval(interval);
  }, [inventory, generateNotifications]);

  const handleAction = (notificationId, action, itemId) => {
    // Mark notification as read
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );

    // Count as read if it was new
    setNewNotificationsCount(count => Math.max(0, count - 1));

    // Handle specific actions
    switch (action) {
      case 'dismiss':
        // Just remove the notification
        setNotifications(prev =>
          prev.filter(notification => notification.id !== notificationId)
        );
        break;
        
      case 'add-to-cart':
        // Add to shopping cart logic here
        // For now, just mark as handled in the notification
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId
              ? { ...notification, handled: true, message: `${notification.itemName} added to shopping list.` }
              : notification
          )
        );
        break;
        
      case 'setup-subscription':
        // Redirect to subscription setup page
        alert(`Setting up subscription for ${
          inventory.find(item => item.id === itemId)?.name || 'item'
        }`);
        
        // Remove the notification
        setNotifications(prev =>
          prev.filter(notification => notification.id !== notificationId)
        );
        break;
        
      case 'stock-up':
        // Logic to add a seasonal item to cart with increased quantity
        const item = inventory.find(item => item.id === itemId);
        if (item) {
          const recommendedQuantity = item.minThreshold * 3;
          alert(`Added ${recommendedQuantity} ${item.unit} of ${item.name} to your shopping list to stock up before seasonal shortage.`);
          
          // Remove the notification
          setNotifications(prev =>
            prev.filter(notification => notification.id !== notificationId)
          );
        }
        break;
        
      case 'view-details':
        // View bulk purchase details
        const notification = notifications.find(note => note.id === notificationId);
        if (notification && notification.items) {
          const itemList = notification.items
            .map(item => `${item.name}: ${item.quantity} ${item.unit} (Save: $${(item.price * 0.15).toFixed(2)})`)
            .join('\n');
          alert(`Bulk Purchase Details:\n${itemList}`);
        }
        break;
        
      default:
        break;
    }
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setNewNotificationsCount(0);
    setShowNotifications(false);
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
    setNewNotificationsCount(0);
  };

  return (
    <div className="notification-component">
      <button 
        className="notification-bell" 
        onClick={() => setShowNotifications(!showNotifications)}
      >
        {newNotificationsCount > 0 && (
          <span className="notification-badge">{newNotificationsCount}</span>
        )}
        🔔
      </button>
      
      {showNotifications && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Notifications</h3>
            <div className="notification-controls">
              <button onClick={markAllAsRead}>Mark All as Read</button>
              <button onClick={clearAllNotifications}>Clear All</button>
            </div>
          </div>
          
          <div className="notification-list">
            {notifications.length > 0 ? (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`notification-item priority-${notification.priority} ${!notification.read ? 'unread' : ''}`}
                >
                  <div className="notification-content">
                    <div className="notification-message">{notification.message}</div>
                    {notification.details && (
                      <div className="notification-details">{notification.details}</div>
                    )}
                    <div className="notification-time">
                      {new Date(notification.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                      })}, {new Date(notification.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="notification-actions">
                    {notification.actions.map(action => (
                      <button
                        key={`${notification.id}-${action}`}
                        className={`action-${action}`}
                        onClick={() => handleAction(notification.id, action, notification.itemId)}
                      >
                        {action === 'add-to-cart' ? 'Add to Cart' :
                         action === 'setup-subscription' ? 'Set Up' :
                         action === 'not-now' ? 'Not Now' :
                         action === 'stock-up' ? 'Stock Up' :
                         action === 'view-details' ? 'View Details' :
                         action === 'dismiss' ? 'Dismiss' : action}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-notifications">
                No notifications at this time.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notification;