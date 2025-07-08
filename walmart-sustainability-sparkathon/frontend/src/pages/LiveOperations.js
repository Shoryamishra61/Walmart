import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import ThreeDVisualization from '../components/dashboard/3DVisualization';
import DigitalPassportModal from '../components/dashboard/DigitalPassportModal'; // Import the new modal
import { LuQrCode } from 'react-icons/lu';

const socket = io('http://localhost:3001');

function LiveOperations() {
  const [inventory, setInventory] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [errorInitial, setErrorInitial] = useState(null);

  const isNearingExpiry = (expiryDateStr) => {
    if (!expiryDateStr || expiryDateStr === 'N/A') {
      return false;
    }
    const expiryDate = new Date(expiryDateStr);
    const today = new Date();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    return expiryDate >= today && expiryDate <= sevenDaysFromNow;
  };

  useEffect(() => {
    // Listen for real-time updates from the smart shelves
    socket.on('full_inventory_update', (updatedInventory) => {
      setInventory(updatedInventory.map(item => ({
        ...item,
        price: parseFloat(item.price) || 0,
        originalPrice: parseFloat(item.originalPrice) || parseFloat(item.price) || 0, // Fallback to price if originalPrice missing
        discountedPrice: item.discountedPrice !== undefined ? parseFloat(item.discountedPrice) : null,
        discountPercentage: parseFloat(item.discountPercentage) || 0,
        expiryDate: item.expiryDate || 'N/A', // Default if missing
        status: item.status || 'Unknown',
      })));
    });

    // Fetch the initial state of the inventory
    const fetchInitialInventory = async () => {
        setIsLoadingInitial(true);
        setErrorInitial(null);
        try {
            const res = await fetch('http://localhost:3001/api/inventory');
            if (!res.ok) throw new Error(`Failed to fetch initial inventory: ${res.statusText}`);
            const data = await res.json();
            setInventory(data.map(item => ({
                ...item,
                price: parseFloat(item.price) || 0,
                originalPrice: parseFloat(item.originalPrice) || parseFloat(item.price) || 0,
                discountedPrice: item.discountedPrice !== undefined ? parseFloat(item.discountedPrice) : null,
                discountPercentage: parseFloat(item.discountPercentage) || 0,
                expiryDate: item.expiryDate || 'N/A',
                status: item.status || 'Unknown',
            })));
        } catch (error) {
            console.error("Error fetching initial inventory:", error);
            setErrorInitial(error.message);
        }
        setIsLoadingInitial(false);
    }
    fetchInitialInventory();

    return () => socket.off('full_inventory_update');
  }, []);

  // Function to open the Digital Passport
  const handleScanProduct = async (productId) => {
    try {
        const res = await fetch(`http://localhost:3001/api/inventory/product/${productId}`);
        const data = await res.json();
        setSelectedProduct(data);
    } catch (error) {
        console.error("Error fetching product details:", error);
    }
  };

  // Function to log the recycling activity
  const handleRecycleLog = async (productId) => {
      try {
          await fetch('http://localhost:3003/api/circularity/recycle', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ customerId: '12345', productId: productId }) // Using a sample customerId
          });
      } catch (error) {
          console.error("Error logging recycling:", error);
      }
  };

  return (
    <>
        <DigitalPassportModal 
            product={selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
            onRecycle={handleRecycleLog}
        />
        <div className="page-container">
          <h1 className="page-title">Live Store Operations</h1>
          <div className="live-operations-layout">
            <div className="store-visualization-panel">
              <h3>Store Hotspot Map</h3>
              <ThreeDVisualization inventory={inventory} />
            </div>
            <div className="live-inventory-panel">
              <h3>Live Inventory Status (Smart Shelf Data)</h3>
               <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Offer Price</th> {/* New Column for Discounted Price */}
                      <th>Status</th>
                      <th>Expiry Date</th>
                      <th>Ethical Score</th>
                      <th>Scan Passport</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingInitial && (
                        <tr><td colSpan="7" style={{ textAlign: 'center' }}>Loading live inventory...</td></tr> {/* Updated colSpan */}
                    )}
                    {errorInitial && (
                        <tr><td colSpan="7" style={{ textAlign: 'center', color: 'red' }}>Error: {errorInitial}</td></tr> {/* Updated colSpan */}
                    )}
                    {!isLoadingInitial && !errorInitial && inventory.length === 0 && (
                        <tr><td colSpan="7" style={{ textAlign: 'center' }}>No inventory items to display.</td></tr> {/* Updated colSpan */}
                    )}
                    {!isLoadingInitial && !errorInitial && inventory.map(item => (
                      <tr key={item.id} className={`status-${item.status.replace(/\s+/g, '-').toLowerCase()}`}>
                        <td>{item.name}</td>
                        <td> {/* Price Column - shows original if discounted, else current price */}
                          {item.discountedPrice !== null && item.discountedPrice < item.originalPrice ? (
                            <>
                              <span style={{ textDecoration: 'line-through', color: '#888' }}>
                                ${item.originalPrice.toFixed(2)}
                              </span>
                            </>
                          ) : (
                            `$${item.price.toFixed(2)}`
                          )}
                        </td>
                        <td> {/* Offer Price Column */}
                          {item.discountedPrice !== null && item.discountedPrice < item.originalPrice ? (
                            <strong style={{ color: 'green' }}>${item.discountedPrice.toFixed(2)}</strong>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td>{item.status}</td>
                        <td className={isNearingExpiry(item.expiryDate) ? 'nearing-expiry' : ''}>{item.expiryDate}</td>
                        <td>{item.ethical_sourcing_score || 'N/A'}</td>
                        <td>
                            <button className="scan-button" onClick={() => handleScanProduct(item.id)}>
                                <LuQrCode />
                            </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
        </div>
    </>
  );
}

export default LiveOperations;
