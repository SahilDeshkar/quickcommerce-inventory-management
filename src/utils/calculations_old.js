// AI-powered utility functions for inventory calculations and predictions

/**
 * Calculate estimated days until an item runs out based on usage patterns
 * @param {Object} item - The inventory item
 * @returns {Number} - Estimated days until out of stock
 */
export const calculateDaysLeft = (item) => {
    if (!item) return 0;
    if (item.quantity <= 0) return 0;

    const currentDate = new Date();
    const lastOrderDate = new Date(item.orderDate);
    const replenishmentTime = parseInt(item.replenishmentTime, 10);

    // Calculate days since last order
    const daysSinceLastOrder = Math.floor((currentDate - lastOrderDate) / (1000 * 60 * 60 * 24));

    // If we have AI-generated consumption data, use it
    if (item.aiMetadata && item.aiMetadata.dailyConsumptionRate) {
        return Math.ceil(item.quantity / item.aiMetadata.dailyConsumptionRate);
    }

    // Otherwise, estimate based on purchase frequency and threshold
    let dailyRate;

    switch (item.purchaseFrequency) {
        case 'daily':
            dailyRate = item.minThreshold * 0.9;
            break;
        case 'weekly':
            dailyRate = item.minThreshold / 7;
            break;
        case 'biweekly':
            dailyRate = item.minThreshold / 14;
            break;
        case 'monthly':
            dailyRate = item.minThreshold / 30;
            break;
        case 'asNeeded':
        default:
            // For "as needed" items, make a reasonable guess
            dailyRate = item.minThreshold / 14;
            break;
    }

    // Prevent division by zero
    const estimatedDaysLeft = dailyRate > 0 ? Math.ceil(item.quantity / dailyRate) : 30;

    // Adjust for replenishment time
    return Math.max(0, estimatedDaysLeft - daysSinceLastOrder + replenishmentTime);
};

/**
 * Format a reorder date based on days left
 * @param {Object} item - The inventory item
 * @returns {String} - Formatted date string
 */
export const calculateReorderDate = (item) => {
    const daysLeft = calculateDaysLeft(item);
    if (daysLeft <= 0) return 'Today';
    
    const reorderDate = new Date();
    reorderDate.setDate(reorderDate.getDate() + daysLeft);
    
    // Format date as MM/DD
    return `${reorderDate.getMonth() + 1}/${reorderDate.getDate()}`;
};

/**
 * AI-powered prediction of consumption rate based on item characteristics and historical data
 * @param {String} itemName - The name of the item
 * @param {String} category - The category of the item
 * @returns {Object} - Predicted consumption data
 */
export const predictConsumptionRate = (itemName, category = 'general') => {
    // In a real implementation, this would call a trained ML model
    // Here we'll use some heuristics to simulate AI predictions
    
    const nameLower = itemName.toLowerCase();
    
    // Common grocery items
    if (category === 'grocery') {
        if (nameLower.includes('milk')) {
            return {
                suggestedThreshold: 1,
                suggestedFrequency: 'weekly',
                confidence: 85
            };
        }
        
        if (nameLower.includes('bread') || nameLower.includes('eggs')) {
            return {
                suggestedThreshold: 1,
                suggestedFrequency: 'weekly',
                confidence: 80
            };
        }
        
        if (nameLower.includes('coffee') || nameLower.includes('tea')) {
            return {
                suggestedThreshold: 1,
                suggestedFrequency: 'biweekly',
                confidence: 75
            };
        }
    }
    
    // Household items
    if (category === 'household') {
        if (nameLower.includes('paper') && 
            (nameLower.includes('towel') || nameLower.includes('toilet'))) {
            return {
                suggestedThreshold: 2,
                suggestedFrequency: 'biweekly',
                confidence: 90
            };
        }
        
        if (nameLower.includes('detergent') || nameLower.includes('soap')) {
            return {
                suggestedThreshold: 1,
                suggestedFrequency: 'monthly',
                confidence: 85
            };
        }
        
        if (nameLower.includes('battery')) {
            return {
                suggestedThreshold: 4,
                suggestedFrequency: 'monthly',
                confidence: 70
            };
        }
    }
    
    // Personal care items
    if (category === 'personal') {
        if (nameLower.includes('toothpaste') || nameLower.includes('shampoo')) {
            return {
                suggestedThreshold: 1,
                suggestedFrequency: 'monthly',
                confidence: 85
            };
        }
    }
    
    // Default predictions based on category
    switch (category) {
        case 'grocery':
            return {
                suggestedThreshold: 2,
                suggestedFrequency: 'weekly',
                confidence: 60
            };
        case 'household':
            return {
                suggestedThreshold: 1,
                suggestedFrequency: 'biweekly',
                confidence: 65
            };
        case 'personal':
            return {
                suggestedThreshold: 1,
                suggestedFrequency: 'monthly',
                confidence: 65
            };
        case 'electronics':
            return {
                suggestedThreshold: 1,
                suggestedFrequency: 'asNeeded',
                confidence: 60
            };
        default:
            return {
                suggestedThreshold: 1,
                suggestedFrequency: 'monthly',
                confidence: 50
            };
    }
};

/**
 * Determine if an item should trigger a notification
 * @param {Object} item - The inventory item
 * @returns {Boolean} - Whether to notify
 */
export const shouldNotify = (item) => {
    if (!item) return false;
    
    // Notify about out of stock items
    if (item.quantity === 0) return true;
    
    // Notify about low stock items
    if (item.quantity <= item.minThreshold) return true;
    
    // Notify about subscription-eligible items based on usage patterns
    if (item.aiMetadata && item.aiMetadata.recommendSubscription && !item.hasSubscription) {
        return true;
    }
    
    // For items with a high usage consistency, suggest subscription
    if (item.purchaseHistory && 
        item.purchaseHistory.length >= 3 && 
        !item.hasSubscription &&
        item.purchaseFrequency !== 'asNeeded') {
        return true;
    }
    
    return false;
};

/**
 * Generate AI-powered reorder suggestions based on inventory
 * @param {Array} inventory - The complete inventory
 * @returns {Array} - Items recommended for reordering
 */
export const calculateReorderSuggestions = (inventory) => {
    if (!inventory || inventory.length === 0) return [];
    
    return inventory
        .filter(item => {
            // Include out of stock items
            if (item.quantity === 0) return true;
            
            // Include items below threshold
            if (item.quantity <= item.minThreshold) return true;
            
            // Include items that will run out within 7 days based on usage patterns
            const daysLeft = calculateDaysLeft(item);
            return daysLeft <= 7;
        })
        .map(item => {
            // Calculate optimal order quantity using AI and historical data
            let suggestedOrderQuantity;
            
            if (item.aiMetadata && item.aiMetadata.optimalOrderQuantity) {
                // Use AI-suggested quantity if available
                suggestedOrderQuantity = item.aiMetadata.optimalOrderQuantity;
            } else {
                // Otherwise calculate based on frequency and threshold
                switch (item.purchaseFrequency) {
                    case 'daily':
                        suggestedOrderQuantity = item.minThreshold * 3;
                        break;
                    case 'weekly':
                        suggestedOrderQuantity = item.minThreshold * 2;
                        break;
                    case 'biweekly':
                        suggestedOrderQuantity = Math.ceil(item.minThreshold * 1.5);
                        break;
                    case 'monthly':
                    case 'asNeeded':
                    default:
                        suggestedOrderQuantity = item.minThreshold;
                        break;
                }
            }
            
            // Calculate days until out of stock
            const daysLeft = calculateDaysLeft(item);
            
            return {
                ...item,
                daysLeft,
                suggestedOrderQuantity: Math.max(1, suggestedOrderQuantity)
            };
        });
};

/**
 * Optimize shopping list based on user preferences
 * @param {Array} suggestions - The reorder suggestions
 * @param {String} preference - Optimization preference (cost, time, balanced, urgent)
 * @returns {Array} - Optimized shopping list
 */
export const optimizeShoppingList = (suggestions, preference = 'balanced') => {
    if (!suggestions || suggestions.length === 0) return [];
    
    const optimized = [...suggestions];
    
    // Apply different sorting algorithms based on preference
    switch (preference) {
        case 'cost':
            // Prioritize cost efficiency (bulk purchases, items on sale)
            optimized.sort((a, b) => {
                // First, group by store/category to reduce trips
                if (a.category !== b.category) {
                    return a.category.localeCompare(b.category);
                }
                // Then by price efficiency
                return (a.price / a.suggestedOrderQuantity || 0) - (b.price / b.suggestedOrderQuantity || 0);
            });
            break;
            
        case 'time':
            // Optimize for shopping efficiency (by store, aisle)
            optimized.sort((a, b) => {
                // Group by category (usually represents different stores or sections)
                if (a.category !== b.category) {
                    return a.category.localeCompare(b.category);
                }
                return 0;
            });
            break;
            
        case 'urgent':
            // Prioritize items that need immediate attention
            optimized.sort((a, b) => {
                // First by out-of-stock status
                if (a.quantity === 0 && b.quantity !== 0) return -1;
                if (a.quantity !== 0 && b.quantity === 0) return 1;
                
                // Then by days left
                return a.daysLeft - b.daysLeft;
            });
            break;
            
        case 'balanced':
        default:
            // Balanced approach: urgency + efficiency
            optimized.sort((a, b) => {
                // First sort by urgency tier
                const aUrgency = a.quantity === 0 ? 0 : (a.daysLeft <= 3 ? 1 : 2);
                const bUrgency = b.quantity === 0 ? 0 : (b.daysLeft <= 3 ? 1 : 2);
                
                if (aUrgency !== bUrgency) {
                    return aUrgency - bUrgency;
                }
                
                // Then by category for efficiency
                if (a.category !== b.category) {
                    return a.category.localeCompare(b.category);
                }
                
                // Finally by price efficiency
                return (a.price / a.suggestedOrderQuantity || 0) - (b.price / b.suggestedOrderQuantity || 0);
            });
            break;
    }
    
    return optimized;
};

/**
 * Calculate potential savings from bulk purchases
 * @param {Array} cartItems - The items in the shopping cart
 * @returns {Number} - Estimated savings
 */
export const calculateBulkSavings = (cartItems) => {
    return cartItems.reduce((savings, item) => {
        if (item.orderQuantity >= 3 && item.price > 0) {
            return savings + (item.price * item.orderQuantity * 0.1);
        }
        return savings;
    }, 0);
};

/**
 * Calculate potential savings from subscription
 * @param {Array} cartItems - The items in the shopping cart
 * @returns {Number} - Estimated savings
 */
export const calculateSubscriptionSavings = (cartItems) => {
    const subscriptionEligibleItems = cartItems.filter(item => 
        item.purchaseFrequency && item.purchaseFrequency !== 'asNeeded'
    );
    
    return subscriptionEligibleItems.reduce((savings, item) => 
        savings + (item.price * item.orderQuantity * 0.15), 0
    );
};