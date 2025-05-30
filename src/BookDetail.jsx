import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import './BookDetail.css';
import { useParams, Link } from 'react-router-dom';
import { useSession } from '@supabase/auth-helpers-react';
// API base URL
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Unified cover URL handling: serve local uploads directly, proxy remote covers
function getCoverUrl(url) {
  if (!url) return ''; // Handle empty URLs gracefully
  if (url.startsWith('/')) return `${BASE_URL}${url}`; // Serve local uploads directly
  const httpsUrl = url.startsWith('http://') ? url.replace('http://', 'https://') : url; // Ensure HTTPS
  return `${BASE_URL}/api/cover-proxy?url=${encodeURIComponent(httpsUrl)}`; // Use backend proxy for remote covers
}

function BookDetail({ onBookUpdate }) {
  const { id } = useParams();
  // Removed unused navigate variable
  const session = useSession();

  const wrapperRef = useRef(null);

  // Always scroll to the top of the page when entering BookDetail
  useLayoutEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, [id]);
  const [bookData, setBookData] = useState(null);

  const [summary, setSummary] = useState('');
  const [pageCount, setPageCount] = useState('');
  const [quote, setQuote] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    if (!session) return;
    async function loadBook() {
      try {
        const res = await fetch(`${BASE_URL}/api/books/${id}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        setBookData(data);
        setSummary(data.summary ?? '');
        setPageCount(data.page_count ?? '');
        setQuote(data.quote ?? '');
      } catch (err) {
        console.error('Failed to load book detail:', err);
      }
    }
    loadBook();
  }, [id, session]);

  useEffect(() => {
    if (bookData) {
      // Only populate if not currently editing
      if (!isEditing) {
        if (summary === '') setSummary(bookData.summary ?? '');
        if (pageCount === '') setPageCount(bookData.page_count ?? '');
        if (quote === '') setQuote(bookData.quote ?? '');

        if (pageCount === '') {
          fetch(`${import.meta.env.VITE_API_BASE_URL}/api/smartsearch?q=${encodeURIComponent(bookData.title + ' ' + bookData.author)}`, {
            headers: {
              'Authorization': `Bearer ${session?.access_token}`
            }
          })
            .then(res => res.json())
            .then(result => {
              const first = Array.isArray(result) && result.length > 0 ? result[0] : null;
              if (first?.page_count) {
                setPageCount(first.page_count);
                fetch(`${import.meta.env.VITE_API_BASE_URL}/api/books/${bookData.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ page_count: first.page_count })
                })
                .then(res => res.json())
                .then(updated => console.log('✅ Page count updated from backend smart search:', updated))
                .catch(err => console.error('❌ Failed to update page count in backend:', err));
              }
            })
            .catch(err => console.error('❌ Smart search fetch failed:', err));
        }
      }
    }
  }, [bookData, isEditing, summary, pageCount, quote, session]);

  const handleSave = async () => {
    if (!session) return;

    try {
      const response = await fetch(`${BASE_URL}/api/books/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          summary,
          page_count: parseInt(pageCount) || 0,
          quote
        })
      });

      if (!response.ok) throw new Error('Failed to update book');

      const result = await response.json();

      // Update both local state and parent component
      setBookData(prev => ({ ...prev, ...result.book }));
      if (onBookUpdate) onBookUpdate(result.book);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating book:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  const fetchNewCovers = async (book) => {
    if (!book || !session) return;

    try {
      const response = await fetch(`${BASE_URL}/api/books/${book.id}/covers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch new covers');

      const result = await response.json();
      setBookData(prev => ({ ...prev, ...result.book }));
    } catch (error) {
      console.error('Error fetching new covers:', error);
      alert('Failed to fetch new covers. Please try again.');
    }
  };

  if (!bookData) return (
    <>
      <button
        onClick={() => {
          const previousScroll = sessionStorage.getItem('bookGridScroll');
          if (previousScroll) {
            window.history.back(); // Use browser history to go back
          } else {
            window.location.href = '/';
          }
        }}
        className="back-button"
        title="Retreat like the unprepared gremlin you are"
      >
        ← Back
      </button>
      <div className="book-detail-wrapper" ref={wrapperRef}>
        Book not found
      </div>
    </>
  );

  const effectivePageCount = Number(pageCount) || bookData.page_count || 0;
  const readingTime = Math.ceil(effectivePageCount / 50);

  console.log('📘 Rendering BookDetail with:', bookData, { summary, pageCount, quote });
  return (
    <>
      {/* Settings button in top right */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <button
          onClick={() => setShowSettingsModal(true)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            color: '#ccc',
            cursor: 'pointer'
          }}
          title="Settings"
        >
          ⚙️
        </button>
      </div>
      {/* Settings modal overlay */}
      {showSettingsModal && (
        <div className="modal-overlay">
          <div className="modal-backdrop" onClick={() => setShowSettingsModal(false)}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '500px', padding: '2.5rem', textAlign: 'center', position: 'relative' }}
            >
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: '#fff',
                  cursor: 'pointer'
                }}
                title="Close"
              >
                ✖️
              </button>
              <h2 style={{ marginBottom: '1rem', color: '#ff9966' }}>⚙️ Settings</h2>
              <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: '#ccc' }}>
                📬 Contact: <a
                  href="mailto:soulburningbooks@gmail.com"
                  style={{ color: '#ffcc99', textDecoration: 'underline' }}
                  title="Summon me with bug reports or chaos requests"
                >soulburningbooks@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={() => {
          const previousScroll = sessionStorage.getItem('bookGridScroll');
          if (previousScroll) {
            window.history.back(); // Use browser history to go back
          } else {
            window.location.href = '/';
          }
        }}
        className="back-button"
        title="Retreat like the unprepared gremlin you are"
      >
        ← Back
      </button>
      <div className="book-detail-wrapper" ref={wrapperRef}>
        <div className="book-detail-header">
          <img
            src={getCoverUrl(bookData.cover || bookData.cover_google || bookData.cover_local)}
            alt="cover"
            className="book-detail-cover"
          />
          <div style={{ flex: 1 }}>
            {bookData.series && (
              <div className="book-series-info">
                <p className="series-name" title="Another never-ending emotional rollercoaster">{bookData.series}</p>
                {bookData.book_number && (
                  <p className="series-number" title="Commitment level: questionable">Book {bookData.book_number}</p>
                )}
                {bookData.series.toLowerCase() !== 'standalone' && (
                  <p className="series-link">
                    <Link to={`/series/${encodeURIComponent(bookData.series)}`}>
                      &#10148; View Series
                    </Link>
                  </p>
                )}
              </div>
            )}
            <div className="book-detail-meta" style={{ overflow: 'hidden' }}>
              <h1 className="book-title">{bookData.title}</h1>
              <h2>by {bookData.author}</h2>
              <p>
                <strong title="Ah yes, the date your soul left your body">Date Read:</strong>{' '}
                {bookData.date_read
                  ? new Date(bookData.date_read).toLocaleDateString('en-US')
                  : 'Unknown'}
              </p>
              <p><strong title="Pages you survived without DNF-ing">Pages:</strong> {isEditing ? (
                <input
                  type="number"
                  value={pageCount}
                  onChange={e => setPageCount(e.target.value)}
                  style={{ width: '80px' }}
                  title="Pages you survived without DNF-ing"
                />
              ) : (
                (pageCount || bookData.page_count) || '??'
              )}</p>
              <p>
                <strong title="Based on the sacred average of 50 pages per hour">Est. Reading Time:</strong>{' '}
                {readingTime > 0 ? `${readingTime} hour${readingTime > 1 ? 's' : ''}` : '??'}
              </p>
              <p><strong title="One star? Bold. Five? Who hurt you?">Rating:</strong> {bookData.rating ? `${bookData.rating} ★` : 'No rating'}</p>
              <div className="book-quote-wrapper" style={{ marginTop: '2rem' }}>
                <div className={`book-quote-bubble ${quote && quote.length > 130 ? 'long-quote' : ''}`} title="The line that either broke you or made you laugh like a maniac">
                  {isEditing ? (
                    <textarea
                      value={quote || ''}
                      onChange={e => setQuote(e.target.value)}
                      rows={3}
                      className="book-quote-textarea"
                      placeholder="Drop the quote that stabbed your feelings here"
                    />
                  ) : (
                    <blockquote>
                      { (quote || bookData.quote)
                        ? `“${quote || bookData.quote}”`
                        : <span className="quote-placeholder">Favorite Quote</span>
                      }
                    </blockquote>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="book-detail-summary">
          <h3 title="Spoil everything. Be dramatic.">📖 Summary</h3>
          {isEditing ? (
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              rows={10}
              className="book-summary-textarea"
              placeholder="Summarize the trauma, chaos, or plot holes"
            />
          ) : (
            <p>
              {(summary || bookData.summary)
                ? (summary || bookData.summary)
                : 'No summary yet. Add something juicy and dramatic.'
              }
            </p>
          )}
        </div>
        <div style={{ marginTop: '1rem' }}>
          {isEditing ? (
            <button onClick={handleSave} title="Seal your edits into bookish history">💾 Save</button>
          ) : (
            <button onClick={() => setIsEditing(true)} title="Ready your red pen of judgment">✏️ Edit</button>
          )}
        </div>
        <div style={{ marginTop: '1rem' }}>
          <button
            onClick={() => fetchNewCovers(bookData)}
            title="Fetch alternate covers for this book"
          >
            🔄 Refetch Covers
          </button>
        </div>
      </div>
    </>
  );
}

export default BookDetail;