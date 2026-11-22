import re
import sys
from pathlib import Path

import cv2
import pytesseract

carpeta = Path(sys.argv[1])
detector = cv2.CascadeClassifier(sys.argv[2])
combinaciones = [(640, 0), (640, 4), (640, 8), (640, 14), (640, 20), (320, 0), (320, 6), (320, 10), (320, 14)]
zona_cara = (220, 82, 120, 120)


def digitos_leidos(ruta):
    leido = pytesseract.image_to_string(cv2.imread(str(ruta)), config="--psm 6")
    return re.findall(r"\d{6,}", leido)


def cara_real_detectada(ruta, ancho):
    gris = cv2.cvtColor(cv2.imread(str(ruta)), cv2.COLOR_BGR2GRAY)
    cajas = detector.detectMultiScale(gris, scaleFactor=1.05, minNeighbors=3, minSize=(15, 15))
    escala = ancho / 640
    x, y, w, h = [v * escala for v in zona_cara]
    return any(x <= cx + cw / 2 <= x + w and y <= cy + ch / 2 <= y + h for cx, cy, cw, ch in cajas)


print("ancho  desenfoque  digitos que lee el OCR        cara detectada  peso de la foto con cara")
for ancho, nivel in combinaciones:
    texto = carpeta / f"texto-{ancho}-{nivel}.jpg"
    cara = carpeta / f"cara-{ancho}-{nivel}.jpg"
    print(f"{ancho:>5}  {nivel:>10}  {str(digitos_leidos(texto)):<30}{str(cara_real_detectada(cara, ancho)):<16}{cara.stat().st_size / 1024:.1f} KB")
