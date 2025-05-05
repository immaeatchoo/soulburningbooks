// 📦 Importing all the necessary libraries and components for our bookish adventure
// 🔌 React core stuff — gotta have this to use hooks like useState/useEffect
import React, { useState, useEffect, useCallback } from 'react';

// 🦸‍♂️ Auth helpers (Supabase)
import { useSupabaseClient, useSessionContext } from '@supabase/auth-helpers-react';

// 🛣️ Routing wizardry so we can have multiple pages like a real app
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ScrollToTop from './ScrollToTop';

// 📄 These are our individual pages (duh)
import HomePage from './HomePage';
import BookshelfPage from './BookshelfPage';
import YearlyWrapUpPage from './YearlyWrapUpPage';
import DnfPage from './DnfPage';
import BookDetail from './BookDetail';
import SeriesPage from "./SeriesPage"; // or adjust path if it's in a subfolder
import Login from './Login.jsx';

// 📚 Add Book component — modular masterpiece now living in its own file
import AddBook from './AddBook';

// 🎨 Styles that make things not look like 1998
import './App.css';
import './LoginModal.css';

// --------------------------
// 🏁 The Main App Function — Kristina-style: wrap everything in a big chunky function
// --------------------------
function App() {
  // Login Modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  // --------------------------

  // Auth session/user (updated for useSessionContext)
  const { session } = useSessionContext();
  const supabase = useSupabaseClient();
  const user = session?.user;

  /* List of all books we fetched from the server (empty squad at first) */
  const [books, setBooks] = useState([]);

  /* Connect to backend server via Render */
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // Helper for proxying book covers and enforcing HTTPS
  const getCoverUrl = (url) => {
    if (!url) return '';
    const httpsUrl = url.startsWith('http://') ? url.replace('http://', 'https://') : url;
    return `${BASE_URL}/api/cover-proxy?url=${encodeURIComponent(httpsUrl)}`;
  };

  // Fetch books helper function
  const fetchBooks = useCallback(async () => {
    if (!session) return;

    // Clean token retrieval
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    console.log("🪪 Sending Authorization token:", token);
    console.log("📡 Fetching books with headers:", {
      Authorization: `Bearer ${token}`,
    });

    try {
      const response = await fetch(`${BASE_URL}/api/books`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch books, status: ${response.status}`);
      }

      const data = await response.json();
      setBooks(data);
    } catch (err) {
      console.error('Failed to fetch books:', err);
    }
  }, [session, BASE_URL, supabase]);

  // Token auto-refresh effect for Supabase
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        console.log('🔄 Token refreshed or signed in.');
        fetchBooks(); // Refresh books with new token
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchBooks]);

  // Auto-refresh session periodically using Supabase client method
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        console.log("🔄 Checking session token age...");
        // Session refresh handled by Supabase client internally
      }
    }, 55 * 60 * 1000); // Every 55 minutes

    return () => clearInterval(interval);
  }, [supabase.auth]);

  // Fetch books when session or BASE_URL or fetchBooks changes
  useEffect(() => {
    fetchBooks();
  }, [session, BASE_URL, fetchBooks]);

  // Handler to update a book in the books state
  const handleBookUpdate = (updatedBook) => {
    setBooks(prevBooks =>
      prevBooks.map(book =>
        book.id === updatedBook.id ? updatedBook : book
      )
    );
  };
  // 📚 STATE VARIABLES: All The Shit We Care About
  // --------------------------
  // Kristina: These are all the major state variables for the app.
  // Book list, new book form, modals, sorting, pagination, etc.


  /* New book form fields (blank book ready for love) */
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    series: '',
    book_number: '',
    date_read: '',
    rating: 0,
    cover: ''
  });

  /* Hover magic for the stars in the review (so they light up when you mouse over) */
  const [hoverRating, setHoverRating] = useState(0);

  /* Dropdown list of all known series names (starting with just "Standalone" for the lone wolves) */
  const [seriesOptions, setSeriesOptions] = useState(['Standalone']);
  // Track the original series options for rename mapping in Series Manager
  const [originalSeriesOptions, setOriginalSeriesOptions] = useState([]);

  /* When you type a brand new series name (not picking from the dropdown) */
  const [newSeriesName, setNewSeriesName] = useState('');

  // --------------------------
  // 🎭 MODAL CONTROL VARIABLES: Opening, Closing, Editing
  // --------------------------
  /* What field to sort books by — title/author/series (default is title) */
  const [sortOption, setSortOption] = useState('title');

  /* ID of the book we're editing right now (null = nobody's being edited) */
  const [editId, setEditId] = useState(null);

  /* The book we're live-editing inside the grid (only matters when inline editing) */
  const [inlineEditBook, setInlineEditBook] = useState(null);

  /* Whether the Add/Edit Book Modal is open or not */
  const [showModal, setShowModal] = useState(false);

  // Pagination State for Book Grid 
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 16; // Number of books to show per page

  // Settings and Series Manager modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSeriesManager, setShowSeriesManager] = useState(false);
  // State for Goodreads CSV import spinner
  const [isImporting, setIsImporting] = useState(false);

  // --------------------------
  // 🖼️ COVER REVIEW STATE VARIABLES
  // --------------------------
  const [pendingCoverFixes, setPendingCoverFixes] = useState([]);
  const [currentCoverSearchResults, setCurrentCoverSearchResults] = useState({});
  const [isReviewingCovers, setIsReviewingCovers] = useState(false);
  // Cover Review batching
  const [reviewBatchSize, setReviewBatchSize] = useState(20);
  // Loading state for fetching covers
  const [isFetchingCovers, setIsFetchingCovers] = useState(false);

  // --------------------------

  // Import books marked as "read" from Goodreads CSV with confirmation
  const importGoodreadsCSV = async (file) => {
    setIsImporting(true);
    setReviewBatchSize(20);
    console.log("📥 Starting Goodreads CSV import...");
    const reader = new FileReader();
    reader.onload = async (e) => {
      console.log("📑 CSV file loaded, parsing...");
      const text = e.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split(',');

      const titleIndex = headers.findIndex(h => h.toLowerCase().includes("title"));
      const authorIndex = headers.findIndex(h => h.toLowerCase().includes("author"));
      const dateReadIndex = headers.findIndex(h => h.toLowerCase().includes("date read"));
      const isbnIndex = headers.findIndex(h => h.toLowerCase().includes("isbn"));
      const ratingIndex = headers.findIndex(h => h.toLowerCase().includes("my rating"));

      const currentTitles = new Set(books.map(book => `${book.title.toLowerCase()}-${book.author.toLowerCase()}`));

      const readBooks = lines.slice(1).map(line => {
        const cells = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const dateRead = cells[dateReadIndex]?.replace(/^"|"$/g, '').trim();
        if (!dateRead) return null;
        let title = cells[titleIndex]?.replace(/^"|"$/g, '').trim();
        const author = cells[authorIndex]?.replace(/^"|"$/g, '').trim();
        const key = `${title.toLowerCase()}-${author.toLowerCase()}`;
        if (currentTitles.has(key)) return null;
        let series = 'Standalone';
        let book_number = '';
        const seriesMatch = title.match(/^(.*?)\s*\((.*?),\s*#(\d+)\)$/);
        if (seriesMatch) {
          title = seriesMatch[1].trim();
          series = seriesMatch[2].trim();
          book_number = seriesMatch[3].trim();
        }
        return {
          title,
          author,
          date_read: dateRead,
          rating: parseInt(cells[ratingIndex]?.trim()) || 0,
          isbn: cells[isbnIndex]?.replace(/^"|"$/g, '').trim() || '',
          series,
          book_number
        };
      }).filter(Boolean);
      let importedCount = 0;
      console.log(`📚 Found ${readBooks.length} books to import.`);
      for (const book of readBooks) {
        console.log("📘 Importing:", book.title);
        try {
          console.log("🔎 Fetching Google Books cover for:", book.title, "by", book.author);
          const response = await fetch(`${BASE_URL}/api/smartsearch?q=intitle:${encodeURIComponent(book.title)}+inauthor:${encodeURIComponent(book.author)}`);
          const data = await response.json();
          if (data.items?.length) {
            const info = data.items[0].volumeInfo;
            if (info.imageLinks?.thumbnail) {
              book.cover = info.imageLinks.thumbnail;
              book.cover_google = info.imageLinks.thumbnail;
              // Ensure both cover and cover_google are set for downstream use
              console.log("✅ Cover fetched for:", book.title);
            }
          }
        } catch (err) {
          console.warn("❌ Cover fetch failed for:", book.title, err);
        }
        if (book.series && !seriesOptions.includes(book.series)) {
          setSeriesOptions(prev => [...new Set([...prev, book.series])]);
        }
        console.log("📤 Sending to backend:", book.title);
        try {
          const response = await fetch(`${BASE_URL}/api/books`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({
              ...book,
              series: book.series || 'Standalone',
              book_number: book.book_number || '',
              cover: book.cover || '',
              cover_google: book.cover_google || '',
              user_id: user?.id,
            }),
          });
          if (response.ok) {
            console.log("✅ Book added:", book.title);
            importedCount++;
          } else {
            console.error("❌ Failed to add:", book.title);
          }
        } catch (err) {
          console.error("❌ Error during POST for:", book.title, err);
        }
      }
      fetchBooks();
      setTimeout(() => {
        if (importedCount > 0) {
          alert(`✅ Import complete! ${importedCount} new book(s) added.`);
        } else {
          alert(`⚠️ No new books were imported. They already exist.`);
        }
        setIsImporting(false);
        setReviewBatchSize(20);
        setPendingCoverFixes(readBooks);
        setIsReviewingCovers(true);
        readBooks.slice(0, reviewBatchSize).forEach(book => fetchNewCovers(book));
      }, 500);
    };
    reader.readAsText(file);
  };

  // --------------------------
  // 🖼️ COVER REVIEW MODE HELPERS
  // --------------------------
  const fetchNewCovers = async (book) => {
    const bookKey = `${book.title.toLowerCase()}-${book.author.toLowerCase()}`;
    // Reset the current cover search results for this book at the start
    setCurrentCoverSearchResults(prev => ({
      ...prev,
      [bookKey]: []
    }));
    const cached = localStorage.getItem(`covers-${bookKey}`);
    if (cached) {
      setCurrentCoverSearchResults(prev => ({
        ...prev,
        [bookKey]: JSON.parse(cached)
      }));
      setIsFetchingCovers(false);
      return;
    }
    setIsFetchingCovers(true);
    if (!book.cover) {
      try {
        const response = await fetch(`${BASE_URL}/api/smartsearch?q=intitle:${encodeURIComponent(book.title)}+inauthor:${encodeURIComponent(book.author)}`);
        const data = await response.json();
        if (data.items?.length) {
          const first = data.items[0].volumeInfo;
          if (first.imageLinks?.thumbnail) {
            book.cover = first.imageLinks.thumbnail;
            book.cover_google = first.imageLinks.thumbnail;
            try {
              await fetch(`${BASE_URL}/api/books/${book.id}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ cover: book.cover }),
              });
            } catch (err) {
              console.warn("⚠️ Failed to save cover to backend:", book.title, err);
            }
          }
        }
      } catch (err) {
        console.warn("❌ Cover fetch failed for:", book.title, err);
      }
    }
    // Helper to collect unique covers (max 6)
    const tryFetch = async (query) => {
      const response = await fetch(`${BASE_URL}/api/smartsearch?q=${query}`);
      const data = await response.json();
      const covers = [];
      if (data.items?.length) {
        data.items.forEach(item => {
          if (item.volumeInfo?.imageLinks?.thumbnail) {
            const thumb = item.volumeInfo.imageLinks.thumbnail;
            if (!covers.includes(thumb)) {
              covers.push(thumb);
            }
          }
        });
        // Limit to 6 covers max
        if (covers.length > 6) covers.length = 6;
      }
      return covers;
    };
    try {
      let covers = await tryFetch(`intitle:${encodeURIComponent(book.title)}+inauthor:${encodeURIComponent(book.author)}`);
      if (covers.length < 6) {
        // Try to get more covers by searching by title only
        const extraCovers = await tryFetch(`intitle:${encodeURIComponent(book.title)}`);
        // Merge new unique covers, up to 6
        extraCovers.forEach(thumb => {
          if (!covers.includes(thumb) && covers.length < 6) {
            covers.push(thumb);
          }
        });
      }
      setCurrentCoverSearchResults(prev => ({
        ...prev,
        [bookKey]: covers
      }));
      localStorage.setItem(`covers-${bookKey}`, JSON.stringify(covers));
    } catch (err) {
      console.error('Failed to fetch new covers:', err);
    }
    setIsFetchingCovers(false);
  };
  const selectNewCover = async (book, newCoverUrl) => {
    removeBookFromPending(book);

    // Force save cover to backend
    fetch(`${BASE_URL}/api/books/${book.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ cover: newCoverUrl }),
    })
      .then(res => res.json())
      .then(data => {
        console.log("✅ Cover saved:", data);

        // If the book is being edited inline, update and sync the UI immediately
        if (editId === book.id) {
          setInlineEditBook(prev => ({ ...prev, cover: newCoverUrl }));
          setEditId(null);
          setInlineEditBook(null);
          fetchBooks();
        }
      })
      .catch(err => {
        console.error("❌ Error saving cover:", err);
      });
  };

  const keepCurrentCover = async (book) => {
    if (book.id && (book.cover || book.cover_google)) {
      await fetch(`${BASE_URL}/api/books/${book.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ cover: book.cover || book.cover_google }),
      });
    }
    removeBookFromPending(book);
  };

  const skipBook = (book) => {
    removeBookFromPending(book);
  };

  const refetchCovers = (book) => {
    // Only fetch when explicitly called
    fetchNewCovers(book);
  };

  const removeBookFromPending = (book) => {
    const bookKey = `${book.title.toLowerCase()}-${book.author.toLowerCase()}`;
    setPendingCoverFixes(prev =>
      prev.filter(b => `${b.title.toLowerCase()}-${b.author.toLowerCase()}` !== bookKey)
    );
    setCurrentCoverSearchResults(prev => {
      const copy = { ...prev };
      delete copy[bookKey];
      return copy;
    });

    // Check if there are still books to review after removal
    setTimeout(() => {
      const updated = pendingCoverFixes.filter(
        (b) => `${b.title.toLowerCase()}-${b.author.toLowerCase()}` !== bookKey
      );
      if (updated.length > 0) {
        fetchNewCovers(updated[0]);
      } else {
        setIsReviewingCovers(false);
        fetchBooks();
      }
    }, 100);
  };

  // --------------------------
  // 🛠️ CRUD/FORM HANDLERS
  // --------------------------
  // handleChange: Whenever the user types in a form field, update the newBook object accordingly
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewBook((prev) => ({ ...prev, [name]: value }));
  };
  // handleStarClick: When a user thirstily clicks a star, set the rating for the new book
  const handleStarClick = (rating) => {
    setNewBook((prevBook) => ({
      ...prevBook,
      rating,
    }));
  };
// deleteBook: Ask the user if they're sure, then send the book to the shadow realm (delete from backend)
const deleteBook = (id) => {
  if (window.confirm("Are you sure you want to send this book into the abyss 🔥?")) {
    fetch(`${BASE_URL}/api/books/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to delete book");
      return res.json();
    })
    .then(() => fetchBooks())
    .catch((err) => console.error('❌ Delete failed:', err));
  }
};
  // startEdit: User clicked the ✏️, so we're about to let them mess with this book's info inline
  const startEdit = (book) => {
    fetchBooks();
    setEditId(book.id);
    setInlineEditBook({ ...book });
  };
  // handleSubmit: When the form is submitted (add/update book), do all the backend drama and reset the UI
  const handleSubmit = (e) => {
    e.preventDefault();
    const finalBook = { ...newBook };
    if (newBook.series === '__new') {
      finalBook.series = newSeriesName.trim();
    }
    // Both PATCH and POST requests already include user_id and Authorization header.
    if (editId) {
      fetch(`${BASE_URL}/api/books/${editId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ ...finalBook, user_id: user?.id }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to update book");
          return res.json();
        })
        .then(() => {
          fetchBooks();
          setNewBook({
            title: '',
            author: '',
            series: '',
            book_number: '',
            date_read: '',
            rating: 0,
            cover: ''
          });
          setNewSeriesName('');
          setEditId(null);
          setShowModal(false);
        })
        .catch((err) => console.error(err));
    } else {
      fetch(`${BASE_URL}/api/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ ...finalBook, user_id: user?.id }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to add book");
          return res.json();
        })
        .then(() => {
          fetchBooks();
          setNewBook({
            title: '',
            author: '',
            series: '',
            book_number: '',
            date_read: '',
            rating: 0,
            cover: ''
          });
          setNewSeriesName('');
          setShowModal(false);
        })
        .catch((err) => console.error(err));
    }
  };

  // --------------------------
  // 📊 SORTING & PAGINATION
  // --------------------------
  /* Sort the books array by the selected sortOption */
  const sortedBooks = [...books].sort((a, b) => {
    if (sortOption === 'series') {
      const seriesA = (a.series || '').toLowerCase();
      const seriesB = (b.series || '').toLowerCase();
      if (seriesA !== seriesB) return seriesA.localeCompare(seriesB);
      const numA = parseInt(a.book_number || 0);
      const numB = parseInt(b.book_number || 0);
      return numA - numB;
    }

    if (sortOption === 'author') {
      const lastNameA = (a.author || '').split(' ').slice(-1)[0].toLowerCase();
      const lastNameB = (b.author || '').split(' ').slice(-1)[0].toLowerCase();
      return lastNameA.localeCompare(lastNameB);
    }

    if (sortOption === 'rating') {
      return (b.rating || 0) - (a.rating || 0); // High to low
    }

    const fieldA = (a[sortOption] || '').toString().toLowerCase();
    const fieldB = (b[sortOption] || '').toString().toLowerCase();
    return fieldA.localeCompare(fieldB);
  });
  // Pagination logic
  // Calculate books to display based on current page
  const indexOfLastBook = currentPage * booksPerPage;
  const indexOfFirstBook = indexOfLastBook - booksPerPage;
  const currentBooks = sortedBooks.slice(indexOfFirstBook, indexOfLastBook);
  // Calculate total pages
  const totalPages = Math.ceil(sortedBooks.length / booksPerPage);
  // Handle page change and scroll to top
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    document.querySelector('.app-container')?.scrollIntoView({ behavior: 'smooth' }); 
  };

  // Update saveInline function
  const saveInline = async () => {
    const token = session?.access_token;
    if (!token || !editId) return;

    try {
      const response = await fetch(`${BASE_URL}/api/books/${editId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...inlineEditBook,
          user_id: user?.id
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Update books state with the updated book
      setBooks(prevBooks => 
        prevBooks.map(book => 
          book.id === editId ? { ...book, ...result.book } : book
        )
      );

      // Refresh series options
      const seriesResponse = await fetch(`${BASE_URL}/series`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (seriesResponse.ok) {
        const series = await seriesResponse.json();
        setSeriesOptions(series);
        setOriginalSeriesOptions(series);
      }

      setEditId(null);
      setInlineEditBook(null);
    } catch (err) {
      console.error('Failed to save book:', err);
    }
  };

  // Add effect to keep series options in sync
  useEffect(() => {
    const fetchSeriesOptions = async () => {
      if (!session?.access_token) return;
      
      try {
        const response = await fetch(`${BASE_URL}/series`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        if (response.ok) {
          const series = await response.json();
          setSeriesOptions(series);
          setOriginalSeriesOptions(series);
        }
      } catch (err) {
        console.error('Failed to fetch series options:', err);
      }
    };

    fetchSeriesOptions();
  }, [session, BASE_URL]);

  // --------------------------
  // 🖼️ COVER REVIEW MODE RENDER (Batch mode)
  // --------------------------
  if (isReviewingCovers) {
    return (
      <div className="cover-review-wrapper" style={{ position: 'relative' }}>
        <h1>🖼️ Review Your Book Covers</h1>
        <button
          onClick={() => setIsReviewingCovers(false)}
          title="Exit Cover Review"
          style={{
            position: 'absolute',
            top: '2rem',
            right: '2rem',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            color: '#ccc',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          ✖
        </button>
        {pendingCoverFixes.slice(0, reviewBatchSize).map((book) => {
          const bookKey = `${book.title.toLowerCase()}-${book.author.toLowerCase()}`;
          const covers = currentCoverSearchResults[bookKey] || [];
          return (
            <div className="cover-review-card" key={bookKey} style={{ marginBottom: '2rem' }}>
              <h2>{book.title} by {book.author}</h2>
              <div className="current-cover">
                <h3>Current Cover</h3>
                {(book.cover || book.cover_google) ? (
                  <img src={book.cover ? book.cover : getCoverUrl(book.cover_google)} alt={`${book.title} cover`} />
                ) : (
                  <div className="no-cover-placeholder">No cover</div>
                )}
              </div>
              <div className="new-cover-options">
                <h3>Choose a New Cover</h3>
                {isFetchingCovers ? (
                  <div className="cover-loading-spinner gothic-spinner-content">🕯️ Scrying for Covers...</div>
                ) : covers.length > 0 ? (
                  <div className="cover-thumbnails">
                    {covers.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt="New Cover Option"
                        className="thumbnail"
                        onClick={() => selectNewCover(book, url)}
                      />
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#aaa', fontStyle: 'italic' }}>🕯️ No covers found for this one.</p>
                )}
              </div>
              <div className="cover-review-buttons">
                <button onClick={() => keepCurrentCover(book)}>🛡️ Keep Current</button>
                <button
                  onClick={() => {
                    // Only run fetchNewCovers(book) when clicked
                    refetchCovers(book);
                  }}
                >🔄 Refetch Covers</button>
                <button onClick={() => skipBook(book)}>⏭️ Skip</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Reset batch size when resuming a session (optional, for safety)
  (() => {
    setReviewBatchSize(20);
  }, []);

  // --------------------------
  // 🖥️ MAIN APP RENDER — THE BIG JUICY RETURN
  // --------------------------
  if (!user) {
    return (
      <Router>
        <div className="unauth-wrapper">
          <div className="unauth-content">
            <div className="page-banner">
              <h1 className="page-banner-text">Page Turning &amp; Soul Burning</h1>
            </div>
            <p style={{ textAlign: 'center', marginTop: '2rem' }}>🔐 Please log in or create an account to continue.</p>
            <button
              onClick={() => setShowLoginModal(true)}
              style={{
                display: 'block',
                margin: '2rem auto',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                backgroundColor: '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Login
            </button>
            {showLoginModal && (
              <Login isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
            )}
          </div>
        </div>
      </Router>
    );
  }

  return (
    <>
      {isImporting && (
        <div className="gothic-spinner-overlay">
          <div className="gothic-spinner-content">
             Summoning Your Books...
          </div>
        </div>
      )}
      <Router>
        <div
          className="app-wrapper"
          style={{
            width: '100%',        // ← use 100% so we don’t include the scrollbar
            boxSizing: 'border-box'
          }}
        >
        <nav className="main-nav">
  <ul>
    <li><Link to="/home">Home</Link></li> {/* <-- THIS FIXES IT */}
    <li><Link to="/">My Libraries</Link></li>
    <li><Link to="/bookshelf">My Bookshelf</Link></li>
    <li><Link to="/yearly-wrapup">My Yearly Wrapup</Link></li>
    <li><Link to="/dnf">DNF</Link></li>
    {/* Always show user first name */}
    <li>
      <span
        style={{
          fontSize: '2.4rem',
          marginLeft: '10rem',
          fontFamily: 'Anacondas',
          color: '#ccc',
          textDecoration: 'none',
          cursor: 'default',
        }}
      >
        {user.user_metadata?.first_name || 'User'}
      </span>
    </li>
  </ul>
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
</nav>
        <div className="page-banner">
          <h1 className="page-banner-text">Page Turning &amp; Soul Burning</h1>
        </div>
        {/* 🛑 Background Image that Actually Grows with the Page */}
        <div
          className="background"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${import.meta.env.BASE_URL}newbg.webp)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            zIndex: -2
          }}
        ></div>
        {/* 🛑 Actual Main Container for All The Book Content */}
        <div className="app-container">
          <ScrollToTop />
            <Routes>

        {/* 🏠 Libraries Page (the Home / Landing page) */}
        <Route
          path="/"
          element={
            <>
              {/* Add Book Component — fully modular now, handles its own state, modal, and sass */}
              <AddBook
                showModal={showModal}
                setShowModal={setShowModal}
                newBook={newBook}
                setNewBook={setNewBook}
                newSeriesName={newSeriesName}
                setNewSeriesName={setNewSeriesName}
                seriesOptions={seriesOptions}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                handleStarClick={handleStarClick}
                hoverRating={hoverRating}
                setHoverRating={setHoverRating}
                BASE_URL={BASE_URL}
                session={session}
                user={user}
                setPendingCoverFixes={setPendingCoverFixes}
                setCurrentCoverSearchResults={setCurrentCoverSearchResults}
                setIsReviewingCovers={setIsReviewingCovers}
              />

              {/* Login Modal */}
              {showLoginModal && (
                <div className="modal-overlay">
                  <div className="modal-backdrop" onClick={() => setShowLoginModal(false)}>
                    <div
                      className="login-modal-content login-modal"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setShowLoginModal(false)}
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
                      >
                        ✖️
                      </button>
                      <Login />
                    </div>
                  </div>
                </div>
              )}

              {/* Settings Modal */}
              {showSettingsModal && (
                <div className="modal-overlay">
                  <div className="modal-backdrop" onClick={() => setShowSettingsModal(false)}>
                    <div style={{ marginTop: '3rem' }}>
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
                            textShadow: '0 0 4px #000',
                            cursor: 'pointer'
                          }}
                          title="Close"
                        >
                          ✖️
                        </button>
                      <h2 style={{ marginBottom: '1rem', color: '#ff9966' }}>⚙️ Settings</h2>

                      {/* Goodreads Import */}
                      <label htmlFor="import-csv" style={{ display: 'block', marginBottom: '1rem', cursor: 'pointer' }}>
                        <img src="/Goodreads.png" alt="Goodreads Import" style={{ width: '32px', height: '32px', marginBottom: '0.5rem' }} />
                        <div style={{ fontSize: '0.9rem', color: '#ccc' }}>Import Goodreads CSV</div>
                        <input
                          id="import-csv"
                          type="file"
                          accept=".csv"
                          onChange={(e) => {
                            importGoodreadsCSV(e.target.files[0]);
                            setShowSettingsModal(false);
                          }}
                          style={{ display: 'none' }}
                        />
                      </label>

                        {/* Settings Modal buttons layout update */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
                          {/* Review Covers */}
                          <button
                            onClick={() => {
                              fetch(`${BASE_URL}/books/pending-review`, {
                                headers: {
                                  Authorization: `Bearer ${session?.access_token}`,
                                },
                              })
                                .then(res => res.json())
                            .then(data => {
                              setPendingCoverFixes(data);
                              localStorage.setItem('pendingCoverFixes', JSON.stringify(data));
                              setReviewBatchSize(20);
                              setCurrentCoverSearchResults({});
                              setIsReviewingCovers(true);
                              // DO NOT call fetchNewCovers automatically here; user must click "Refetch Covers" per book
                            })
                            .catch((err) => console.error("Failed to fetch books needing review:", err));
                          setShowSettingsModal(false);
                            }}
                            style={{
                              backgroundColor: '#333',
                              color: '#fff',
                              padding: '0.5rem 1rem',
                              border: 'none',
                              borderRadius: '4px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              marginTop: '1rem'
                            }}
                          >
                            🖼️ Review Covers
                          </button>

                      {/* Manage Series */}
                      <button
                        onClick={() => {
                          setShowSeriesManager(true);
                          setShowSettingsModal(false);
                        }}
                        style={{
                          backgroundColor: '#444',
                          color: '#fff',
                          padding: '0.5rem 1rem',
                          border: 'none',
                          borderRadius: '4px',
                          marginTop: '1rem',
                          cursor: 'pointer'
                        }}
                      >
                        📖 Manage Series
                      </button>
                        </div>
                        {/* Delete All Books below the flex container */}
                        <button
                          onClick={() => {
                            if (window.confirm("⚠️ Are you sure? This will delete ALL books. This action cannot be undone.")) {
                              fetch(`${BASE_URL}/api/books`, {
                                method: 'DELETE',
                                headers: {
                                  Authorization: `Bearer ${session?.access_token}`,
                                },
                              })
                                .then((res) =>  {
                                  if (res.ok) {
                                    setBooks([]);
                                    setPendingCoverFixes([]);
                                    localStorage.setItem('pendingCoverFixes', JSON.stringify([]));
                                    setIsReviewingCovers(false);
                                    alert("✅ All books deleted successfully.");
                                  } else {
                                    console.error("Failed to mass delete books.");
                                  }
                                })
                                .catch((err) => console.error("Mass delete failed:", err));
                            }
                          }}
                          style={{
                            margin: '1rem 0',
                            backgroundColor: '#500',
                            color: '#fff',
                            padding: '0.5rem 1rem',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          🗑️ Delete ALL Books
                        </button>
                        {/* Logout button */}
                        <button
                          onClick={async () => {
                            await supabase.auth.signOut();
                            setShowSettingsModal(false);
                          }}
                          style={{
                            backgroundColor: '#222',
                            color: '#fff',
                            padding: '0.5rem 1rem',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            marginTop: '1rem'
                          }}
                        >
                          🔓 Logout
                        </button>
                        {/* Contact link at the bottom of the modal content */}
                        <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: '#ccc' }}>
                          📬 Contact: <a href="mailto:soulburningbooks@gmail.com" style={{ color: '#ffcc99', textDecoration: 'underline' }}>soulburningbooks@gmail.com</a>
                        </p>
                        {/* No bottom "✖ Close" button here, per instructions */}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Series Manager Modal */}
              {showSeriesManager && (
                <div className="modal-overlay">
                  <div className="modal-backdrop" onClick={() => setShowSeriesManager(false)}>
                    <div
                      className="modal-content"
                      onClick={(e) => e.stopPropagation()}
                      style={{ maxWidth: '400px', padding: '2rem', textAlign: 'center', maxHeight: '70vh', overflowY: 'auto' }}
                    >
                      <button
                        onClick={() => setShowSeriesManager(false)}
                        style={{
                          position: 'absolute',
                          top: '1rem',
                          right: '1rem',
                          background: 'none',
                          border: 'none',
                          fontSize: '1.5rem',
                          color: '#fff',
                          textShadow: '0 0 4px #000',
                          cursor: 'pointer'
                        }}
                        title="Close"
                      >
                        ✖️
                      </button>
                      <h2 style={{ marginBottom: '1rem', color: '#ff9966' }}>📖 Manage Series</h2>
                      {/* List series with delete options and inline editing */}
                      <div className="series-list" style={{ marginBottom: '1rem', maxHeight: '45vh', overflowY: 'auto', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                        {seriesOptions.sort().map((series, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '0.3rem',
                              gap: '0.5rem',
                              background: 'rgba(255,255,255,0.05)',
                              padding: '0.3rem 0.5rem',
                              borderRadius: '4px',
                              border: '1px solid rgba(255,255,255,0.1)'
                            }}
                          >
                            <input
                              type="text"
                              value={series}
                              onChange={(e) => {
                                const updatedSeries = [...seriesOptions];
                                updatedSeries[i] = e.target.value;
                                setSeriesOptions(updatedSeries);
                              }}
                              style={{
                                flexGrow: 1,
                                padding: '0.4rem',
                                borderRadius: '4px',
                                border: '1px solid #666',
                                backgroundColor: 'rgba(255,255,255,0.15)',
                                color: '#fff'
                              }}
                              disabled={series === 'Standalone'}
                            />
                            {series !== 'Standalone' && (
                              <button
                                onClick={() => {
                                  const updated = seriesOptions.filter(s => s !== series);
                                  setSeriesOptions(updated);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'red',
                                  fontSize: '1.2rem',
                                  cursor: 'pointer'
                                }}
                              >
                                ✖
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {/* Add new series manually */}
                      <input
                        type="text"
                        placeholder="New series name"
                        value={newSeriesName}
                        onChange={(e) => setNewSeriesName(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', borderRadius: '4px' }}
                      />
                      <button
                        onClick={() => {
                          if (newSeriesName.trim()) {
                            const updated = new Set([...seriesOptions, newSeriesName.trim()]);
                            setSeriesOptions(Array.from(updated));
                            setNewSeriesName('');
                          }
                        }}
                        style={{
                          backgroundColor: '#444',
                          color: '#fff',
                          padding: '0.5rem 1rem',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        ➕ Add Series
                      </button>
                      {/* Save Changes button */}
                      <button
                        onClick={() => {
                          // NEW LOGIC: robust rename/delete mapping for series (improved per request)
                          const updatedSeriesMap = {};

                          const originalSet = new Set(originalSeriesOptions.map(s => s.trim().toLowerCase()));
                          const currentSet = new Set(seriesOptions.map(s => s.trim().toLowerCase()));

                          originalSeriesOptions.forEach(original => {
                            const originalNormalized = original.trim().toLowerCase();

                            if (!currentSet.has(originalNormalized)) {
                              const newlyAddedSeries = seriesOptions.find(s =>
                                !originalSet.has(s.trim().toLowerCase())
                              );

                              if (newlyAddedSeries) {
                                updatedSeriesMap[original] = newlyAddedSeries.trim();
                              } else {
                                updatedSeriesMap[original] = 'Standalone';
                              }
                            }
                          });

                          fetch(`${BASE_URL}/api/series`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${session?.access_token}`
                            },
                            body: JSON.stringify({ updates: updatedSeriesMap })
                          })
                            .then(res => {
                              if (!res.ok) throw new Error('Failed to update series');
                              return res.json();
                            })
                            .then(() => {
                              return fetchBooks();
                            })
                            .then(() => {
                              setOriginalSeriesOptions([...seriesOptions]);
                              setShowSeriesManager(false);
                              alert('✅ Series changes saved and synced!');
                            })
                            .catch(err => console.error('Series update failed:', err));
                        }}
                        style={{
                          backgroundColor: '#2d2d2d',
                          color: '#fff',
                          padding: '0.5rem 1rem',
                          border: 'none',
                          borderRadius: '6px',
                          marginTop: '1rem',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          fontWeight: 'bold'
                        }}
                      >
                        💾 Save Changes
                      </button>
                      {/* Close */}
                      <div>
                        <button
                          onClick={() => setShowSeriesManager(false)}
                          style={{
                            marginTop: '2rem',
                            background: 'none',
                            color: '#ccc',
                            border: 'none',
                            fontSize: '1.2rem',
                            cursor: 'pointer'
                          }}
                        >
                          ✖ Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 🛑 Button to Open the Modal */}
              <button
                className="open-modal-button"
                onClick={() => {
                  setNewBook({
                    title: '',
                    author: '',
                    series: 'Standalone',
                    book_number: '',
                    date_read: '',
                    rating: 0,
                    cover: ''
                  });
                  setNewSeriesName('');
                  setShowModal(true);
                }}
              >
                ➕ Add New Book
              </button>


              {/* 🛑 Sort Dropdown */}
              <div style={{ margin: '1rem 0', textAlign: 'center' }}>
                <label>
                  Sort by: {' '}
                  <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                    <option value="title">Title</option>
                    <option value="author">Author</option>
                    <option value="series">Series</option>
                    <option value="rating">Rating</option>
                  </select>
                </label>
              </div>

            {/* Page Navigation Buttons for Book Grid */}
            <div className="match-detail-border" style={{ marginBottom: '1rem' }}>
              <div className="pagination">
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index}
                    onClick={() => handlePageChange(index + 1)}
                    className={`page-button ${currentPage === index + 1 ? 'active' : ''}`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>

              {/* 🛑 Book Grid Display */}
              {books.length === 0 ? (
                <p>No books yet...</p>
              ) : (
                <div
                  className="book-grid"
                >
                  {currentBooks.map((book) => (
                    editId === book.id ? (
                      // 🛑 Inline Edit Card: Updated structure for consistency and polish
                      <div className="book-card">
                        <div
                          className="cover-upload"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files[0];
                            const formData = new FormData();
                            formData.append('file', file);
                            fetch(`${BASE_URL}/api/upload_cover`, { method: 'POST', body: formData })
                              .then((res) => res.json())
                              .then(({ cover_url }) => {
                                setInlineEditBook((prev) => ({ ...prev, cover: cover_url }));
                              });
                          }}
                          style={{
                            border: '2px dashed #ccc',
                            padding: '0.5rem',
                            marginBottom: '0.5rem',
                            textAlign: 'center',
                            minHeight: '160px',
                            maxHeight: '180px',
                            position: 'relative'
                          }}
                        >
                          {inlineEditBook.cover
                            ? (
                              <>
                                <img
                                  src={ getCoverUrl(inlineEditBook.cover || inlineEditBook.cover_google) }
                                  alt="Cover"
                                  style={{ maxWidth: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }}
                                />
                                {inlineEditBook.cover && (
                                  <button
                                    type="button"
                                    className="remove-cover-button"
                                    onClick={() => setInlineEditBook((b) => ({ ...b, cover: '' }))}
                                    style={{
                                      position: 'absolute',
                                      top: '4px',
                                      right: '4px',
                                      background: 'rgba(255,255,255,0.8)',
                                      border: 'none',
                                      borderRadius: '50%',
                                      cursor: 'pointer',
                                      padding: '0.15em 0.45em',
                                      fontSize: '1rem',
                                      lineHeight: 1
                                    }}
                                  >
                                    ✖️
                                  </button>
                                )}
                              </>
                            )
                            : 'Drag & drop a new cover image here'}
                        </div>
                        {/* 🔍 Review Cover Button for this book */}
                        <button
                          type="button"
                          onClick={() => {
                            setPendingCoverFixes([book]);
                            setCurrentCoverSearchResults({});
                            setIsReviewingCovers(true);
                          }}
                          style={{
                            background: 'none',
                            border: '1px solid #888',
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.9rem',
                            marginTop: '0.5rem',
                            cursor: 'pointer',
                            color: '#ccc'
                          }}
                          title="Review Cover for This Book"
                        >
                          🔍 Review Cover
                        </button>
                        <input
                          type="text"
                          value={inlineEditBook.title}
                          onChange={(e) => setInlineEditBook((b) => ({ ...b, title: e.target.value }))}
                          className="form-control"
                          placeholder="Title"
                          style={{ marginBottom: '0.5rem' }}
                        />
                        <input
                          type="text"
                          value={inlineEditBook.author}
                          onChange={(e) => setInlineEditBook((b) => ({ ...b, author: e.target.value }))}
                          className="form-control"
                          placeholder="Author"
                          style={{ marginBottom: '0.5rem' }}
                        />
                        <select
                          value={inlineEditBook.series}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '__new') {
                              const newSeries = window.prompt("Enter new series name:");
                              if (newSeries && newSeries.trim()) {
                                const trimmed = newSeries.trim();
                                const updated = [...new Set([...seriesOptions, trimmed])];
                                setSeriesOptions(updated);
                                setInlineEditBook((b) => ({ ...b, series: trimmed }));
                              }
                            } else {
                              setInlineEditBook((b) => ({ ...b, series: value }));
                            }
                          }}
                          className="form-control"
                          style={{
                            marginBottom: '0.5rem',
                            fontSize: '0.85rem',
                            padding: '0.5rem 0.75rem',
                            height: '2.2rem'
                          }}
                        >
                          {seriesOptions
                            .sort((a, b) => {
                              if (a === 'Standalone') return -1;
                              if (b === 'Standalone') return 1;
                              return a.localeCompare(b);
                            })
                            .map((opt, i) => (
                              <option key={i} value={opt}>{opt}</option>
                          ))}
                          <option value="__new">➕ Add New Series...</option>
                        </select>
                        <input
                          type="number"
                          value={inlineEditBook.book_number}
                          onChange={(e) => setInlineEditBook((b) => ({ ...b, book_number: e.target.value }))}
                          className="form-control"
                          placeholder="Book #"
                          style={{
                            marginBottom: '0.5rem',
                            padding: '0.25rem',
                            width: '60px',
                            fontSize: '0.85rem'
                          }}
                        />
                        <input
                          type="date"
                          value={inlineEditBook.date_read || ''}
                          onChange={(e) => setInlineEditBook((b) => ({ ...b, date_read: e.target.value }))}
                          className="form-control"
                          placeholder="Date Read"
                          style={{
                            marginBottom: '0.5rem',
                            fontSize: '1rem',
                            padding: '0.5rem',
                            color: '#fff',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                          }}
                        />
                        <div
                          className="star-rating"
                          style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: '0.5rem 0',
                            gap: '0.2rem',
                            marginBottom: '0.5rem'
                          }}
                        >
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              className={`star ${s <= inlineEditBook.rating ? 'selected' : ''}`}
                              onClick={() => setInlineEditBook((b) => ({ ...b, rating: s }))}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: '0',
                                fontSize: '1.2rem'
                              }}
                            >
                              <span className="star-icon">★</span>
                            </button>
                          ))}
                        </div>
                        <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={saveInline}
                            style={{
                              background: '#4caf50',
                              color: '#fff',
                              border: 'none',
                              padding: '0.4rem 0.8rem',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            💾 Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditId(null);
                              setInlineEditBook(null);
                            }}
                            style={{
                              background: '#f44336',
                              color: '#fff',
                              border: 'none',
                              padding: '0.4rem 0.8rem',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            ❌ Cancel
                          </button>
                        </div>
                        {/* Restore Edit and Delete buttons for consistency */}
                        <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => startEdit(book)}
                            style={{ cursor: 'pointer', background: 'none', border: 'none' }}
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteBook(inlineEditBook.id)}
                            style={{ cursor: 'pointer', background: 'none', border: 'none' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 🛑 Regular Book Card: This is what everyone else sees (no editing here, just vibes)
                      <div key={book.id} className="book-card">
                        {/* 📚 Book Cover: Not editable here, just eye candy. */}
                        <Link
                          to={`/book/${book.id}`}
                          onClick={() => {
                            sessionStorage.setItem('bookGridScroll', window.scrollY);
                            sessionStorage.setItem('currentPage', currentPage);
                          }}
                        >
                          <img
                            src={
                              book.cover
                                ? book.cover
                                : getCoverUrl(book.cover_google)
                            }
                            alt="Cover"
                            style={{
                              maxWidth: '100%',
                              height: '180px',
                              objectFit: 'contain',
                              marginBottom: '0.5rem',
                              borderRadius: '8px'
                            }}
                          />
                        </Link>
                        {/* 📦 Placeholder if no cover. Sorry, not every book gets a face. */}
                        {!book.cover && (
                          <div
                            className="image-placeholder"
                            style={{
                              width: '100%',
                              height: '180px',
                              backgroundColor: 'rgba(0,0,0,0.05)',
                              borderRadius: '8px',
                              marginBottom: '0.5rem'
                            }}
                          />
                        )}
                        {/* 📖 Card Content: All the juicy details, but you can't edit them here */}
                        <div className="card-content">
                          {/* 🔒 Title: For reading only, not for changing here. */}
                          <h2 className="book-title">
                            <Link to={`/book/${book.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                              {book.title}
                            </Link>
                          </h2>
                          {/* 🔒 Author: Just showing off, not editable. */}
                          <p className="author-name">{book.author}</p>
                          {/* 🔒 Date Read: Display when it was read */}
                          {/* 🔒 Series: Show series and book number if not Standalone */}
                          {book.series && book.series !== 'Standalone' && (
                            <p className="series-info">
                              {book.series} {book.book_number && `(#${book.book_number})`}
                            </p>
                          )}
                          {book.date_read && (
                            <p className="date-read">
                              📅 {new Date(new Date(book.date_read).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          )}
                          {/* ⭐ Static Star Rating: Just for flexing, can't change here. */}
                          <div className="rating">
                            {'⭐'.repeat(book.rating)}
                          </div>
                        </div>
                        {/* 🛠️ Action Buttons: Edit or yeet this book */}
                        <div style={{ marginTop: '1rem' }}>
                          {/* ✏️ Edit Button: Click to unlock the chaos of inline editing. */}
                          <button
                            type="button"
                            onClick={() => startEdit(book)}
                            style={{ cursor: 'pointer', marginRight: '0.5rem', background: 'none', border: 'none' }}
                          >
                            ✏️
                          </button>
                          {/* 🗑️ Delete Button: Click to send this book to the shadow realm (forever). */}
                          <button
                            type="button"
                            onClick={() => deleteBook(book.id)}
                            style={{ cursor: 'pointer', background: 'none', border: 'none' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
              {/* Duplicate Pagination at Bottom */}
              <div className="pagination" style={{ marginTop: '1rem' }}>
                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={`bottom-${index}`}
                    onClick={() => handlePageChange(index + 1)}
                    className={`page-button ${currentPage === index + 1 ? 'active' : ''}`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            {/* 🛑 End of Main Container */}
            </>
          }
        />
      
{/* 📚 Other Pages */}
<Route path="/home" element={<HomePage />} />
<Route path="/bookshelf" element={<BookshelfPage />} />
<Route path="/yearly-wrapup" element={<YearlyWrapUpPage />} />
<Route path="/dnf" element={<DnfPage />} />
<Route path="/book/:id" element={<BookDetail books={books} onBookUpdate={handleBookUpdate} />} />
<Route path="/series/:seriesName" element={<SeriesPage />} />
<Route path="/login" element={<Login />} />
{/* 🛑 End of Other Pages */}
            </Routes>
        </div> {/* End of .app-container */}
        </div> {/* End of .app-wrapper */}
      </Router>
    </>
  );
}

// 🏁 Let’s get outta here — this is the main App export
export default App;

// 🏁 End of App.jsx
