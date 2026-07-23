import React, { useState } from 'react';
import { searchBooks, filterBooksByAvailability } from '../../services/api';

const BookSearch = ({ onResults }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('query');
  const [filterAvailable, setFilterAvailable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle search
  const handleSearch = async () => {
    if (!searchTerm.trim() && filterAvailable === null) {
      setError('Please enter search term or select filter');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      let results = [];
      
      // If filter is active
      if (filterAvailable !== null) {
        results = await filterBooksByAvailability(filterAvailable);
      }
      
      // If search term exists
      if (searchTerm.trim()) {
        const searchParams = {};
        if (searchType === 'query') {
          searchParams.query = searchTerm;
        } else if (searchType === 'author') {
          searchParams.author = searchTerm;
        } else if (searchType === 'genre') {
          searchParams.genre = searchTerm;
        }
        
        const searchResults = await searchBooks(searchParams);
        
        // Combine results if both filters applied
        if (filterAvailable !== null) {
          results = results.filter(book => 
            searchResults.some(s => s.id === book.id)
          );
        } else {
          results = searchResults;
        }
      }
      
      if (onResults) onResults(results);
      
    } catch (err) {
      setError('Search failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Clear search
  const handleClear = () => {
    setSearchTerm('');
    setSearchType('query');
    setFilterAvailable(null);
    setError('');
    if (onResults) onResults(null);
  };

  return (
    <div className="book-search-container">
      <div className="search-controls">
        {/* Search Type Selector */}
        <select 
          value={searchType} 
          onChange={(e) => setSearchType(e.target.value)}
          className="search-type"
        >
          <option value="query">All Fields</option>
          <option value="author">Author</option>
          <option value="genre">Genre</option>
        </select>

        {/* Search Input */}
        <input
          type="text"
          placeholder="Search books..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="search-input"
        />

        <button onClick={handleSearch} className="search-btn" disabled={loading}>
          {loading ? 'Searching...' : '🔍 Search'}
        </button>
        <button onClick={handleClear} className="clear-btn">
          Clear
        </button>
      </div>

      {/* Filter Options */}
      <div className="filter-controls">
        <label>Filter by Availability:</label>
        <button 
          className={filterAvailable === null ? 'active' : ''}
          onClick={() => setFilterAvailable(null)}
        >
          All
        </button>
        <button 
          className={filterAvailable === true ? 'active' : ''}
          onClick={() => setFilterAvailable(true)}
        >
          ✅ Available
        </button>
        <button 
          className={filterAvailable === false ? 'active' : ''}
          onClick={() => setFilterAvailable(false)}
        >
          ❌ Unavailable
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}
    </div>
  );
};

export default BookSearch;