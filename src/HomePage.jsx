import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="home-grid">
      <Link to="/libraries" className="page-preview">
        <div className="page-thumbnail">
          <img src="/assets/page1_preview.jpg" alt="Libraries Page" />
        </div>
        <h2 className="page-title">My Libraries</h2>
      </Link>
      
      <Link to="/bookshelf" className="page-preview">
        <div className="page-thumbnail">
          <img src="/assets/page2_preview.jpg" alt="Bookshelf Page" />
        </div>
        <h2 className="page-title">My Bookshelf</h2>
      </Link>
      
      <Link to="/yearly-wrapup" className="page-preview">
        <div className="page-thumbnail">
          <img src="/assets/page3_preview.jpg" alt="Yearly Wrapup" />
        </div>
        <h2 className="page-title">My Yearly Wrapup</h2>
      </Link>
      
      <Link to="/dnf" className="page-preview">
        <div className="page-thumbnail">
          <img src="/assets/page4_preview.jpg" alt="DNF Page" />
        </div>
        <h2 className="page-title">DNF</h2>
      </Link>
    </div>
  );
};

export default HomePage;