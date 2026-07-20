import React, { useEffect, useState } from 'react';

export default function App() {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const menuItems = ['Home', 'Movies', 'TV Shows', 'Search', 'Settings'];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        setFocusedIndex((prev) => Math.min(prev + 1, menuItems.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        alert(`Selected: ${menuItems[focusedIndex]}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex]);

  return (
    <div style={{ padding: '8%', textAlign: 'center' }}>
      <h1>ReelixTV</h1>
      <p>Use your keyboard Left / Right arrows & Enter to test TV navigation</p>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '40px' }}>
        {menuItems.map((item, index) => (
          <div
            key={item}
            style={{
              padding: '15px 30px',
              background: focusedIndex === index ? '#e50914' : '#222',
              border: '3px solid',
              borderColor: focusedIndex === index ? '#fff' : 'transparent',
              transform: focusedIndex === index ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.2s ease',
              borderRadius: '8px',
              fontSize: '20px',
              fontWeight: 'bold'
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
