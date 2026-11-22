import sys
import numpy as np
from PIL import Image
from skimage import data

carpeta = sys.argv[1]
rng = np.random.default_rng(1)
foto = Image.fromarray(data.astronaut()).resize((3000, 3000), Image.LANCZOS)
ruido = rng.normal(0, 6, (3000, 3000, 3))
foto = Image.fromarray(np.clip(np.asarray(foto) + ruido, 0, 255).astype("uint8"))
foto.save(f"{carpeta}/cara.jpg", quality=95)
