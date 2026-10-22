import os
from flask import Flask
from modules.modules import modules

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY") or os.urandom(32)
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024
app.register_blueprint(modules)

if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1")
