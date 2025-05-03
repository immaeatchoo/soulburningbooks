from sqlalchemy import or_, text
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
# --- CachedCover model for local book cover cache ---

from flask import Flask, jsonify, request, redirect
from werkzeug.utils import secure_filename
from flask import send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import or_
import os
from datetime import datetime
import requests
GOOGLE_API_KEY = "AIzaSyAWskBlyae-TvXh_TnMKwOOQNNtMYxNdyQ"

app = Flask(__name__)



# Dedicated smart search API endpoint (now with caching new covers)
@app.route("/api/smart_search", methods=["GET"])
def smart_search():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify([])
    # First check local cache before hitting Google API
    cached = CachedCover.query.filter(CachedCover.title.ilike(f"%{query}%")).all()
    if cached:
        print(f"⚡ Using {len(cached)} cached cover(s) for '{query}'")
        return jsonify([
            {
                "title": c.title,
                "author": c.author,
                "cover": c.cover,
                "infoLink": c.info_link
            } for c in cached
        ])
    cached = CachedCover.query.filter(CachedCover.title.ilike(f"%{query}%")).all()
    if cached:
        return jsonify([
            {
                "title": c.title,
                "author": c.author,
                "cover": c.cover,
                "infoLink": c.info_link
            } for c in cached
        ])

    try:
        response = requests.get(
            f"https://www.googleapis.com/books/v1/volumes?q=intitle:{query}&maxResults=20&key={GOOGLE_API_KEY}"
        )
        data = response.json()

        results = []
        new_covers = []
        for item in data.get("items", []):
            info = item.get("volumeInfo", {})
            title = info.get("title", "").strip()
            authors = info.get("authors", [])
            image_links = info.get("imageLinks", {})
            thumbnail = image_links.get("thumbnail", "").strip() or image_links.get("smallThumbnail", "").strip()
            info_link = info.get("infoLink", "").strip()

            if not title or not authors or not thumbnail:
                continue

            results.append({
                "title": title,
                "author": ", ".join(authors),
                "cover": thumbnail,
                "infoLink": info_link
            })

            # Cache new results into database if not already cached
            if not CachedCover.query.filter_by(title=title, author=", ".join(authors)).first():
                new_cover = CachedCover(
                    title=title,
                    author=", ".join(authors),
                    cover=thumbnail,
                    info_link=info_link
                )
                db.session.add(new_cover)
                new_covers.append(new_cover)
        if new_covers:
            db.session.commit()

        return jsonify(results)
    except Exception as e:
        print(f"Smart search failed: {e}")
        return jsonify([]), 500
# Endpoint to fetch cached covers for a title (local DB)
@app.route("/cached_covers")
def cached_covers():
    title = request.args.get("title", "").strip().lower()
    if not title:
        return jsonify([])

    matches = CachedCover.query.filter(CachedCover.title.ilike(f"%{title}%")).all()
    return jsonify([
        {
            "title": c.title,
            "author": c.author,
            "cover": c.cover,
            "infoLink": c.info_link
        } for c in matches
    ])
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'books.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
CORS(app)

# --- CachedCover model for local book cover cache ---
class Book(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200))
    author = db.Column(db.String(200))
    series = db.Column(db.String(200))
    book_number = db.Column(db.Integer)
    rating = db.Column(db.Integer)
    date_read = db.Column(db.String(50))
    cover_local = db.Column(db.String(500))
    cover_google = db.Column(db.String(500))
    page_count = db.Column(db.Integer)
    tags = db.Column(db.String(300))
    summary = db.Column(db.Text)
    quote = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# ✅ Move CachedCover OUTSIDE and make it its own class
class CachedCover(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(300))
    author = db.Column(db.String(300))
    cover = db.Column(db.String(500))
    info_link = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    

@app.route("/")
def hello():
    return jsonify({"message": "Burning Pages backend is working 🔥"})

@app.route("/books", methods=["GET"])
def get_books():
    books = Book.query.all()
    return jsonify([
        {
            "id": book.id,
            "title": book.title,
            "author": book.author,
            "series": book.series,
            "book_number": book.book_number,
            "rating": book.rating,
            "date_read": book.date_read,
            "cover": book.cover_google or book.cover_local,
            "page_count": book.page_count,
            "tags": book.tags,
            "summary": book.summary,
            "quote": book.quote,
            "created_at": book.created_at.isoformat() if book.created_at else None,
            "updated_at": book.updated_at.isoformat() if book.updated_at else None,
        } for book in books
    ])

@app.route("/api/books", methods=["GET"])
def get_books_alias():
    return get_books()

@app.route("/books", methods=["POST"])
def add_book():
    data = request.get_json()
    # Determine cover storage
    raw_cover = data.get("cover", "")
    cover_google = data.get("cover_google", "")
    cover_local = raw_cover if raw_cover and not raw_cover.startswith("http") else ""

    new_book = Book(
        title=data.get("title", ""),
        author=data.get("author", ""),
        series=data.get("series", ""),
        book_number=data.get("book_number", 0),
        rating=data.get("rating", 0),
        date_read=data.get("date_read", ""),
        cover_local=cover_local,
        cover_google=cover_google,
        page_count=data.get("page_count", 0),
        tags=data.get("tags", ""),
        summary=data.get("summary", ""),
        quote=data.get("quote", ""),
    )
    existing_series = {s[0] for s in db.session.query(Book.series).distinct()}
    if new_book.series and new_book.series not in existing_series:
        # Series will be naturally added since series field is persisted
        pass

    db.session.add(new_book)
    db.session.commit()

    # Include any extra fields received in the response for future-proofing
    response_data = {
        "id": new_book.id,
        "title": new_book.title,
        "author": new_book.author,
        "series": new_book.series,
        "book_number": new_book.book_number,
        "rating": new_book.rating,
        "date_read": new_book.date_read,
        "cover": new_book.cover_google or new_book.cover_local,
        "page_count": new_book.page_count,
        "tags": new_book.tags,
        "summary": new_book.summary,
        "quote": new_book.quote,
    }
    # Merge any additional unexpected fields from input into the response
    for key in data:
        if key not in response_data:
            response_data[key] = data[key]

    return jsonify({
        "message": "Book added successfully",
        "book": response_data
    }), 201

@app.route("/api/books", methods=["POST"])
def add_book_alias():
    return add_book()

@app.route("/books/<int:book_id>", methods=["PATCH"])
def update_book(book_id):
    book = Book.query.get_or_404(book_id)
    data = request.get_json()
    # Handle unified cover field
    if "cover" in data:
        raw_cover = data["cover"] or ""
        book.cover_local  = raw_cover if raw_cover and not raw_cover.startswith("http") else ""
        book.cover_google = raw_cover if raw_cover.startswith("http") else ""

    for field in ["title", "author", "series", "book_number", "rating", "date_read", "page_count", "tags", "summary", "quote"]:
        if field in data:
            setattr(book, field, data[field])

    db.session.commit()

    return jsonify({
        "message": "Book updated successfully",
        "book": {
            "id": book.id,
            "title": book.title,
            "author": book.author,
            "series": book.series,
            "book_number": book.book_number,
            "rating": book.rating,
            "date_read": book.date_read,
            "cover": book.cover_google or book.cover_local,
            "page_count": book.page_count,
            "tags": book.tags,
            "summary": book.summary,
            "quote": book.quote,
            "created_at": book.created_at.isoformat() if book.created_at else None,
            "updated_at": book.updated_at.isoformat() if book.updated_at else None,
        }
    })


@app.route("/books/<int:book_id>", methods=["DELETE"])
def delete_book(book_id):
    book = Book.query.get_or_404(book_id)
    if book.cover_local:
        cover_path = os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(book.cover_local))
        if os.path.exists(cover_path):
            os.remove(cover_path)
    db.session.delete(book)
    db.session.commit()
    return jsonify({"message": f"Book with ID {book_id} deleted successfully."})

@app.route("/books", methods=["DELETE"])
def delete_all_books():
    Book.query.delete()
    db.session.commit()
    return jsonify({"message": "All books deleted successfully."})

# Add alias route for deleting all books via /api/books
@app.route("/api/books", methods=["DELETE"])
def delete_all_books_alias():
    return delete_all_books()

from sqlalchemy import text

@app.route('/api/series', methods=['PATCH'])
def update_series():
    """
    Accepts a JSON payload with an 'updates' mapping of old_series_name -> new_series_name.
    Applies each mapping exactly, updating only books that match the old series.
    Does not perform any sweeping deletion or reassignment beyond the explicit mappings provided.
    """
    data = request.get_json() or {}
    updates = data.get('updates', {})

    if not updates:
        return jsonify({'error': 'No updates provided'}), 400

    try:
        # Apply each explicit mapping using ORM for safety
        for old_name, new_name in updates.items():
            if old_name and new_name and old_name != new_name:
                # Only update books where the current series exactly matches old_name
                db.session.query(Book).filter(Book.series == old_name).update({"series": new_name}, synchronize_session="fetch")

        db.session.commit()
        return jsonify({'message': 'Series names updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error updating series: {e}")
        return jsonify({'error': 'Failed to update series.'}), 500

# New route to get a single book by ID
@app.route("/books/<int:book_id>", methods=["GET"])
def get_book(book_id):
    book = Book.query.get_or_404(book_id)
    return jsonify({
        "id": book.id,
        "title": book.title,
        "author": book.author,
        "series": book.series,
        "book_number": book.book_number,
        "rating": book.rating,
        "date_read": book.date_read,
        "cover": book.cover_google or book.cover_local,
        "page_count": book.page_count,
        "tags": book.tags,
        "summary": book.summary,
        "quote": book.quote,
        "created_at": book.created_at.isoformat() if book.created_at else None,
        "updated_at": book.updated_at.isoformat() if book.updated_at else None,
    })

# Route to list all unique series
@app.route("/series", methods=["GET"])
def get_series():
    all_series = Book.query.with_entities(Book.series).distinct().all()
    series_list = sorted(set(s[0] for s in all_series if s[0]))
    return jsonify(series_list)




from sqlalchemy import func

@app.route("/api/series/<series_name>", methods=["GET"])
def get_books_by_series(series_name):
    books = Book.query.filter(
        Book.series.isnot(None),
        func.lower(func.trim(Book.series)) == func.lower(func.trim(series_name))
    ).all()

    return jsonify({
        "books": [
            {
                "id": book.id,
                "title": book.title,
                "author": book.author,
                "series": book.series,
                "book_number": book.book_number,
                "rating": book.rating,
                "date_read": book.date_read,
                "cover": book.cover_google or book.cover_local,
                "page_count": book.page_count,
                "tags": book.tags,
                "summary": book.summary,
                "quote": book.quote,
                "created_at": book.created_at.isoformat() if book.created_at else None,
                "updated_at": book.updated_at.isoformat() if book.updated_at else None,
            } for book in books
        ]
    })


@app.route("/health", methods=["GET"])
def health_check():
    html = (
        "<!DOCTYPE html>"
        "<html lang='en'>"
        "<head><meta charset='UTF-8'><title>Burning Pages Status</title></head>"
        "<body style='font-family: sans-serif; background: #fdf6ec; color: #222; padding: 2rem;'>"
        "<h1>🔥 Burning Pages Backend</h1>"
        "<p>Status: <strong style='color: green;'>OK</strong></p>"
        "<p>Message: Backend is running smoothly!</p>"
        "</body></html>"
    )
    return html, 200, {"Content-Type": "text/html; charset=utf-8"}

 
    
UPLOAD_FOLDER = os.path.join(basedir, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route("/upload_cover", methods=["POST"])
def upload_cover():
    if 'file' not in request.files:
        # No file part, allow empty upload to fallback to Google cover if available
        return jsonify({"cover_url": ""}), 200

    file = request.files['file']
    if file.filename == '':
        # No selected file, allow empty upload to fallback to Google cover if available
        return jsonify({"cover_url": ""}), 200

    allowed_extensions = {'png', 'jpg', 'jpeg', 'webp'}
    filename = secure_filename(file.filename)
    if '.' not in filename or filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
        return jsonify({"error": "File type not allowed"}), 400

    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    return jsonify({"cover_url": f"/covers/{filename}"}), 200

@app.route("/covers/<filename>")
def serve_cover(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route("/search", methods=["GET"])
def search_books():
    query = request.args.get("q", "")
    if not query:
        return jsonify([])

    books = Book.query.filter(
        or_(
            Book.title.ilike(f"%{query}%"),
            Book.author.ilike(f"%{query}%"),
            Book.tags.ilike(f"%{query}%")
        )
    ).all()

    return jsonify([
        {
            "id": book.id,
            "title": book.title,
            "author": book.author,
            "series": book.series,
            "book_number": book.book_number,
            "rating": book.rating,
            "date_read": book.date_read,
            "cover_local": book.cover_local,
            "cover_google": book.cover_google,
            "page_count": book.page_count,
            "tags": book.tags,
            "summary": book.summary,
            "created_at": book.created_at.isoformat() if book.created_at else None,
            "updated_at": book.updated_at.isoformat() if book.updated_at else None,
        } for book in books
    ])

import csv
import requests

GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes"

def fetch_google_cover(isbn=None, title=None):
    params = {}
    if isbn:
        params["q"] = f"isbn:{isbn}"
    elif title:
        params["q"] = f"intitle:{title}"
    else:
        return ""

    try:
        response = requests.get(GOOGLE_BOOKS_API, params={**params, "key": GOOGLE_API_KEY})
        data = response.json()
        if "items" in data and data["items"]:
            return data["items"][0]["volumeInfo"].get("imageLinks", {}).get("thumbnail", "")
    except Exception as e:
        print(f"Error fetching cover: {e}")
    return ""

# CSV import route with Google Books cover lookup
@app.route("/import_csv", methods=["POST"])
def import_csv():
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    stream = file.stream.read().decode("utf-8").splitlines()
    reader = csv.DictReader(stream)

    books_to_return = []
    for idx, row in enumerate(reader):
        isbn = row.get("ISBN", "").strip()
        title = row.get("Title", "").strip()
        author = row.get("Author", "").strip()

        cover_url = fetch_google_cover(isbn=isbn) or fetch_google_cover(title=title)

        new_book = Book(
            title=title,
            author=author,
            cover_google=cover_url
        )
        db.session.add(new_book)
        db.session.flush()  # Pre-commit flush to get new_book.id

        if idx < 20:
            books_to_return.append({
                "id": new_book.id,
                "title": title,
                "author": author,
                "cover": cover_url,
            })

    db.session.commit()
    return jsonify({"message": "Books imported", "books": books_to_return}), 201

# Utility endpoint to refetch alternate cover for a book
@app.route("/books/<int:book_id>/refetch_cover", methods=["POST"])
def refetch_cover(book_id):
    book = Book.query.get_or_404(book_id)
    # Try to fetch by ISBN if available, fallback to title
    isbn = None
    # If you store ISBN in your Book model, use book.isbn here; otherwise, skip
    title = book.title
    new_cover = fetch_google_cover(isbn=isbn, title=title)
    if new_cover:
        book.cover_google = new_cover
        db.session.commit()
        return jsonify({"message": "Cover updated", "cover": new_cover}), 200
    else:
        return jsonify({"message": "No alternate cover found"}), 404

with app.app_context():
    db.create_all()


# Move the pending review route above the main block and outside any function
@app.route("/books/pending-review", methods=["GET"])
def get_pending_cover_books():
    books = Book.query.all()
    seen = set()
    unique_books = []
    for book in books:
        key = (book.title.strip().lower(), book.author.strip().lower())
        if key not in seen:
            seen.add(key)
            unique_books.append(book)
    return jsonify([
        {
            "id": book.id,
            "title": book.title,
            "author": book.author,
            "cover": book.cover_google or book.cover_local
        }
        for book in unique_books
    ])

if __name__ == "__main__":
    # Listen on all interfaces on port 5001 to avoid conflicts
    app.run(host="0.0.0.0", port=5001, debug=True)
    
    