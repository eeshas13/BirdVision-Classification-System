# BirdVision – Bird Identification and Classification System

## About the Project
BirdVision is a web-based bird identification system designed to help users upload a bird image, classify it using a Python backend, and learn more about the predicted species. The project combines Flask, image processing, and a simple bird dataset to provide an interactive academic demonstration of machine learning for bird recognition.

The application is built for educational use and project evaluation. It supports real model integration through TensorFlow/Keras when a trained model is available, and it automatically falls back to Demo Mode if the model is missing.

## Features

- Bird image upload
- Image preview before prediction
- Bird species classification
- Confidence score display
- Top prediction results
- Bird information and species details
- Bird species library with search
- Prediction history stored in SQLite
- Analytics dashboard with Chart.js
- Responsive, professional interface

## Technologies Used

- Python
- Flask
- HTML5
- CSS3
- JavaScript
- SQLite
- TensorFlow/Keras
- Pillow
- Chart.js

## Project Structure

bird-classification/
├── app.py
├── requirements.txt
├── README.md
├── .gitignore
├── model/
│   └── bird_classifier.py
├── data/
│   └── birds.json
├── database/
│   ├── .gitkeep
│   └── predictions.db
├── static/
│   ├── css/
│   ├── js/
│   ├── images/
│   └── uploads/
│       └── .gitkeep
├── templates/
│   ├── base.html
│   ├── index.html
│   ├── identify.html
│   ├── result.html
│   ├── birds.html
│   ├── bird_details.html
│   ├── dashboard.html
│   └── about.html
└── .venv/  (ignored locally, not committed)

## Installation

Clone the repository:

```bash
git clone <repository-url>
cd bird-classification
```

Install the required dependencies:

```bash
pip install -r requirements.txt
```

Run the Flask application:

```bash
python app.py
```

Then open the local Flask URL in your browser, typically:

```text
http://127.0.0.1:5000/
```

## Machine Learning Model

This project is structured to support a TensorFlow/Keras bird classification model for real prediction use.

Expected model location:

```text
model/bird_model.keras
```

If the trained model is not included in the repository due to GitHub file size restrictions or because it is being trained separately, place the model file in the `model/` folder before running the prediction pipeline. The application is designed to automatically switch to Demo Mode when the trained model is missing, so the website continues to work without crashing.

## Screenshots

### Home Page
Placeholder for the home page screenshot.

### Bird Identification Page
Placeholder for the bird upload and analysis page screenshot.

### Prediction Result
Placeholder for the final prediction result screenshot.

### Bird Library
Placeholder for the bird library screenshot.

### Dashboard
Placeholder for the analytics dashboard screenshot.

## Future Scope

- More bird species
- Larger and more diverse training dataset
- Real-time bird detection
- Bird sound classification
- Mobile application support
- Location-aware bird identification

## Academic Project Notice

This project was developed for academic and educational purposes to demonstrate bird image classification using Python, Flask, and basic machine learning workflows.

---

This repository is intended to be clean, beginner-friendly, and suitable for a college project demonstration and viva.
