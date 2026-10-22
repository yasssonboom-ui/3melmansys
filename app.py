import os
from flask import Flask
from modules.modules import modules

app = Flask(__name__)
secret_key = os.environ.get("SECRET_KEY")
if not secret_key:
    if os.environ.get("FLASK_DEBUG") == "1":
        secret_key = os.urandom(32)
    else:
        raise RuntimeError("SECRET_KEY must be set in the environment outside debug mode")
app.secret_key = secret_key
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024
app.register_blueprint(modules)

if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1")