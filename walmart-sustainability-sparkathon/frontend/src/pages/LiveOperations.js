import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import ThreeDVisualization from '../components/dashboard/3DVisualization';
import DigitalPassportModal from '../components/dashboard/DigitalPassportModal'; // Import the new modal
import { LuQrCode } from 'react-icons/lu';

const socket = io('http://localhost:3001');

function LiveOperations() {
  const [inventory, setInventory] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    // Listen for real-time updates from the smart shelves
    socket.on('full_inventory_update', (updatedInventory) => {
      setInventory(updatedInventory.map(item => ({...item, price: parseFloat(item.price)})));
    });

    // Fetch the initial state of the inventory
    const fetchInitialInventory = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/inventory');
            const data = await res.json();
            setInventory(data.map(item => ({...item, price: parseFloat(item.price)})));
        } catch (error) {
            console.error("Error fetching initial inventory:", error);
        }
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
                      <th>Status</th>
                      <th>Ethical Score</th>
                      <th>Scan Passport</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(item => (
                      <tr key={item.id} className={`status-${item.status.replace(/\s+/g, '-').toLowerCase()}`}>
                        <td>{item.name}</td>
                        <td>${item.price.toFixed(2)}</td>
                        <td>{item.status}</td>
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
