// File: frontend/src/components/common/ThemeToggle.js
import React, { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { LuSun, LuMoon } from 'react-icons/lu';
import './ThemeToggle.css';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useContext(ThemeContext);

    return (
        <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? <LuMoon /> : <LuSun />}
        </button>
    );
};

export default ThemeToggle;
