import React, { createContext, useContext, useState } from 'react';

const InventoryContext = createContext();

export const useInventoryContext = () => {
    return useContext(InventoryContext);
};

export const InventoryProvider = ({ children }) => {
    const [inventory, setInventory] = useState([]);

    const addItem = (item) => {
        setInventory(prevInventory => [...prevInventory, item]);
    };

    const updateItem = (updatedItem) => {
        setInventory(prevInventory => prevInventory.map(item => 
            item.id === updatedItem.id ? updatedItem : item
        ));
    };

    const value = {
        inventory,
        setInventory,
        addItem,
        updateItem
    };

    return (
        <InventoryContext.Provider value={value}>
            {children}
        </InventoryContext.Provider>
    );
};