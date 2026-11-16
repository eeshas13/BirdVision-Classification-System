import json
import os
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

from flask import Flask, render_template, request
from PIL import Image, UnidentifiedImageError
from werkzeug.utils import secure_filename

from model.bird_classifier import predict_bird

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / "static" / "uploads"
DATABASE_PATH = BASE_DIR / "database" / "predictions.db"
BIRDS_PATH = BASE_DIR / "data" / "birds.json"

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = str(UPLOAD_FOLDER)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024
app.secret_key = "birdvision-secret-key"

UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)


def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_filename TEXT NOT NULL,
            predicted_species TEXT NOT NULL,
            scientific_name TEXT NOT NULL,
            confidence REAL NOT NULL,
            prediction_date TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


init_db()


def load_birds():
    with open(BIRDS_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def get_bird_record(species_name):
    birds = load_birds()
    for bird in birds:
        if bird.get("common_name", "").lower() == species_name.lower():
            return bird
    return None


def save_prediction(image_filename, species_name, scientific_name, confidence):
    try:
        conn = get_db_connection()
        conn.execute(
            """
            INSERT INTO predictions (image_filename, predicted_species, scientific_name, confidence, prediction_date)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                image_filename,
                species_name,
                scientific_name,
                float(confidence),
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            ),
        )
        conn.commit()
        conn.close()
        return True
    except sqlite3.Error:
        return False


def get_dashboard_data():
    conn = get_db_connection()
    total_predictions = conn.execute("SELECT COUNT(*) AS count FROM predictions").fetchone()["count"]
    avg_confidence = conn.execute("SELECT AVG(confidence) AS avg FROM predictions").fetchone()["avg"] or 0
    latest = conn.execute(
        "SELECT predicted_species, scientific_name, confidence, prediction_date FROM predictions ORDER BY id DESC LIMIT 1"
    ).fetchone()
    species_count = conn.execute(
        "SELECT COUNT(DISTINCT predicted_species) AS count FROM predictions"
    ).fetchone()["count"]
    frequency = conn.execute(
        "SELECT predicted_species, COUNT(*) AS count FROM predictions GROUP BY predicted_species ORDER BY count DESC LIMIT 5"
    ).fetchall()
    history = conn.execute(
        "SELECT image_filename, predicted_species, scientific_name, confidence, prediction_date FROM predictions ORDER BY id DESC LIMIT 10"
    ).fetchall()
    conn.close()

    return {
        "total_predictions": total_predictions,
        "species_identified": species_count,
        "average_confidence": round(avg_confidence, 2),
        "latest_prediction": dict(latest) if latest else None,
        "frequency": [dict(row) for row in frequency],
        "history": [dict(row) for row in history],
    }


@app.route("/")
def index():
    birds = load_birds()
    stats = {
        "species_count": len(birds),
        "classification": "Image Classification",
        "history": "Prediction History",
        "speed": "Instant Results",
    }
    return render_template("index.html", birds=birds[:5], stats=stats)


@app.route("/identify")
def identify():
    return render_template("identify.html")


@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return render_template("result.html", error="No image uploaded. Please choose a bird photograph first.")

    uploaded_file = request.files["image"]
    if uploaded_file.filename == "":
        return render_template("result.html", error="No image uploaded. Please choose a valid bird image.")

    filename = secure_filename(uploaded_file.filename)
    if not filename:
        return render_template("result.html", error="Invalid file name. Please select another image.")

    ext = filename.rsplit(".", 1)[1].lower() if "." in filename else ""
    if ext not in {"jpg", "jpeg", "png"}:
        return render_template("result.html", error="Wrong file format. Please upload a JPG, JPEG, or PNG image.")

    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    save_path = UPLOAD_FOLDER / unique_filename

    try:
        uploaded_file.save(save_path)
        with Image.open(save_path) as img:
            img.verify()
    except (UnidentifiedImageError, OSError):
        if save_path.exists():
            save_path.unlink()
        return render_template("result.html", error="The uploaded image is corrupted or unreadable. Please upload a valid bird photo.")

    try:
        prediction_result = predict_bird(str(save_path))
    except Exception:
        return render_template("result.html", error="Prediction failed. Please try another bird image or use Demo mode for demonstration.")

    predictions = prediction_result.get("predictions", [])
    if not predictions:
        return render_template("result.html", error="Bird prediction could not be completed. Please try again.")

    top_prediction = predictions[0]
    species_name = top_prediction.get("common_name", "Unknown Bird")
    scientific_name = top_prediction.get("scientific_name", "Unknown")
    confidence = float(top_prediction.get("confidence", 0.0))

    bird_info = get_bird_record(species_name)
    if bird_info is None:
        bird_info = {
            "common_name": species_name,
            "scientific_name": scientific_name,
            "description": "Bird details are unavailable for this prediction. The project is ready for additional species metadata.",
            "habitat": "Not available",
            "diet": "Not available",
            "distribution": "Not available",
            "conservation_status": "Not available",
            "interesting_fact": "This entry uses the current prediction output while the bird library is expanded.",
            "image": "/static/images/birds/default-bird.svg",
        }

    save_prediction(unique_filename, species_name, scientific_name, confidence)

    return render_template(
        "result.html",
        image_path=f"/static/uploads/{unique_filename}",
        prediction=prediction_result,
        bird=bird_info,
        result=top_prediction,
        predictions=predictions,
        mode=prediction_result.get("mode", "demo"),
        message=prediction_result.get("message", "Prediction completed."),
    )


@app.route("/birds")
def birds():
    birds_data = load_birds()
    return render_template("birds.html", birds=birds_data)


@app.route("/bird/<bird_id>")
def bird_detail(bird_id):
    birds_data = load_birds()
    bird = next((item for item in birds_data if item.get("id") == bird_id), None)
    if bird is None:
        return render_template("bird_details.html", error="Bird information not found.")
    return render_template("bird_details.html", bird=bird)


@app.route("/dashboard")
def dashboard():
    data = get_dashboard_data()
    labels = [item["predicted_species"] for item in data["frequency"]]
    counts = [item["count"] for item in data["frequency"]]
    confidence_values = [float(item["confidence"]) for item in data["history"]]
    return render_template(
        "dashboard.html",
        stats=data,
        history=data["history"],
        frequency=data["frequency"],
        labels=labels,
        counts=counts,
        confidence_values=confidence_values,
    )


@app.route("/about")
def about():
    return render_template("about.html")


@app.errorhandler(404)
def page_not_found(error):
    return render_template("index.html", error="The page you are looking for does not exist."), 404


@app.errorhandler(500)
def internal_server_error(error):
    return render_template("index.html", error="A server error occurred. Please try again later."), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)
