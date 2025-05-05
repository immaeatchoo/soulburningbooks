import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './SeriesPage.css';
import { useSession } from '@supabase/auth-helpers-react';

// Use the same back-end base URL as App.jsx
const BASE_URL = import.meta.env.VITE_API_BASE_URL;
// Helper to enforce HTTPS and proxy remote covers
const getCoverUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('/')) return url;
  const secure = url.startsWith('http://') ? url.replace(/^http:\/\//i, 'https://') : url;
  return `${BASE_URL}/api/cover-proxy?url=${encodeURIComponent(secure)}`;
};

function SeriesPage() {
  const { seriesName } = useParams();
  const [books, setBooks] = useState([]);
  const session = useSession();

  useEffect(() => {
    console.log("🔍 Current series name:", seriesName);
    const fetchBooksInSeries = async () => {
      try {
        const response = await axios.get(
          `${BASE_URL}/api/series/${encodeURIComponent(seriesName)}`,
          { headers: { Authorization: `Bearer ${session?.access_token}` } }
        );
        
        console.log("📚 Series data:", response.data);
        const booksArray = response.data.books || [];

        // Sort by book_number ascending, parsing as float to handle numbers like 3.5
        booksArray.sort((a, b) => parseFloat(a.book_number || 0) - parseFloat(b.book_number || 0));
  
        // Log each book to see what frontend is receiving
        booksArray.forEach(book => {
          console.log(`📘 Title: ${book.title} | Series: ${book.series}`);
        });
  
        setBooks(booksArray);
      } catch (error) {
        console.error('Error fetching books in series:', error);
      }
    };
  
    fetchBooksInSeries();
  }, [seriesName, session]);

  return (
    <div className="series-page-container">
      <div style={{ width: '100%', textAlign: 'left' }}>
        <Link to="/" className="series-back-button">
          ⬅ Back to Library
        </Link>
      </div>
      <h1 className="series-header">Series: {seriesName}</h1>
      {books && books.length > 0 ? (
        <ul className="series-book-list">
          {books.map((book) => (
            <li key={book.id} className="series-book-card">
              <Link 
                to={`/book/${book.id}`} 
                className="series-book-link"
                onClick={() => window.scrollTo(0, 0)}
              >
                <img
                  src={getCoverUrl(book.cover_google || book.cover_local)}
                  alt={`Cover of ${book.title}`}
                  className="series-book-cover"
                />
                <div className="series-book-info">
                  <span className="series-book-number">#{book.book_number || '?'}</span>
                  <span className="series-book-title">{book.title}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="series-book-author">No books found in this series.</p>
      )}
    </div>
  );
}

export default SeriesPage;