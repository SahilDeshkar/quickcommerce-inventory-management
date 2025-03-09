// Optimized ImportExport Component with CSV Upload Feature for 6-Month Order History
import React, { useState } from 'react';
import { useInventoryContext } from '../contexts/InventoryContext';
import { exportToCSV, parseImportedCSV, validateCSVData } from '../utils/csvHandlers';

const ImportExport = () => {
  const { inventory, setInventory, addItem, updateItem } = useInventoryContext();
  const [importErrors, setImportErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [importMode, setImportMode] = useState('merge'); // 'merge' or 'replace'
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImportErrors([]);
      setSuccessMessage('');
    }
  };

  // Export current inventory to CSV
  const handleExport = () => {
    if (inventory.length === 0) {
      setImportErrors(['No inventory data to export.']);
      return;
    }
    try {
      exportToCSV(inventory);
      setSuccessMessage('Inventory exported successfully.');
    } catch (error) {
      setImportErrors([`Export failed: ${error.message}`]);
    }
  };

  // Import inventory from CSV
  const handleImport = async () => {
    if (!selectedFile) {
      setImportErrors(['Please select a file to import.']);
      return;
    }

    setIsProcessing(true);
    setImportErrors([]);
    setSuccessMessage('');

    try {
      const parsedData = await parseImportedCSV(selectedFile);
      const { valid, errors, data } = validateCSVData(parsedData);

      if (!valid) {
        setImportErrors(errors);
        setIsProcessing(false);
        return;
      }

      if (importMode === 'replace') {
        setInventory(data);
        setSuccessMessage(`Imported ${data.length} items, replacing previous inventory.`);
      } else {
        let added = 0, updated = 0;
        data.forEach(importItem => {
          const existingItemIndex = inventory.findIndex(item => 
            item.name.toLowerCase() === importItem.name.toLowerCase() && item.unit === importItem.unit);

          if (existingItemIndex >= 0) {
            const existingItem = inventory[existingItemIndex];
            const mergedItem = {
              ...importItem,
              id: existingItem.id,
              aiMetadata: existingItem.aiMetadata || importItem.aiMetadata,
              usageHistory: existingItem.usageHistory || importItem.usageHistory,
              purchaseHistory: existingItem.purchaseHistory || importItem.purchaseHistory
            };
            updateItem(mergedItem);
            updated++;
          } else {
            addItem({ ...importItem, id: Date.now().toString() });
            added++;
          }
        });
        setSuccessMessage(`Import complete: ${added} items added, ${updated} items updated.`);
      }
    } catch (error) {
      setImportErrors([`Import failed: ${error.message}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="import-export-container">
      <h2>Import & Export</h2>
      <div className="export-section">
        <h3>Export Inventory</h3>
        <button onClick={handleExport} disabled={inventory.length === 0}>Export to CSV</button>
      </div>
      <div className="import-section">
        <h3>Import Inventory</h3>
        <input type="file" accept=".csv" onChange={handleFileChange} />
        <label>
          <input type="radio" name="importMode" value="merge" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} /> Merge
        </label>
        <label>
          <input type="radio" name="importMode" value="replace" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} /> Replace
        </label>
        <button onClick={handleImport} disabled={!selectedFile || isProcessing}>{isProcessing ? 'Processing...' : 'Import'}</button>
      </div>
      {importErrors.length > 0 && <div className="errors">{importErrors.map((error, i) => <p key={i}>{error}</p>)}</div>}
      {successMessage && <div className="success">{successMessage}</div>}
    </div>
  );
};

export default ImportExport;
