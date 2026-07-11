import sys
from pathlib import Path

# Make `app` and `train` importable when running pytest from the ml/ directory.
sys.path.insert(0, str(Path(__file__).resolve().parent))
