

import React from 'react';

const BookshelfPage = () => {
  return (
    <div className="bookshelf-page">
      <div className="bookshelf-header">
        <h1>📚 My Bookshelf</h1>
        <p>Every book a whisper, every shelf a memory...</p>
      </div>

      <div className="bookshelf-categories">
        <div className="shelf-category">
          <h2>🌟 Favorites</h2>
          <p>Your timeless treasures live here.</p>
          <div className="empty-shelf">No favorites yet... Start stacking your legends!</div>
        </div>

        <div className="shelf-category">
          <h2>📖 To Be Read</h2>
          <p>Stories still waiting to steal your heart.</p>
          <div className="empty-shelf">Your next adventures are just a page away...</div>
        </div>

        <div className="shelf-category">
          <h2>✔️ Completed</h2>
          <p>The worlds you’ve conquered and the tales you've survived.</p>
          <div className="empty-shelf">Close a book, open a memory.</div>
        </div>
      </div>
    </div>
  );
};

export default BookshelfPage;