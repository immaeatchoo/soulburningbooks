// Kristina-style: All imports go at the very top because React will cry if you scatter them around like confetti.
import React, { useState, useEffect, useRef } from 'react';
import './App.css'; // Because ugly apps are a crime.

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
// Helper to enforce HTTPS and proxy remote covers
const getCoverUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('/')) return url;
  const secure = url.startsWith('http://') ? url.replace(/^http:\/\//i, 'https://') : url;
  return `${BASE_URL}/api/cover-proxy?url=${encodeURIComponent(secure)}`;
};


// --------------------------
// 📚 STATE VARIABLES: Tracking All The Shit We Care About
// --------------------------

/* 🛑 ORGANIZATION PLAN FOR THIS CHAOS 🛑 */
/* Telling our future selves where stuff is stacked: 
  - Variables first
  - Functions second
  - Actual UI rendering last (the sexy stuff)
*/
// Kristina: AddBook is now a pure modal component, stateless, with all state/handlers passed in from App.jsx.
function AddBook({
  showModal,
  setShowModal,
  newBook,
  setNewBook,
  newSeriesName,
  setNewSeriesName,
  seriesOptions,
  handleChange,
  handleSubmit,
  handleStarClick,
  setPendingCoverFixes,
  setCurrentCoverSearchResults,
  setIsReviewingCovers,
  fetchNewCovers,
  BASE_URL,
  session
}) {

  
  // --- Smart Google Books Search State ---
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // -- Smart Search Local Cache, so we don't have to use API every single time 
  const cacheRef = useRef({});

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (newBook.title.length >= 4) {
        if (cacheRef.current[newBook.title]) {
          // Use cached data if available
          setSearchResults(cacheRef.current[newBook.title]);
          setShowDropdown(true);
        } else {
          // Directly query the live Google API endpoint with authorization header
          fetch(`${BASE_URL}/api/smartsearch?q=${encodeURIComponent(newBook.title)}`, {
            headers: {
              'Authorization': `Bearer ${session?.access_token}`
            }
          })
            .then((res) => res.json())
            .then((data) => {
              console.log("[SMART RAW DATA]", data);
              if (Array.isArray(data) && data.length > 0) {
                const lowerQuery = newBook.title.toLowerCase();
                const results = data
                  .filter(item => item.cover && item.title?.toLowerCase().includes(lowerQuery))
                  .map(item => ({
                    title: item.title || '',
                    author: item.author || '',
                    thumbnail: item.cover,
                    infoLink: item.infoLink || ''
                  }));
                cacheRef.current[newBook.title] = results;
                setSearchResults(results);
                setShowDropdown(results.length > 0);
              } else {
                setSearchResults([]);
                setShowDropdown(false);
              }
            })
            .catch(err => {
              console.error('❌ Smart search error:', err);
              setSearchResults([]);
              setShowDropdown(false);
            });
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [newBook.title, BASE_URL, session?.access_token]);

  // If the modal shouldn't show, don't even bother rendering it. Save those CPU cycles.
  if (!showModal) return null;

  {/* The backdrop is just a fancy way to let you click outside to close the modal. */}
// This is the big ugly modal overlay. Click outside the modal to close it, unless you have commitment issues. :)
  return (
    <div className="modal-overlay">
      {/* The backdrop is just a fancy way to let you click outside to close the modal. */}
      <div className="modal-backdrop" onClick={() => setShowModal(false)}>
        {/* This is the actual modal content. Don't click outside unless you're done. */}
        <div
          className="modal-content"
          onClick={(e) => e.stopPropagation()} // Stop click events from bubbling up and closing the modal. You're not done yet.
          style={{ overflow: 'visible' }}
        >
          {/* The ✖ button is here for people who hate their mouse. */}
          <button className="close-button" onClick={() => setShowModal(false)} title="Abandon ship">✖</button>
          {/* The actual form for adding a book. Yes, it's long. */}
          <form onSubmit={handleSubmit} className="add-book-form">
            {/* Row for title and author, because that's all anyone cares about. */}
            <div className="form-row title-author-row" style={{ position: 'relative' }}>
              {/* Book Title input. Required, because untitled books are a crime. */}
              <input
                type="text"
                name="title"
                placeholder="Title"
                value={newBook.title}
                onChange={handleChange}
                required
                className="form-control"
                autoComplete="off"
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                title="Give it a name, or forever hold your regret"
              />
              {/* Smart Google Books Search Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 2000 }}>
                  <div
                    className="smart-search-dropdown"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {searchResults.map((book, index) => (
                      <div
                        key={index}
                        className="smart-search-item"
                        onClick={() => {
                          setNewBook(prev => ({
                            ...prev,
                            title: book.title,
                            author: book.author,
                            cover: book.thumbnail,
                            cover_google: book.thumbnail  // 💥 this ensures it shows up in your book grid
                          }));
                          setShowDropdown(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.3rem 0.5rem',
                          cursor: 'pointer',
                          background: '#111',
                          borderBottom: '1px solid #333'
                        }}
                      >
                        {book.thumbnail && (
                          <img
                            src={getCoverUrl(book.thumbnail)}
                            alt="thumb"
                            style={{ width: '30px', height: '45px', objectFit: 'cover' }}
                          />
                        )}
                        <div style={{ color: '#fff', fontSize: '0.85rem' }}>
                          <div>{book.title}</div>
                          <div style={{ fontStyle: 'italic', color: '#aaa' }}>{book.author}</div>
                          <div style={{ display: 'none' }}>{book.infoLink}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Author input. Not required, because sometimes we all forget. */}
              <input
                type="text"
                name="author"
                placeholder="Author"
                value={newBook.author}
                onChange={handleChange}
                className="form-control"
                title="Or just say 'Anonymous' and gaslight future you"
              />
            {/* End of title and author row */}
            </div>
            {/* Row for series, book number, and date read. Because some people are organized. */}
            <div className="form-row series-number-date-row">
              {/* If you're not adding a new series, show the dropdown. Otherwise, let them type. */}
              {newBook.series !== '__new' ? (
                <select
                  name="series"
                  value={newBook.series}
                  onChange={handleChange}
                  className="form-control"
                  title="Choose your poison... or start a new one"
                >
                  {[...seriesOptions].sort().map((series, i) => (
  <option key={i} value={series}>{series}</option>
))}
                  {/* Option to add a new series if you like making things complicated. */}
                  <option value="__new">➕ Add New Series...</option>
                </select>
              ) : (
                <>
                  {/* Input for new series name. Because sometimes the dropdown just isn't enough. */}
                  <input
                    className="new-series-input"
                    type="text"
                    placeholder="Enter series name"
                    value={newSeriesName}
                    onChange={(e) => setNewSeriesName(e.target.value)}
                    onKeyDown={(e) => {
                      // If you hit Enter, we'll try to add the new series. Otherwise, do nothing.
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const updatedSeries = newSeriesName.trim();
                        if (updatedSeries) {
                          setNewBook((prev) => ({ ...prev, series: updatedSeries }));
                          setNewSeriesName('');
                        }
                      }
                    }}
                    required
                    title="Daring to start a saga, huh? Bold move"
                  />
                </>
              )}
              {/* Input for book number in the series. Optional, unless you like order. */}
              <input
                type="number"
                name="book_number"
                placeholder="Book #"
                value={newBook.book_number}
                onChange={handleChange}
                className="form-control"
                title="Where it sits in your spiral of commitment"
              />
              {/* Date read input. For the memory hoarders. */}
              <input
                type="date"
                name="date_read"
                placeholder="MM/DD/YYYY"
                value={newBook.date_read}
                onChange={handleChange}
                className="form-control"
                title="The day your soul left your body (or just when you finished the book)"
              />
            </div>
            {/* Cover upload area. Drag and drop your pretty pictures here. */}
            <div
              className="cover-upload"
              onDragOver={(e) => e.preventDefault()} // React hates default drag-n-drop. Prevent it.
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                const formData = new FormData();
                formData.append('file', file);
                fetch(`${import.meta.env.VITE_API_BASE_URL}/api/upload_cover`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                  },
                  body: formData
                })
                  .then((res) => res.json())
                  .then(({ cover_url }) => {
                    setNewBook((prev) => ({ ...prev, cover: cover_url }));
                  });
              }}
              style={{
                border: '2px dashed #ccc',
                padding: '1rem',
                marginBottom: '1rem',
                textAlign: 'center'
              }}
              title="Drop your lies here – aka a pretty cover"
            >
              {/* Show the cover image if available, otherwise beg for a drag-and-drop. */}
              {newBook.cover
                ? <img src={getCoverUrl(newBook.cover)} alt="Cover" style={{ maxWidth: '100%' }} />
                : 'Drag & drop a cover image here'}
            </div>
            {/* Star rating, because everyone loves stars. */}
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star ${star <= newBook.rating ? 'selected' : ''}`}
                  onClick={() => handleStarClick(star)}
                  aria-label={`${star} star`}
                  title={`I'd rate this a ${star} out of 'please make it stop'`}
                >
                  <span className="star-icon">★</span>
                </button>
              ))}
            </div>

            {/* Review Covers and Add Book buttons in a row */}
            <div className="button-row">
              <button
                type="button"
                className="review-covers-button small-button"
                onClick={() => {
                  // Kick off a cover‐review pass for the just-entered book:
                  setPendingCoverFixes([{ ...newBook }]);
                  setCurrentCoverSearchResults({});
                  setIsReviewingCovers(true);
                  fetchNewCovers(newBook); // Trigger cover fetching
                }}
                title="Summon alternate realities of this book's face"
              >
                🔍 Review Covers
              </button>
              <button
                type="submit"
                className="review-covers-button small-button"
                title={newBook.id ? "Apply your regret edits" : "Sacrifice this title to the library gods"}
              >
                {newBook.id ? "Update Book" : "Add Book"}
              </button>
            </div>
            {/* Google Books attribution footer: moved to bottom of modal */}
            <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '2rem', textAlign: 'center' }}>
              Book data powered by{' '}
              <a
                href="https://books.google.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#aaa' }}
              >
                Google Books
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddBook;

// <== END OF FILE ==>