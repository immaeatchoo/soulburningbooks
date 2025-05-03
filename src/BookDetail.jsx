import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import './BookDetail.css';
import { useParams } from 'react-router-dom';

function BookDetail({ books, onBookUpdate }) {
  const { id } = useParams();

  const wrapperRef = useRef(null);

  // Scroll to top of the wrapper when navigating between books
  useLayoutEffect(() => {
    if (wrapperRef.current) {
      wrapperRef.current.scrollIntoView({ block: 'start', behavior: 'auto' });
      // Nudge up a bit more to clear any fixed headers/margins
      window.scrollBy(0, -40);
    }
  }, [id]);
  const [bookData, setBookData] = useState(null);

  const [summary, setSummary] = useState('');
  const [pageCount, setPageCount] = useState('');
  const [quote, setQuote] = useState('');
  const [isEditing, setIsEditing] = useState(false);


  useEffect(() => {
    const foundBook = books.find(b => b.id.toString() === id);
    if (foundBook) {
      setBookData(foundBook);
    }
  }, [books, id]);

  useEffect(() => {
    if (bookData) {
      // Only populate if not currently editing
      if (!isEditing) {
        if (summary === '') setSummary(bookData.summary ?? '');
        if (pageCount === '') setPageCount(bookData.page_count ?? '');
        if (quote === '') setQuote(bookData.quote ?? '');

        if (!bookData.page_count) {
          fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(bookData.title)}+inauthor:${encodeURIComponent(bookData.author)}`)
            .then(res => res.json())
            .then(data => {
              const match = data.items?.[0]?.volumeInfo;
              if (match?.pageCount) {
                setPageCount(match.pageCount);
                fetch(`http://localhost:5001/books/${bookData.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ page_count: match.pageCount })
                })
                .then(res => res.json())
                .then(updated => console.log('✅ Page count updated from API:', updated))
                .catch(err => console.error('❌ Failed to update page count in backend:', err));
              }
            })
            .catch(err => console.error('📕 Failed to fetch page count from Google Books API:', err));
        }
      }
    }
  }, [bookData, isEditing, summary, pageCount, quote]);


  const handleSave = () => {
    fetch(`http://localhost:5001/books/${bookData.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary,
        page_count: pageCount,
        quote
      })
    })
      .then(res => res.json())
      .then(data => {
        setIsEditing(false);
        onBookUpdate(data);
        setBookData(data); // Use fresh backend response
        setSummary(data.summary ?? '');
        setPageCount(data.page_count ?? '');
        setQuote(data.quote ?? ''); // Ensure quote state is updated
        console.log('✅ Book details updated:', data);
        window.location.reload(); // Force refresh to fix state sync issue
      })
      .catch(err => console.error('❌ Failed to update book details:', err));
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
      >
        ← Back
      </button>
      <div className="book-detail-wrapper" ref={wrapperRef}>
        Book not found
      </div>
    </>
  );

  const readingTime = Math.ceil((bookData.page_count || 0) / 50); // est. 50 pages/hour

  return (
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
      >
        ← Back
      </button>
      <div className="book-detail-wrapper" ref={wrapperRef}>
        <div className="book-detail-header">
          <img
            src={
              bookData.cover
                ? bookData.cover.startsWith('http')
                  ? bookData.cover
                  : `http://localhost:5001${bookData.cover}`
                : 'fallback-image.jpg'
            }
            alt="cover"
            className="book-detail-cover"
          />
          <div style={{ flex: 1 }}>
            {bookData.series && (
              <div className="book-series-info">
                <p className="series-name">{bookData.series}</p>
                {bookData.book_number && (
                  <p className="series-number">Book {bookData.book_number}</p>
                )}
                {bookData.series.toLowerCase() !== 'standalone' && (
                  <p className="series-link">
                    <a href={`/series/${encodeURIComponent(bookData.series)}`}>&#10148; View Series</a>
                  </p>
                )}
              </div>
            )}
            <div className="book-detail-meta" style={{ overflow: 'hidden' }}>
              <h1 className="book-title">{bookData.title}</h1>
              <h2>by {bookData.author}</h2>
              <p>
                <strong>Date Read:</strong>{' '}
                {bookData.date_read
                  ? new Date(bookData.date_read).toLocaleDateString('en-US')
                  : 'Unknown'}
              </p>
              <p><strong>Pages:</strong> {isEditing ? (
                <input
                  type="number"
                  value={pageCount}
                  onChange={e => setPageCount(e.target.value)}
                  style={{ width: '80px' }}
                />
              ) : (
                pageCount || '??'
              )}</p>
              <p><strong>Rating:</strong> {'★'.repeat(bookData.rating || 0)}</p>
              <p><strong>Est. Reading Time:</strong> {readingTime ? `${readingTime} hr${readingTime > 1 ? 's' : ''}` : '??'}</p>
            </div>
            <div className="book-quote-wrapper" style={{ marginTop: '2rem' }}>
              <div className={`book-quote-bubble ${quote && quote.length > 130 ? 'long-quote' : ''}`}>
                {isEditing ? (
                  <textarea
                    value={quote || ''}
                    onChange={e => setQuote(e.target.value)}
                    rows={3}
                    className="book-quote-textarea"
                    placeholder="Favorite Quote"
                  />
                ) : (
                  <blockquote>
                    {quote ? `“${quote}”` : <span className="quote-placeholder">Favorite Quote</span>}
                  </blockquote>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="book-detail-summary">
          <h3>📖 Summary</h3>
          {isEditing ? (
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              rows={10}
              className="book-summary-textarea"
            />
          ) : (
            <p>{summary || 'No summary yet. Add something juicy and dramatic.'}</p>
          )}
        </div>
        <div style={{ marginTop: '1rem' }}>
          {isEditing ? (
            <button onClick={handleSave}>💾 Save</button>
          ) : (
            <button onClick={() => setIsEditing(true)}>✏️ Edit</button>
          )}
        </div>
      </div>
    </>
  );
}

export default BookDetail;