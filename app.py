import os
from pathlib import Path
from flask import Flask
from modules.modules import modules

app = Flask(__name__)
secret_key = os.environ.get("SECRET_KEY")
if not secret_key:
    secret_path = Path(app.instance_path) / "secret_key"
    secret_path.parent.mkdir(parents=True, exist_ok=True)
    if not secret_path.exists():
        temporary_path = secret_path.with_name(f".secret_key.{os.urandom(8).hex()}.tmp")
        file_descriptor = os.open(temporary_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        try:
            with os.fdopen(file_descriptor, "w", encoding="ascii") as secret_file:
                secret_file.write(os.urandom(32).hex())
                secret_file.flush()
                os.fsync(secret_file.fileno())
            try:
                os.link(temporary_path, secret_path)
            except FileExistsError:
                pass
        finally:
            temporary_path.unlink(missing_ok=True)
    secret_key = secret_path.read_text(encoding="ascii").strip()
app.secret_key = secret_key
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024
app.register_blueprint(modules)

if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1")