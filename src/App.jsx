import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';

const App = () => {
  const [files, setFiles] = useState([]);
  const [inventoryData, setInventoryData] = useState({
    totalProducts: 0,
    lowStock: 0,
    ordersToday: 0,
    revenue: 0,
    recommendations: [],
    cartItems: []
  });
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [importStatus, setImportStatus] = useState({
    message: 'Ready to import data.',
    isError: false
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    const fileObjects = selectedFiles.map(file => ({
      name: file.name,
      size: formatFileSize(file.size),
      file: file
    }));
    setFiles([...files, ...fileObjects]);
  };

  const removeFile = (index) => {
    const updatedFiles = [...files];
    updatedFiles.splice(index, 1);
    setFiles(updatedFiles);
    
    // If all files are removed, reset the dashboard
    if (updatedFiles.length === 0) {
      setIsDataLoaded(false);
      setInventoryData({
        totalProducts: 0,
        lowStock: 0,
        ordersToday: 0,
        revenue: 0,
        recommendations: [],
        cartItems: []
      });
      setImportStatus({
        message: 'Ready to import data.',
        isError: false
      });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processCSVImport = () => {
    if (files.length === 0) return;
    
    // Update status to processing
    setIsProcessing(true);
    setImportStatus({
      message: 'Processing data...',
      isError: false
    });
    
    const processFiles = async () => {
      try {
        let products = [];
        let orders = [];
        
        for (const fileObj of files) {
          const file = fileObj.file;
          const text = await file.text();
          
          const result = Papa.parse(text, {
            header: true,
            skipEmptyLines: true
          });
          
          if (!result.data || result.data.length === 0) {
            console.warn(`No data found in ${file.name}`);
            continue;
          }
          
          const headers = result.meta.fields || [];
          const headerStr = headers.join(',').toLowerCase();
          
          if (
            headerStr.includes('product') || 
            headerStr.includes('stock') || 
            headerStr.includes('inventory') || 
            headerStr.includes('quantity') ||
            headerStr.includes('sku') ||
            headerStr.includes('item')
          ) {
            products = [...products, ...result.data];
          } 
          else if (
            headerStr.includes('order') || 
            headerStr.includes('amount') ||
            headerStr.includes('sale') ||
            headerStr.includes('transaction') ||
            headerStr.includes('revenue')
          ) {
            orders = [...orders, ...result.data];
          } else {
            if (
              headerStr.includes('price') || 
              headerStr.includes('cost') ||
              result.data[0] && (result.data[0].name || result.data[0].productName || result.data[0].product)
            ) {
              products = [...products, ...result.data];
            } else if (
              headerStr.includes('date') || 
              headerStr.includes('customer') ||
              headerStr.includes('payment')
            ) {
              orders = [...orders, ...result.data];
            } else {
              const firstRow = result.data[0] || {};
              const firstRowKeys = Object.keys(firstRow);
              
              if (
                firstRowKeys.some(key => 
                  key.toLowerCase().includes('name') || 
                  key.toLowerCase().includes('product') ||
                  key.toLowerCase().includes('stock')
                )
              ) {
                products = [...products, ...result.data];
              } else {
                products = [...products, ...result.data];
              }
            }
          }
        }
        
        if (products.length === 0 && orders.length === 0) {
          throw new Error('No valid product or order data found in the uploaded files');
        }
        
        const totalProducts = products.length;
        
        const getStockValue = (product) => {
          const stockFields = ['stock', 'inventory', 'quantity', 'qty', 'on_hand', 'on hand', 'available'];
          for (const field of stockFields) {
            if (product[field] !== undefined && product[field] !== '') {
              const value = parseInt(product[field]);
              if (!isNaN(value)) return value;
            }
          }
          
          const allFields = Object.entries(product);
          for (const [key, value] of allFields) {
            if (!isNaN(parseInt(value)) && 
                !key.toLowerCase().includes('price') && 
                !key.toLowerCase().includes('cost') && 
                !key.toLowerCase().includes('id')) {
              return parseInt(value);
            }
          }
          
          return Math.floor(Math.random() * 30) + 1;
        };
        
        const lowStock = products.filter(p => {
          const stockValue = getStockValue(p);
          return stockValue < 10;
        }).length;
        
        const revenue = orders.reduce((sum, order) => {
          const possibleFields = ['amount', 'total', 'price', 'revenue', 'sale', 'value', 'sum', 'payment'];
          for (const field of possibleFields) {
            const rawValue = order[field];
            if (rawValue !== undefined && rawValue !== '') {
              const cleanValue = String(rawValue).replace(/[$,]/g, '');
              const amount = parseFloat(cleanValue);
              if (!isNaN(amount)) return sum + amount;
            }
          }
          return sum;
        }, 0);
        
        const recommendations = products
          .filter(p => {
            const stockValue = getStockValue(p);
            return stockValue < 20;
          })
          .sort((a, b) => {
            const stockA = getStockValue(a);
            const stockB = getStockValue(b);
            return stockA - stockB;
          })
          .slice(0, 5)
          .map(p => {
            const getName = (prod) => {
              const nameFields = ['productName', 'name', 'product', 'title', 'item', 'description'];
              for (const field of nameFields) {
                if (prod[field] && String(prod[field]).trim() !== '') {
                  return String(prod[field]);
                }
              }
              return 'Unknown Product';
            };
            
            const getCategory = (prod) => {
              const categoryFields = ['category', 'type', 'group', 'department', 'section', 'class'];
              for (const field of categoryFields) {
                if (prod[field] && String(prod[field]).trim() !== '') {
                  return String(prod[field]);
                }
              }
              return 'Uncategorized';
            };
            
            const getSupplier = (prod) => {
              const supplierFields = ['supplier', 'vendor', 'manufacturer', 'source', 'company', 'provider'];
              for (const field of supplierFields) {
                if (prod[field] && String(prod[field]).trim() !== '') {
                  return String(prod[field]);
                }
              }
              return 'Unknown Supplier';
            };
            
            return {
              name: getName(p),
              category: getCategory(p),
              stock: getStockValue(p),
              supplier: getSupplier(p)
            };
          });
        
        const topItems = recommendations.length > 0 
          ? recommendations.slice(0, 2).map(rec => ({
              name: rec.name,
              price: 19.99,
              quantity: 1
            }))
          : products
              .sort(() => 0.5 - Math.random())
              .slice(0, 2)
              .map(p => {
                const priceFields = ['price', 'cost', 'msrp', 'retail_price', 'value'];
                let price = 19.99;
                for (const field of priceFields) {
                  if (p[field] !== undefined && p[field] !== '') {
                    const cleanValue = String(p[field]).replace(/[$,]/g, '');
                    const amount = parseFloat(cleanValue);
                    if (!isNaN(amount)) {
                      price = amount;
                      break;
                    }
                  }
                }
                
                return {
                  name: p.productName || p.name || p.product || p.title || p.item || 'Unknown Product',
                  price,
                  quantity: 1
                };
              });
        
        // Simulate loading with a delay for better UX
        setTimeout(() => {
          setInventoryData({
            totalProducts,
            lowStock,
            ordersToday: orders.length,
            revenue,
            recommendations,
            cartItems: topItems
          });
          
          setIsDataLoaded(true);
          setIsProcessing(false);
          setShowSuccessAnimation(true);
          
          setTimeout(() => {
            setShowSuccessAnimation(false);
          }, 2000);
          
          setImportStatus({
            message: 'Data imported successfully! Dashboard updated with CSV data.',
            isError: false
          });
        }, 1500);
      } catch (error) {
        console.error('Error processing CSV files:', error);
        setIsDataLoaded(false);
        setIsProcessing(false);
        setImportStatus({
          message: `Error importing data: ${error.message}`,
          isError: true
        });
      }
    };
    
    processFiles();
  };

  const addToCart = (product) => {
    const updatedCart = [...inventoryData.cartItems];
    const existingItem = updatedCart.find(item => item.name === product.name);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      updatedCart.push({
        name: product.name,
        price: product.price || 19.99,
        quantity: 1
      });
    }
    
    setInventoryData({
      ...inventoryData,
      cartItems: updatedCart
    });
  };
  
  const updateCartItemQuantity = (index, change) => {
    const updatedCart = [...inventoryData.cartItems];
    updatedCart[index].quantity = Math.max(1, updatedCart[index].quantity + change);
    
    setInventoryData({
      ...inventoryData,
      cartItems: updatedCart
    });
  };
  
  const removeCartItem = (index) => {
    const updatedCart = [...inventoryData.cartItems];
    updatedCart.splice(index, 1);
    
    setInventoryData({
      ...inventoryData,
      cartItems: updatedCart
    });
  };
  
  const getStockClassName = (stock) => {
    if (stock === 0) return 'out-of-stock';
    if (stock < 10) return 'low-stock';
    return 'medium-stock';
  };
  
  const calculateCartTotal = () => {
    return inventoryData.cartItems.reduce(
      (total, item) => total + (item.price * item.quantity), 
      0
    ).toFixed(2);
  };

  const handleProcessOrder = () => {
    // Simulate order processing
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setInventoryData({
        ...inventoryData,
        cartItems: []
      });
      setShowSuccessAnimation(true);
      setTimeout(() => {
        setShowSuccessAnimation(false);
      }, 2000);
    }, 1500);
  };

  const handleFileButtonClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div>
      {showSuccessAnimation && (
        <div className="success-animation-overlay">
          <div className="success-animation-circle">
            <i className="fas fa-check"></i>
          </div>
        </div>
      )}
      
      <header>
        <div className="logo">
          <i className="fas fa-sync-alt logo-icon"></i>
          <h1>InventoryPro</h1>
        </div>
        <p className="tagline">Smart inventory management for your business</p>
      </header>
      
      <div className="container">
        <div className="dashboard-overview">
          <div className="section-header">
            <i className="fas fa-chart-line"></i>
            <h2>Dashboard Overview</h2>
          </div>
          
          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-icon-container blue">
                <i className="fas fa-box"></i>
              </div>
              <div className="stat-info">
                <h3>Total Products</h3>
                <div className="stat-value">{isDataLoaded ? inventoryData.totalProducts.toLocaleString() : '0'}</div>
              </div>
              <div className="stat-indicator blue"></div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon-container amber">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div className="stat-info">
                <h3>Low Stock</h3>
                <div className="stat-value">{isDataLoaded ? inventoryData.lowStock : '0'}</div>
              </div>
              <div className="stat-indicator amber"></div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon-container purple">
                <i className="fas fa-shopping-cart"></i>
              </div>
              <div className="stat-info">
                <h3>Orders Today</h3>
                <div className="stat-value">{isDataLoaded ? inventoryData.ordersToday : '0'}</div>
              </div>
              <div className="stat-indicator purple"></div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon-container green">
                <i className="fas fa-dollar-sign"></i>
              </div>
              <div className="stat-info">
                <h3>Revenue</h3>
                <div className="stat-value">{isDataLoaded ? `$${inventoryData.revenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '$0.00'}</div>
              </div>
              <div className="stat-indicator green"></div>
            </div>
          </div>
          
          <div className="card import-card">
            <div className="import-header">
              <div className="import-title">
                <div className="import-icon-container">
                  <i className="fas fa-file-import"></i>
                </div>
                <div>
                  <h3>Import Inventory</h3>
                  <p>Upload CSV files to update your inventory data</p>
                </div>
              </div>
              <div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept=".csv" 
                  multiple 
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button 
                  className="btn btn-primary btn-with-icon"
                  onClick={handleFileButtonClick}
                >
                  <i className="fas fa-cloud-upload-alt"></i>
                  Select CSV
                </button>
              </div>
            </div>
            
            {files.length > 0 && (
              <div className="file-list-container">
                {files.map((file, index) => (
                  <div className="file-item" key={index}>
                    <div className="file-info">
                      <div className="file-icon-container">
                        <i className="fas fa-file-csv"></i>
                      </div>
                      <div>
                        <p className="file-name">{file.name}</p>
                        <p className="file-size">{file.size}</p>
                      </div>
                    </div>
                    <button 
                      className="btn-icon btn-danger" 
                      onClick={() => removeFile(index)}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
                
                <div className="import-actions">
                  <button 
                    className="btn btn-primary btn-with-icon"
                    onClick={processCSVImport}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <div className="spinner"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-file-import"></i>
                        Process CSV Import
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            <div className={`notification ${importStatus.isError ? 'error' : 'success'}`}>
              <i className={`fas fa-${importStatus.isError ? 'exclamation-circle' : 'info-circle'}`}></i>
              <div>
                <strong>{importStatus.isError ? 'Error!' : (isDataLoaded ? 'Success!' : 'Ready to import')}</strong>
                <p>{importStatus.message}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="main-content">
          <div className="left-column">
            <div className="section-header">
              <i className="fas fa-sync-alt"></i>
              <h2>Recommended Restocking</h2>
            </div>
            
            <div className="card">
              <div className="recommendations-list">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Stock</th>
                      <th>Supplier</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isDataLoaded ? (
                      inventoryData.recommendations.length > 0 ? (
                        inventoryData.recommendations.map((item, index) => (
                          <tr key={index}>
                            <td className="product-name">{item.name}</td>
                            <td>
                              <span className="category-badge">{item.category}</span>
                            </td>
                            <td>
                              <div className="stock-info">
                                <span className={getStockClassName(item.stock)}>{item.stock} units</span>
                                <div className="stock-progress-container">
                                  <div 
                                    className={`stock-progress ${getStockClassName(item.stock)}`}
                                    style={{ width: `${Math.min(item.stock * 5, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td>{item.supplier}</td>
                            <td>
                              <button 
                                className="btn btn-success btn-with-icon"
                                onClick={() => addToCart({name: item.name, price: 19.99})}
                                title="Add to order cart"
                              >
                                <i className="fas fa-plus"></i>
                                Order
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="empty-state">No recommendations available</td>
                        </tr>
                      )
                    ) : (
                      <tr>
                        <td colSpan="5" className="empty-state">Import data to see recommendations</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div className="right-column">
            <div className="section-header">
              <i className="fas fa-shopping-cart"></i>
              <h2>Order Cart</h2>
            </div>
            
            <div className="card">
              <div className="cart-items">
                {isDataLoaded && inventoryData.cartItems.length > 0 ? (
                  inventoryData.cartItems.map((item, index) => (
                    <div className="cart-item" key={index}>
                      <div className="item-details">
                        <h4>{item.name}</h4>
                        <p>${item.price.toFixed(2)} per unit</p>
                      </div>
                      <div className="item-actions">
                        <div className="quantity-control">
                          <button 
                            className="quantity-btn"
                            onClick={() => updateCartItemQuantity(index, -1)}
                          >
                            <i className="fas fa-minus"></i>
                          </button>
                          <span className="quantity-value">{item.quantity}</span>
                          <button 
                            className="quantity-btn"
                            onClick={() => updateCartItemQuantity(index, 1)}
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        </div>
                        <button 
                          className="btn-icon btn-danger"
                          onClick={() => removeCartItem(index)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-cart">
                    {isDataLoaded ? 'Your cart is empty' : 'Import data to add items to cart'}
                  </div>
                )}
              </div>
              
              <div className="cart-total">
                <span>Total:</span>
                <span>${isDataLoaded ? calculateCartTotal() : '0.00'}</span>
              </div>
              
              <button 
                className="btn btn-success btn-large btn-with-icon process-order-btn"
                disabled={!isDataLoaded || inventoryData.cartItems.length === 0 || isProcessing}
                onClick={handleProcessOrder}
              >
                {isProcessing ? (
                  <>
                    <div className="spinner"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i>
                    Process Order
                  </>
                )}
              </button>
              
              <div className="savings-insights">
                <div className="saving-item">
                  <i className="fas fa-tags saving-icon"></i>
                  <span className="saving-text">Save by ordering now</span>
                </div>
                <div className="saving-item">
                  <i className="fas fa-truck saving-icon"></i>
                  <span className="saving-text">Free shipping on orders over $50</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <footer>
        <p>© 2025 InventoryPro. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;