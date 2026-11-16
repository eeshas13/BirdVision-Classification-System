#!/usr/bin/env python3
import base64
import json
import mimetypes
import os
import sys
from email.parser import BytesParser
from email.policy import default
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib import request, error


def load_env_file():
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.exists(env_path):
        return

    with open(env_path, "r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file()
PORT = int(os.environ.get("PORT", "5000"))
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/jpg"}
SUPPORTED_SPECIES = [
    "House Sparrow",
    "Common Myna",
    "Rose-ringed Parakeet",
    "Rock Pigeon",
    "Blue Jay",
    "Robin",
    "Eurasian Hoopoe",
    "Sparrow",
    "Pigeon",
    "Parakeet",
    "Myna",
]
SPECIES_MAP = {
    "house sparrow": {"scientificName": "Passer domesticus"},
    "common myna": {"scientificName": "Acridotheres tristis"},
    "rose-ringed parakeet": {"scientificName": "Psittacula krameri"},
    "rock pigeon": {"scientificName": "Columba livia"},
    "blue jay": {"scientificName": "Cyanocitta cristata"},
    "robin": {"scientificName": "Erithacus rubecula"},
    "eurasian hoopoe": {"scientificName": "Upupa epops"},
}


def normalize_species_name(value):
    if not value:
        return None
    cleaned = value.strip().lower()
    if cleaned.startswith("the "):
        cleaned = cleaned[4:]
    return cleaned


def text_from_response(output):
    if isinstance(output, str):
        text = output.strip()
    elif isinstance(output, list):
        text = "\n".join(str(item) for item in output)
    else:
        text = json.dumps(output)

    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].strip()
    return text.strip()


def parse_prediction_payload(payload_text):
    text = text_from_response(payload_text)
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    lower = text.lower()
    if "no bird" in lower or "not a bird" in lower or "bird not detected" in lower:
        return {
            "status": "no_bird",
            "message": "No bird detected in the uploaded image. Please upload a clear bird photograph.",
        }

    if "uncertain" in lower or "unclear" in lower or "uncertain species" in lower:
        return {
            "status": "uncertain",
            "message": "Bird detected, but species identification is uncertain.",
        }

    species_match = None
    for key in ("species", "bird", "predicted species"):
        idx = lower.find(key)
        if idx != -1:
            fragment = text[idx + len(key):]
            if ":" in fragment:
                species_match = fragment.split(":", 1)[1].strip().strip('"\'`')
                break

    if not species_match:
        if "house sparrow" in lower:
            species_match = "House Sparrow"
        elif "common myna" in lower:
            species_match = "Common Myna"
        elif "rose-ringed parakeet" in lower:
            species_match = "Rose-ringed Parakeet"
        elif "rock pigeon" in lower:
            species_match = "Rock Pigeon"
        elif "blue jay" in lower:
            species_match = "Blue Jay"
    
    if species_match:
        scientific_name = SPECIES_MAP.get(normalize_species_name(species_match), {}).get("scientificName")
        return {
            "species": species_match,
            "scientificName": scientific_name or "Not provided by model",
            "confidence": None,
            "model": "Vision model",
            "status": "identified",
            "message": "Identified",
        }

    return {
        "status": "uncertain",
        "message": "Bird detected, but species identification is uncertain.",
    }


def call_openai_vision(image_bytes, filename):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set. Add your key to a .env file and restart the backend.")

    mime_type = mimetypes.guess_type(filename)[0] or "image/jpeg"
    encoded = base64.b64encode(image_bytes).decode("utf-8")
    prompt = (
        "Analyze this bird photograph. "
        "If there is no bird in the image, return JSON with status:'no_bird' and message:'No bird detected in the uploaded image. Please upload a clear bird photograph.'. "
        "If a bird is present but the species is uncertain, return JSON with status:'uncertain' and message:'Bird detected, but species identification is uncertain.'. "
        "If a bird species is confidently visible, return strict JSON only with keys: species, scientificName, confidence, model, status, message. "
        "Use a real bird species such as House Sparrow, Common Myna, Rose-ringed Parakeet, Rock Pigeon, Blue Jay, Robin, or Eurasian Hoopoe. "
        "Return numbers for confidence, and keep the species and scientific names accurate."
    )

    payload = {
        "model": os.environ.get("VISION_MODEL", "gpt-4o-mini"),
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{encoded}"}},
                ],
            }
        ],
        "temperature": 0.2,
        "max_tokens": 200,
    }

    req = request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )

    try:
        with request.urlopen(req, timeout=90) as response:
            data = json.loads(response.read().decode("utf-8"))
            content = data["choices"][0]["message"]["content"]
            return parse_prediction_payload(content)
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI API rejected the request: {body}") from exc
    except Exception as exc:
        raise RuntimeError(f"Unable to reach the OpenAI image model: {exc}") from exc


def call_huggingface_vision(image_bytes, filename):
    model_url = os.environ.get("HF_VISION_MODEL_URL", "https://api-inference.huggingface.co/models/openai/clip-vit-large-patch14")
    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_TOKEN")
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    candidate_labels = json.dumps([
        "House Sparrow",
        "Common Myna",
        "Rose-ringed Parakeet",
        "Rock Pigeon",
        "Blue Jay",
        "Robin",
        "Eurasian Hoopoe",
        "Sparrow",
        "Pigeon",
        "Parakeet",
        "Myna",
    ])

    payload = {
        "inputs": {
            "image": base64.b64encode(image_bytes).decode("utf-8"),
            "candidate_labels": json.loads(candidate_labels),
        }
    }

    req = request.Request(
        model_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            **headers,
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=90) as response:
            result = json.loads(response.read().decode("utf-8"))
            if isinstance(result, list) and result:
                best = result[0]
                species = best.get("label") or "Uncertain"
                confidence = float(best.get("score", 0.0) * 100)
                return {
                    "species": species,
                    "scientificName": SPECIES_MAP.get(normalize_species_name(species), {}).get("scientificName", "Not provided by model"),
                    "confidence": round(confidence, 1),
                    "model": "OpenAI CLIP",
                    "status": "identified",
                    "message": "Identified",
                }
    except Exception as exc:
        raise RuntimeError(f"Unable to reach the Hugging Face image model: {exc}") from exc

    raise RuntimeError("The configured image model did not return a valid prediction.")


class BirdClassifierHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        root_dir = os.path.dirname(os.path.abspath(__file__))
        requested_path = self.path.split("?", 1)[0]

        if requested_path in ("", "/"):
            file_path = os.path.join(root_dir, "index.html")
        else:
            relative_path = requested_path.lstrip("/")
            if not relative_path:
                file_path = os.path.join(root_dir, "index.html")
            else:
                file_path = os.path.normpath(os.path.join(root_dir, relative_path))
                if not file_path.startswith(root_dir):
                    self.send_error(403, "Forbidden")
                    return

        if not os.path.isfile(file_path):
            self.send_error(404, "Not Found")
            return

        mime_type, _ = mimetypes.guess_type(file_path)
        if mime_type is None:
            mime_type = "application/octet-stream"

        with open(file_path, "rb") as file_obj:
            content = file_obj.read()

        self.send_response(200)
        self.send_header("Content-Type", mime_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(content)

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/api/analyze-image":
            self.send_json({"error": "Route not found."}, 404)
            return

        try:
            content_type = self.headers.get("Content-Type", "")
            if "multipart/form-data" not in content_type:
                self.send_json({"error": "Expected multipart/form-data upload."}, 400)
                return

            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length)
            message = BytesParser(policy=default).parsebytes(
                f"Content-Type: {content_type}\r\n\r\n".encode("utf-8") + body
            )

            uploaded_file = None
            for part in message.iter_parts():
                if part.get_filename():
                    uploaded_file = part
                    break

            if uploaded_file is None:
                self.send_json({"error": "No image file was included in the upload."}, 400)
                return

            file_name = uploaded_file.get_filename() or "upload.jpg"
            image_bytes = uploaded_file.get_payload(decode=True)
            mime_type = uploaded_file.get_content_type() or "image/jpeg"

            if mime_type not in ALLOWED_TYPES:
                self.send_json({"error": "Unsupported file format. Please upload JPG, JPEG, or PNG."}, 400)
                return

            if not image_bytes or len(image_bytes) == 0:
                self.send_json({"error": "The uploaded image is empty."}, 400)
                return

            provider = (os.environ.get("VISION_PROVIDER") or "openai").lower()
            try:
                if provider == "hf":
                    result = call_huggingface_vision(image_bytes, file_name)
                else:
                    result = call_openai_vision(image_bytes, file_name)
            except RuntimeError as exc:
                self.send_json({
                    "error": str(exc),
                    "status": "error",
                    "message": "The image model is not configured correctly. Set the required environment variables and retry."
                }, 503)
                return

            if not isinstance(result, dict):
                result = {"status": "uncertain", "message": "Bird detected, but species identification is uncertain."}

            self.send_json(result)
        except Exception as exc:
            self.send_json({
                "error": f"Server error: {exc}",
                "status": "error",
                "message": "Image analysis failed. Please upload a valid bird image and try again."
            }, 500)


if __name__ == "__main__":
    try:
        print(f"Starting BirdSense backend on http://127.0.0.1:{PORT}")
        ThreadingHTTPServer(("127.0.0.1", PORT), BirdClassifierHandler).serve_forever()
    except KeyboardInterrupt:
        print("\nStopping BirdSense backend.")
        sys.exit(0)
