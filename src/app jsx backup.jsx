/* 🛑 ORGANIZATION PLAN FOR THIS CHAOS 🛑 */
/* Telling our future selves where stuff is stacked: 
   - Variables first
   - Functions second
   - Actual UI rendering last (the sexy stuff)
*/
import { useEffect, useState } from 'react'; // Grab magic React powers to control state and side effects
import './App.css'; // Import our badass styling that we roasted earlier

function App() {
  // --------------------------
  // 📚 STATE VARIABLES: Tracking All The Shit We Care About
  // --------------------------

  /* List of all books we fetched from the server (empty squad at first) */
  const [books, setBooks] = useState([]);

  /* New book form fields (blank book ready for love) */
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    series: '',
    book_number: '',
    date_read: '',
    rating: 0,
  });

  /* Hover magic for the stars in the review (so they light up when you mouse over) */
  const [hoverRating, setHoverRating] = useState(0);

  /* Dropdown list of all known series names (starting with just "Standalone" for the lone wolves) */
  const [seriesOptions, setSeriesOptions] = useState(['Standalone']);

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

  // --------------------------
  // 🔥 FETCH ALL BOOKS RIGHT WHEN PAGE LOADS
  // --------------------------
  useEffect(() => {
    fetchBooks(); // As soon as this page wakes up, go grab the books from the backend
  }, []);

  // 🕵️‍♀️ fetchBooks: Go beg the backend for the latest book list and update our state.
  const fetchBooks = () => {
    fetch('http://localhost:5001/api/books') // Go knock on the backend's door and ask for books
      .then((res) => res.json()) // Take the backend's mumbling and turn it into something readable (JSON)
      .then((data) => {
        setBooks(data || []); // Update our book collection (or, if the backend is empty, just vibe with an empty list)

        // Build a Set (the "no duplicates allowed" club) to hold all unique series names
        const seriesSet = new Set(['Standalone']); // "Standalone" always gets an invite, even if nobody else shows up

        (data || []).forEach((book) => {
          if (book.series) seriesSet.add(book.series); // If the book has a series, toss it in the club
        });

        setSeriesOptions(Array.from(seriesSet)); // Turn the Set back into an array, because React is picky like that
      })
      .catch((err) => console.error("Failed to fetch books:", err)); // If the backend faceplants, log the drama
  };

  // handleChange: Whenever the user types in a form field, update the newBook object accordingly
  const handleChange = (e) => {
    setNewBook({ ...newBook, [e.target.name]: e.target.value }); // Copy the old book, then swap in whatever field just changed
  };

  // handleStarClick: When a user thirstily clicks a star, set the rating for the new book
  const handleStarClick = (rating) => {
    setNewBook((prevBook) => ({
      ...prevBook,
      rating, // Set the rating to whatever number of stars they clicked
    }));
  };

  // deleteBook: Ask the user if they're sure, then send the book to the shadow realm (delete from backend)
  const deleteBook = (id) => {
    if (window.confirm("Are you sure you want to send this book into the abyss 🔥?")) {
      fetch(`http://localhost:5001/books/${id}`, { method: 'DELETE' }) // Tell the backend to nuke this book
        .then(() => fetchBooks()); // Refresh the book list so the ghost is gone
    }
  };

  // startEdit: User clicked the ✏️, so we're about to let them mess with this book's info inline
  const startEdit = (book) => {
    setEditId(book.id); // Mark this book as "currently being edited"
    setInlineEditBook({ ...book }); // Make a copy so we can edit without immediately trashing the original
  };

  // handleSubmit: When the form is submitted (add/update book), do all the backend drama and reset the UI
  const handleSubmit = (e) => {
    e.preventDefault(); // Don't let the browser try to reload the page like it's 1999

    const finalBook = { ...newBook }; // Make a copy of the book we're about to send
    if (newBook.series === '__new') {
      finalBook.series = newSeriesName.trim(); // If they added a new series, use that name instead of the magic placeholder
    }

    if (editId) {
      // If we're editing, PATCH the existing book
      fetch(`http://localhost:5001/books/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalBook),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to update book"); // Complain if the backend is rude
          return res.json();
        })
        .then(() => {
          fetchBooks(); // Refresh the list so the changes show up
          setNewBook({
            title: '',
            author: '',
            series: '',
            book_number: '',
            date_read: '',
            rating: 0,
          }); // Reset the form fields so they're fresh for the next book
          setNewSeriesName(''); // Clear the new series input
          setEditId(null); // No longer editing anyone
          setShowModal(false); // Close the modal, we're done here
        })
        .catch((err) => console.error(err));
    } else {
      // If we're adding a new book, POST it to the backend
      fetch('http://localhost:5001/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalBook),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to add book"); // If the backend is being a diva, throw a fit
          return res.json();
        })
        .then(() => {
          fetchBooks(); // Refresh the book list so our new baby shows up
          setNewBook({
            title: '',
            author: '',
            series: '',
            book_number: '',
            date_read: '',
            rating: 0,
          }); // Reset the form for next time
          setNewSeriesName(''); // Clear any new series input
          setShowModal(false); // Close the modal and let the user bask in their accomplishment
        })
        .catch((err) => console.error(err));
    }
  };

  /* Sort the books array by the selected sortOption */
  const sortedBooks = [...books].sort((a, b) => {
    const fieldA = (a[sortOption] || '').toString().toLowerCase();
    const fieldB = (b[sortOption] || '').toString().toLowerCase();
    return fieldA.localeCompare(fieldB);
  });

  // saveInline: User clicked "Save" in the inline edit form, so PATCH the backend and clean up our mess
  const saveInline = () => {
    fetch(`http://localhost:5001/books/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inlineEditBook),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update book"); // If backend refuses, whine in the console
        return res.json();
      })
      .then(() => {
        fetchBooks(); // Refresh the book list so our edits are visible
        setEditId(null); // Nobody is being edited anymore
        setInlineEditBook(null); // Clear out the inline edit state so we don't keep ghosts around
      })
      .catch((err) => console.error(err));
  };

  return (
    // 🛑 Full Page Wrapper: Wrapping the whole app and telling it to center itself like a queen
    <div
      className="app-wrapper"
      style={{
        width: '100%',        // ← use 100% so we don’t include the scrollbar
        boxSizing: 'border-box'
      }}
    >
      <nav className="main-nav">
        <ul>
          <li>My Libraries</li>
          <li>My Bookshelf</li>
          <li>My Yearly Wrapup</li>
          <li>DNF</li>
        </ul>
      </nav>
      <div className="page-banner">
        <h1 className="page-banner-text">Page Turning &amp; Soul Burning</h1>
      </div>
      {/* 🛑 Background Image that Actually Grows with the Page */}
      <div
        className="background"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)),
            url(${import.meta.env.BASE_URL}newbg.png)
          `,
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

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-backdrop" onClick={() => setShowModal(false)}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 🛑 X Button to GTFO */}
                <button className="close-button" onClick={() => setShowModal(false)}>✖</button>
                <form onSubmit={handleSubmit} className="add-book-form">
                  {/* 🛑 Title and Author Fields Side-by-Side */}
                  <div className="form-row title-author-row">
                    <input
                      type="text"
                      name="title"
                      placeholder="Title"
                      value={newBook.title}
                      onChange={handleChange}
                      required
                      className="form-control"
                    />
                    <input
                      type="text"
                      name="author"
                      placeholder="Author"
                      value={newBook.author}
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>

                  <div className="form-row series-number-date-row">
                    {newBook.series !== '__new' ? (
                      // 🛑 Series Dropdown if not adding a new series
                      <select
                        name="series"
                        value={newBook.series}
                        onChange={handleChange}
                        className="form-control"
                      >
                        {seriesOptions.map((option, index) => (
                          <option key={index} value={option}>
                            {option}
                          </option>
                        ))}
                        <option value="__new">➕ Add New Series...</option>
                      </select>
                    ) : (
                      // 🛑 Text Input for New Series if they choose to add one
                      <>
                        <input
                          className="new-series-input"
                          type="text"
                          placeholder="Enter series name"
                          value={newSeriesName}
                          onChange={(e) => setNewSeriesName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const updatedSeries = newSeriesName.trim();
                              if (updatedSeries) {
                                const updatedOptions = new Set([...seriesOptions, updatedSeries]);
                                setSeriesOptions(Array.from(updatedOptions));
                                setNewBook((prev) => ({ ...prev, series: updatedSeries }));
                                setNewSeriesName('');
                              }
                            }
                          }}
                          required
                        />
                      </>
                    )}

                    {/* 🛑 Book Number Input */}
                    <input
                      type="number"
                      name="book_number"
                      placeholder="Book #"
                      value={newBook.book_number}
                      onChange={handleChange}
                      className="form-control"
                    />

                    {/* 🛑 Date Read Picker */}
                    <input
                      type="date"
                      name="date_read"
                      placeholder="MM/DD/YYYY"
                      value={newBook.date_read}
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>

                  {/* 🛑 Drag & Drop Cover Upload */}
                  <div
                    className="cover-upload"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      const formData = new FormData();
                      formData.append('file', file);
                      fetch('http://localhost:5001/upload_cover', { method: 'POST', body: formData })
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
                  >
                    {newBook.cover
                      ? <img src={newBook.cover} alt="Cover" style={{ maxWidth: '100%' }} />
                      : 'Drag & drop a cover image here'}
                  </div>

                  {/* 🛑 Star Rating Buttons */}
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`star ${star <= (hoverRating || newBook.rating) ? 'selected' : ''}`}
                        onClick={() => handleStarClick(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`${star} star`}
                      >
                        <span className="star-icon">★</span>
                      </button>
                    ))}
                  </div>

                  {/* 🛑 Submit Button (Add or Update) */}
                  <button type="submit">{editId ? "Update Book" : "Add Book"}</button>
                </form>
              </div>
            </div>
          </div>
        )}
      
                {/* 🛑 Button to Open the Modal */}
                <button className="open-modal-button" onClick={() => setShowModal(true)}>
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
            </select>
          </label>
        </div>

                {/* 🛑 Book Grid Display */}
                {books.length === 0 ? (
          <p>No books yet...</p>
        ) : (
          <div className="book-grid">
            {sortedBooks.map((book) => (
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
                      fetch('http://localhost:5001/upload_cover', { method: 'POST', body: formData })
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
                      minHeight: '100px',
                      maxHeight: '120px',
                      position: 'relative'
                    }}
                  >
                    {inlineEditBook.cover
                      ? (
                        <>
                          <img src={inlineEditBook.cover} alt="Cover" style={{ maxWidth: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
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
                    onChange={(e) => setInlineEditBook((b) => ({ ...b, series: e.target.value }))}
                    className="form-control"
                    style={{ marginBottom: '0.5rem' }}
                  >
                    {seriesOptions.map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={inlineEditBook.book_number}
                    onChange={(e) => setInlineEditBook((b) => ({ ...b, book_number: e.target.value }))}
                    className="form-control"
                    placeholder="Book #"
                    style={{ marginBottom: '0.5rem' }}
                  />
                  <input
                    type="date"
                    value={inlineEditBook.date_read || ''}
                    onChange={(e) => setInlineEditBook((b) => ({ ...b, date_read: e.target.value }))}
                    className="form-control"
                    placeholder="Date Read"
                    style={{
                      marginBottom: '0.5rem',
                      fontSize: '0.9rem',
                      padding: '0.40rem'
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
                    <button type="button" onClick={saveInline} style={{ background: 'none', border: '1px solid #ccc', padding: '0.25rem 0.5rem' }}>
                      ✅ Save
                    </button>
                    <button type="button" onClick={() => setEditId(null)} style={{ background: 'none', border: '1px solid #ccc', padding: '0.25rem 0.5rem' }}>
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
                      onClick={() => deleteBook(book.id)}
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
                  {book.cover ? (
                    <img
                      src={`http://localhost:5001${book.cover}`}
                      alt="Cover"
                      style={{ maxWidth: '100%', height: '180px', objectFit: 'contain', marginBottom: '0.5rem', borderRadius: '8px' }}
                    />
                  ) : (
                    // 📦 Placeholder if no cover. Sorry, not every book gets a face.
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
                    <h2 className="book-title">{book.title}</h2>
                    {/* 🔒 Author: Just showing off, not editable. */}
                    <p>{book.author}</p>
                    {/* 🔒 Date Read: Display when it was read */}
                    {book.date_read && (
                      <p className="date-read">
                        📅 {new Date(new Date(book.date_read).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                    {/* 🔒 Series: Show series and book number if not Standalone */}
                    {book.series && book.series !== 'Standalone' && (
                      <p className="series-info">
                        {book.series} {book.book_number && `(#${book.book_number})`}
                      </p>
                    )}
                    {/* ⭐ Static Star Rating: Just for flexing, can't change here. */}
                    <div className="rating">
                      {'⭐'.repeat(book.rating)}
                    </div>
                  </div>
                  {/* 🛠️ Action Buttons: Edit or yeet this book */}
                  <div style={{ marginTop: '0.5rem' }}>
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
      </div>
    </div>
  );
}

export default App;