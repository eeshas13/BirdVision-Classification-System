import json
from pathlib import Path

import numpy as np
from PIL import Image, UnidentifiedImageError

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "model" / "bird_model.keras"
BIRDS_PATH = BASE_DIR / "data" / "birds.json"


def load_birds():
    with open(BIRDS_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def _demo_predictions():
    """Return placeholder predictions when a trained model is not available."""
    birds = load_birds()
    ordered_birds = birds[:5]
    confidences = [92, 5, 3, 0, 0]
    predictions = []

    for index, bird in enumerate(ordered_birds):
        confidence = confidences[index] if index < len(confidences) else 0
        predictions.append(
            {
                "common_name": bird["common_name"],
                "scientific_name": bird["scientific_name"],
                "confidence": float(confidence),
            }
        )

    if not predictions:
        predictions = [{"common_name": "Unknown Bird", "scientific_name": "Unknown", "confidence": 0.0}]

    return {"mode": "demo", "message": "Demo classification mode is active because no trained model file was found.", "predictions": predictions}


def predict_bird(image_path):
    """Predict bird species from an uploaded image."""
    if not image_path or not Path(image_path).exists():
        raise FileNotFoundError("Image file does not exist.")

    try:
        image = Image.open(image_path).convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise ValueError("Uploaded image is corrupted.")

    image = image.resize((224, 224))
    image_array = np.asarray(image, dtype=np.float32) / 255.0
    image_array = np.expand_dims(image_array, axis=0)

    if MODEL_PATH.exists():
        try:
            from tensorflow.keras.models import load_model

            model = load_model(str(MODEL_PATH))
            species_names = [bird["common_name"] for bird in load_birds()]
            prediction_values = model.predict(image_array, verbose=0)[0]

            if prediction_values.ndim == 0:
                prediction_values = np.array([float(prediction_values)])

            if len(species_names) != len(prediction_values):
                raise ValueError("Model output size does not match the bird list.")

            score_pairs = []
            for index, species_name in enumerate(species_names):
                score_pairs.append((species_name, float(prediction_values[index])))

            score_pairs = sorted(score_pairs, key=lambda item: item[1], reverse=True)
            predictions = []
            for species_name, score in score_pairs[:5]:
                bird_info = next((bird for bird in load_birds() if bird["common_name"] == species_name), None)
                predictions.append(
                    {
                        "common_name": species_name,
                        "scientific_name": bird_info["scientific_name"] if bird_info else "Unknown",
                        "confidence": round(float(score) * 100, 2),
                    }
                )

            return {
                "mode": "real",
                "message": "Prediction generated using the trained model.",
                "predictions": predictions,
            }
        except Exception as exc:
            print(f"Real model mode failed: {exc}. Falling back to Demo mode.")

    return _demo_predictions()
