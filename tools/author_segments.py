#!/usr/bin/env python3
"""
Autoría de los 6 segmentos del recorrido. Cada segmento es una cuadrícula de 25 columnas x 9 filas.
Leyenda:  .  vacío   F  comida   g  peligro aéreo (1 celda)   B  peligro de suelo alto (ancla en el piso)
Genera src/content/segments.json (la fuente de verdad que leen el juego y el validador).
Reglas de diseño: columnas 0-1 y 23-24 sin peligros (puertas de unión entre segmentos).
Total de comida en los 6 segmentos = 15.
"""
import json, sys
from pathlib import Path

COLS, ROWS = 25, 9

SEGMENTS = {
  # (col, fila, caracter)
  "s1-aprende": ("Aprende a aletear (comida fácil, peligros al final)", [
    (6,4,'F'),(11,3,'F'),(14,4,'F'),
    (21,4,'g'),(22,8,'B'),
  ]),
  "s2-pareja": ("Gaviotas en pareja", [
    (6,1,'g'),(6,5,'g'),(16,1,'g'),(16,5,'g'),
    (12,8,'B'),
    (9,3,'F'),(19,3,'F'),
  ]),
  "s3-escalera": ("Palmeras en fila", [
    (5,8,'B'),(9,8,'B'),(13,8,'B'),(17,8,'B'),(21,8,'B'),
    (11,4,'g'),(15,3,'g'),
    (7,3,'F'),(12,2,'F'),(19,4,'F'),
  ]),
  "s4-diagonal": ("Diagonal descendente", [
    (5,2,'g'),(7,3,'g'),(9,4,'g'),(11,5,'g'),(13,6,'g'),
    (19,8,'B'),
    (16,2,'F'),(21,6,'F'),
  ]),
  "s5-muro": ("Muro con ventana", [
    (8,8,'B'),(9,8,'B'),(8,4,'g'),(9,4,'g'),
    (15,2,'g'),(15,6,'g'),
    (8,1,'F'),(12,5,'F'),(19,4,'F'),
  ]),
  "s6-puertas": ("Cuatro puertas", [
    (5,2,'g'),(5,5,'g'),
    (10,4,'g'),(10,8,'B'),
    (15,1,'g'),(15,4,'g'),
    (20,3,'g'),(20,7,'g'),
    (12,2,'F'),(22,5,'F'),
  ]),
}

def render(items):
    grid = [['.']*COLS for _ in range(ROWS)]
    for c, r, ch in items:
        assert 0 <= c < COLS and 0 <= r < ROWS, (c, r, ch)
        assert grid[r][c] == '.', f"celda ocupada {(c,r)}"
        if ch in 'gB':
            assert 2 <= c <= 22, f"peligro fuera de la zona segura {(c,r,ch)}"
        grid[r][c] = ch
    return [''.join(row) for row in grid]

out = {"cols": COLS, "rows": ROWS, "segments": []}
total_food = 0
for sid, (name, items) in SEGMENTS.items():
    g = render(items)
    total_food += sum(r.count('F') for r in g)
    out["segments"].append({"id": sid, "name": name, "grid": g})
assert total_food == 15, total_food
dest = Path(sys.argv[1] if len(sys.argv) > 1 else "src/content/segments.json")
dest.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
print(f"OK {len(out['segments'])} segmentos, {total_food} comidas -> {dest}")
