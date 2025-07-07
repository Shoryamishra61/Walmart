import React from 'react';
import './DigitalPassportModal.css';

function DigitalPassportModal({ product, onClose, onRecycle }) {
    if (!product) return null;

    const handleRecycleClick = () => {
        onRecycle(product.id);
        alert(`Recycling logged for ${product.name}! Thank you for participating.`);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="close-button" onClick={onClose}>&times;</button>
                <h2>{product.name} - Digital Passport</h2>
                
                <div className="passport-section">
                    <h3>Source Story</h3>
                    <p><strong>Supplier:</strong> {product.supplier_name || 'N/A'}</p>
                    <p><strong>Ethical Sourcing Score:</strong> {product.ethical_sourcing_score || 'N/A'} / 100</p>
                </div>

                <div className="passport-section">
                    <h3>AI-Generated Recipe Suggestions</h3>
                    <ul>
                        {product.recipes && product.recipes.map((recipe, index) => <li key={index}>{recipe}</li>)}
                    </ul>
                </div>

                <div className="passport-section">
                    <h3>Recycling Guide</h3>
                    <p>Rinse the container and recycle it in the appropriate bin. The plastic film is not recyclable.</p>
                </div>

                <button className="recycle-button" onClick={handleRecycleClick}>
                    Log Recycling Activity
                </button>
            </div>
        </div>
    );
}

export default DigitalPassportModal;