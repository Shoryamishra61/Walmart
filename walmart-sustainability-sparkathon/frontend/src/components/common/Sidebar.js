// File: frontend/src/components/common/Sidebar.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LuLayoutDashboard, LuStore, LuBrainCircuit, LuHeartHandshake, LuUsers } from 'react-icons/lu';
import ThemeToggle from './ThemeToggle'; // Import the toggle
import './Sidebar.css';

function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <div className="logo">G</div>
        <span>Green-Spark</span>
      </div>
      <ul className="sidebar-menu">
        {/* ... NavLink items remain the same ... */}
        <li>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            <LuLayoutDashboard />
            <span>Overview</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/operations" className={({ isActive }) => (isActive ? 'active' : '')}>
            <LuStore />
            <span>Live Operations</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/forecasting" className={({ isActive }) => (isActive ? 'active' : '')}>
            <LuBrainCircuit />
            <span>Demand Forecasting</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/donations" className={({ isActive }) => (isActive ? 'active' : '')}>
            <LuHeartHandshake />
            <span>Donation Hub</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/customers" className={({ isActive }) => (isActive ? 'active' : '')}>
            <LuUsers />
            <span>Customer Insights</span>
          </NavLink>
        </li>
      </ul>
      <div className="sidebar-footer">
        <ThemeToggle />
      </div>
    </nav>
  );
}

export default Sidebar;
