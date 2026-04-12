#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import os
import shutil
import struct
import unicodedata
import xml.sax.saxutils as saxutils
import zipfile
import zlib
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path("/home/projekt")
TEMPLATE_DOCX = Path("/tmp/Dokumentacja_before_rewrite.docx")
SCREENSHOT_DOCX = ROOT / "Dok1.docx"
OUTPUT_DOCX = ROOT / "Dokumentacja_GameVault_Projekt.docx"
ASSET_DIR = ROOT / "generated_docx_assets"

PAGE_WIDTH_EMU = 6_000_000
IMAGE_W = 1200
IMAGE_H = 760

COLORS = {
    "bg": (245, 247, 252),
    "surface": (255, 255, 255),
    "surface2": (233, 238, 246),
    "surface3": (219, 225, 236),
    "text": (36, 41, 54),
    "muted": (96, 104, 118),
    "primary": (78, 70, 229),
    "primary_dark": (56, 45, 180),
    "secondary": (109, 76, 230),
    "accent": (160, 100, 231),
    "green": (25, 173, 120),
    "green_bg": (224, 248, 239),
    "red": (219, 65, 78),
    "red_bg": (252, 230, 233),
    "amber": (234, 148, 34),
    "amber_bg": (255, 244, 223),
    "blue": (53, 118, 230),
    "blue_bg": (226, 239, 255),
    "dark": (18, 20, 28),
    "dark2": (28, 30, 41),
    "line": (214, 220, 230),
}


FONT_5X7 = {
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    "C": ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    "G": ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
    "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    "I": ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    "J": ["00001", "00001", "00001", "00001", "10001", "10001", "01110"],
    "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    "N": ["10001", "10001", "11001", "10101", "10011", "10001", "10001"],
    "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    "Q": ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
    "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    "V": ["10001", "10001", "10001", "10001", "01010", "01010", "00100"],
    "W": ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
    "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    "Y": ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    "Z": ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
    "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
    "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
    "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
    "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
    "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
    ".": ["00000", "00000", "00000", "00000", "00000", "00110", "00110"],
    ",": ["00000", "00000", "00000", "00000", "00110", "00100", "01000"],
    ":": ["00000", "00110", "00110", "00000", "00110", "00110", "00000"],
    ";": ["00000", "00110", "00110", "00000", "00110", "00100", "01000"],
    "/": ["00001", "00010", "00100", "01000", "10000", "00000", "00000"],
    "%": ["11001", "11010", "00100", "01000", "10110", "00110", "00000"],
    "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
    "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
    ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
    "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
    "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
    "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
    " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
}


def ascii_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return normalized.encode("ascii", "ignore").decode("ascii")


class Canvas:
    def __init__(self, width: int, height: int, background: tuple[int, int, int]):
        self.width = width
        self.height = height
        self.pixels = bytearray(width * height * 3)
        self.fill(background)

    def fill(self, color: tuple[int, int, int]) -> None:
        row = bytes(color) * self.width
        self.pixels = bytearray(row * self.height)

    def set_pixel(self, x: int, y: int, color: tuple[int, int, int]) -> None:
        if 0 <= x < self.width and 0 <= y < self.height:
            index = (y * self.width + x) * 3
            self.pixels[index:index + 3] = bytes(color)

    def fill_rect(self, x: int, y: int, w: int, h: int, color: tuple[int, int, int]) -> None:
        x0 = max(0, x)
        y0 = max(0, y)
        x1 = min(self.width, x + w)
        y1 = min(self.height, y + h)
        if x1 <= x0 or y1 <= y0:
            return
        row = bytes(color) * (x1 - x0)
        for yy in range(y0, y1):
            index = (yy * self.width + x0) * 3
            self.pixels[index:index + len(row)] = row

    def stroke_rect(self, x: int, y: int, w: int, h: int, color: tuple[int, int, int], thickness: int = 1) -> None:
        self.fill_rect(x, y, w, thickness, color)
        self.fill_rect(x, y + h - thickness, w, thickness, color)
        self.fill_rect(x, y, thickness, h, color)
        self.fill_rect(x + w - thickness, y, thickness, h, color)

    def fill_round_rect(self, x: int, y: int, w: int, h: int, radius: int, color: tuple[int, int, int]) -> None:
        radius = max(0, min(radius, min(w // 2, h // 2)))
        if radius == 0:
            self.fill_rect(x, y, w, h, color)
            return
        self.fill_rect(x + radius, y, w - 2 * radius, h, color)
        self.fill_rect(x, y + radius, radius, h - 2 * radius, color)
        self.fill_rect(x + w - radius, y + radius, radius, h - 2 * radius, color)
        rr = radius * radius
        for dy in range(radius):
            for dx in range(radius):
                if (dx - radius + 1) ** 2 + (dy - radius + 1) ** 2 <= rr:
                    self.set_pixel(x + radius - 1 - dx, y + radius - 1 - dy, color)
                    self.set_pixel(x + w - radius + dx, y + radius - 1 - dy, color)
                    self.set_pixel(x + radius - 1 - dx, y + h - radius + dy, color)
                    self.set_pixel(x + w - radius + dx, y + h - radius + dy, color)
        for yy in range(y, y + h):
            inside_started = False
            run_start = 0
            for xx in range(x, x + w):
                index = (yy * self.width + xx) * 3
                if self.pixels[index:index + 3] == bytes(color):
                    if not inside_started:
                        run_start = xx
                        inside_started = True
                elif inside_started:
                    self.fill_rect(run_start, yy, xx - run_start, 1, color)
                    inside_started = False
            if inside_started:
                self.fill_rect(run_start, yy, x + w - run_start, 1, color)

    def line(self, x1: int, y1: int, x2: int, y2: int, color: tuple[int, int, int], thickness: int = 1) -> None:
        dx = x2 - x1
        dy = y2 - y1
        steps = max(abs(dx), abs(dy), 1)
        for step in range(steps + 1):
            x = round(x1 + dx * step / steps)
            y = round(y1 + dy * step / steps)
            self.fill_rect(x - thickness // 2, y - thickness // 2, thickness, thickness, color)

    def text(self, x: int, y: int, value: str, color: tuple[int, int, int], scale: int = 3, uppercase: bool = True) -> None:
        display = ascii_text(value)
        display = display.upper() if uppercase else display
        cursor_x = x
        for ch in display:
            glyph = FONT_5X7.get(ch, FONT_5X7["?"])
            for row_index, row in enumerate(glyph):
                for col_index, pixel in enumerate(row):
                    if pixel == "1":
                        self.fill_rect(
                            cursor_x + col_index * scale,
                            y + row_index * scale,
                            scale,
                            scale,
                            color,
                        )
            cursor_x += (5 + 1) * scale

    def png_bytes(self) -> bytes:
        def chunk(tag: bytes, data: bytes) -> bytes:
            return (
                struct.pack("!I", len(data))
                + tag
                + data
                + struct.pack("!I", zlib.crc32(tag + data) & 0xFFFFFFFF)
            )

        raw = bytearray()
        for y in range(self.height):
            raw.append(0)
            start = y * self.width * 3
            raw.extend(self.pixels[start:start + self.width * 3])

        return b"".join(
            [
                b"\x89PNG\r\n\x1a\n",
                chunk(
                    b"IHDR",
                    struct.pack("!IIBBBBB", self.width, self.height, 8, 2, 0, 0, 0),
                ),
                chunk(b"IDAT", zlib.compress(bytes(raw), level=9)),
                chunk(b"IEND", b""),
            ]
        )


def draw_button(canvas: Canvas, x: int, y: int, w: int, h: int, text: str, primary: bool = True) -> None:
    fill = COLORS["primary"] if primary else COLORS["surface"]
    text_color = (255, 255, 255) if primary else COLORS["primary"]
    border = COLORS["primary"] if not primary else COLORS["primary"]
    canvas.fill_round_rect(x, y, w, h, 18, fill)
    if not primary:
        canvas.stroke_rect(x, y, w, h, border, 2)
    canvas.text(x + 20, y + 17, text, text_color, scale=3)


def draw_input(canvas: Canvas, x: int, y: int, w: int, h: int, label: str, value: str = "") -> None:
    canvas.text(x, y - 22, label, COLORS["muted"], scale=2)
    canvas.fill_round_rect(x, y, w, h, 12, COLORS["surface2"])
    canvas.stroke_rect(x, y, w, h, COLORS["line"], 2)
    if value:
        canvas.text(x + 16, y + 15, value, COLORS["text"], scale=3)


def draw_badge(canvas: Canvas, x: int, y: int, text: str, bg: tuple[int, int, int], fg: tuple[int, int, int]) -> None:
    width = max(80, len(ascii_text(text)) * 12 + 22)
    canvas.fill_round_rect(x, y, width, 28, 14, bg)
    canvas.text(x + 10, y + 8, text, fg, scale=2)


def draw_navbar(canvas: Canvas, active: str, user_role: str | None = None) -> None:
    canvas.fill_rect(0, 0, canvas.width, 72, COLORS["surface"])
    canvas.stroke_rect(0, 0, canvas.width, 72, COLORS["line"], 1)
    canvas.text(28, 24, "GAMEVAULT", COLORS["primary"], scale=4)
    nav_items = ["STRONA GLOWNA", "DASHBOARD", "SKLEP", "ZAMOWIENIA", "RECENZJE"]
    positions = [360, 540, 670, 820, 1010]
    for label, pos in zip(nav_items, positions):
        if label == active:
            draw_button(canvas, pos - 12, 18, 150, 34, label, primary=True)
        else:
            canvas.text(pos, 28, label, COLORS["muted"], scale=2)
    if user_role:
        canvas.fill_round_rect(canvas.width - 230, 14, 190, 44, 20, COLORS["surface2"])
        canvas.fill_round_rect(canvas.width - 220, 20, 34, 34, 17, COLORS["primary"])
        canvas.text(canvas.width - 210, 30, "SA", (255, 255, 255), scale=2)
        canvas.text(canvas.width - 176, 25, "SYSTEM ADMINISTRATOR", COLORS["text"], scale=2)
        canvas.text(canvas.width - 176, 40, user_role, COLORS["red"] if user_role == "ADMINISTRATOR" else COLORS["secondary"], scale=2)
    else:
        canvas.text(canvas.width - 230, 28, "ZALOGUJ SIE", COLORS["primary"], scale=2)
        draw_button(canvas, canvas.width - 130, 18, 94, 34, "DOLACZ", primary=True)


def draw_window_panel(canvas: Canvas, x: int, y: int, w: int, h: int, title: str, subtitle: str = "") -> None:
    canvas.fill_round_rect(x, y, w, h, 24, COLORS["surface"])
    canvas.stroke_rect(x, y, w, h, COLORS["line"], 2)
    canvas.text(x + 22, y + 20, title, COLORS["text"], scale=4)
    if subtitle:
        canvas.text(x + 22, y + 52, subtitle, COLORS["muted"], scale=2)


def draw_game_card(canvas: Canvas, x: int, y: int, w: int, h: int, title: str, price: str, genre: str) -> None:
    canvas.fill_round_rect(x, y, w, h, 18, COLORS["surface"])
    canvas.stroke_rect(x, y, w, h, COLORS["line"], 2)
    canvas.fill_round_rect(x + 12, y + 12, w - 24, 130, 16, COLORS["surface3"])
    canvas.text(x + 18, y + 156, title, COLORS["text"], scale=4)
    draw_badge(canvas, x + w - 110, y + 150, price, COLORS["primary"], (255, 255, 255))
    canvas.text(x + 18, y + 200, "WYDAWCA / OPIS SKROCONY", COLORS["muted"], scale=2)
    draw_badge(canvas, x + 18, y + h - 42, genre, COLORS["surface2"], COLORS["primary"])


def draw_metric_card(canvas: Canvas, x: int, y: int, w: int, h: int, label: str, value: str, color: tuple[int, int, int]) -> None:
    canvas.fill_round_rect(x, y, w, h, 18, COLORS["surface"])
    canvas.stroke_rect(x, y, w, h, COLORS["line"], 2)
    canvas.text(x + 18, y + 16, label, COLORS["muted"], scale=2)
    canvas.text(x + 18, y + 46, value, color, scale=5)


def draw_order_row(canvas: Canvas, x: int, y: int, w: int, title: str, email: str, status: str, price: str) -> None:
    canvas.fill_round_rect(x, y, w, 72, 16, COLORS["surface"])
    canvas.stroke_rect(x, y, w, 72, COLORS["line"], 2)
    status_map = {
        "OCZEKUJE": (COLORS["amber_bg"], COLORS["amber"]),
        "WYSLANE": (COLORS["blue_bg"], COLORS["blue"]),
        "ZREALIZOWANE": (COLORS["green_bg"], COLORS["green"]),
        "ANULOWANE": (COLORS["red_bg"], COLORS["red"]),
    }
    bg, fg = status_map.get(status, (COLORS["surface2"], COLORS["muted"]))
    draw_badge(canvas, x + 12, y + 10, status, bg, fg)
    canvas.text(x + 120, y + 16, title, COLORS["text"], scale=3)
    canvas.text(x + 120, y + 40, email, COLORS["muted"], scale=2)
    canvas.text(x + w - 150, y + 24, price, COLORS["primary"], scale=4)


def render_architecture() -> bytes:
    c = Canvas(IMAGE_W, IMAGE_H, COLORS["bg"])
    c.text(40, 28, "ARCHITEKTURA WDROZENIOWA GAMEVAULT", COLORS["text"], scale=5)
    c.text(40, 68, "SCOPE: TYLKO PROJEKT /PROJEKT/", COLORS["muted"], scale=2)

    boxes = [
        (60, 150, 220, 110, "PRZEGLADARKA", "REACT SPA / ROLA / SESJA"),
        (360, 150, 220, 110, "NGINX PROJEKT", "SCIEZKA /PROJEKT/ I /API"),
        (660, 150, 220, 110, "EXPRESS API", "AUTORYZACJA / CSRF / RBAC"),
        (960, 150, 180, 110, "POSTGRES", "PRISMA I DANE"),
        (660, 350, 220, 110, "SMTP", "RESET HASLA / POWIADOMIENIA"),
        (360, 350, 220, 110, "RECAPTCHA", "WERYFIKACJA LOGINU"),
    ]
    for x, y, w, h, title, subtitle in boxes:
        c.fill_round_rect(x, y, w, h, 24, COLORS["surface"])
        c.stroke_rect(x, y, w, h, COLORS["primary"], 3)
        c.text(x + 18, y + 26, title, COLORS["primary"], scale=4)
        c.text(x + 18, y + 66, subtitle, COLORS["muted"], scale=2)

    c.line(280, 205, 360, 205, COLORS["primary"], 4)
    c.line(580, 205, 660, 205, COLORS["primary"], 4)
    c.line(880, 205, 960, 205, COLORS["primary"], 4)
    c.line(470, 260, 470, 350, COLORS["secondary"], 4)
    c.line(770, 260, 770, 350, COLORS["secondary"], 4)

    draw_badge(c, 80, 560, "HTTPS 443", COLORS["green_bg"], COLORS["green"])
    c.text(190, 567, "ZEWNETRZNY REVERSE PROXY KONCZY TLS", COLORS["text"], scale=2)
    draw_badge(c, 80, 604, "PORT 6080", COLORS["amber_bg"], COLORS["amber"])
    c.text(190, 611, "TECHNICZNY DOSTEP HTTP DO KONTEKSTU /PROJEKT/", COLORS["text"], scale=2)
    draw_badge(c, 80, 648, "BEZPIECZENSTWO", COLORS["blue_bg"], COLORS["blue"])
    c.text(220, 655, "COOKIE SECURE, X-FORWARDED-PROTO, CORS, HELMET, AUDYT", COLORS["text"], scale=2)
    return c.png_bytes()


def render_landing() -> bytes:
    c = Canvas(IMAGE_W, IMAGE_H, COLORS["bg"])
    draw_navbar(c, "STRONA GLOWNA", None)
    c.fill_round_rect(40, 120, 520, 230, 28, COLORS["surface"])
    c.text(60, 150, "YOUR ULTIMATE", COLORS["text"], scale=6)
    c.text(60, 210, "GAMING VAULT", COLORS["primary"], scale=7)
    c.text(60, 286, "STRONA GLOWNA Z CTA DO LOGOWANIA, REJESTRACJI", COLORS["muted"], scale=2)
    c.text(60, 310, "LUB PRZEJSCIA DO SKLEPU DLA ZALOGOWANYCH", COLORS["muted"], scale=2)
    draw_button(c, 60, 360, 170, 52, "GET STARTED", primary=True)
    draw_button(c, 250, 360, 150, 52, "ZALOGUJ SIE", primary=False)

    c.fill_round_rect(640, 120, 230, 260, 20, COLORS["surface3"])
    c.fill_round_rect(890, 90, 240, 280, 20, (214, 201, 255))
    c.fill_round_rect(650, 402, 270, 90, 18, COLORS["surface"])
    c.text(674, 430, "ACTIVE PLAYERS", COLORS["muted"], scale=2)
    c.text(674, 458, "2.4M+", COLORS["text"], scale=5)
    c.fill_round_rect(940, 412, 190, 100, 18, COLORS["primary"])
    c.text(960, 445, "99%", (255, 255, 255), scale=7)
    c.text(960, 490, "UPTIME", (255, 255, 255), scale=2)

    c.text(40, 560, "VAULT FAVORITES", COLORS["text"], scale=5)
    draw_game_card(c, 40, 610, 340, 120, "CYBERPUNK 2077", "$59.99", "RPG")
    draw_game_card(c, 430, 610, 340, 120, "THE WITCHER 3", "$39.99", "ADVENTURE")
    draw_game_card(c, 820, 610, 340, 120, "COUNTER STRIKE 2", "FREE", "FPS")
    return c.png_bytes()


def render_login() -> bytes:
    c = Canvas(IMAGE_W, IMAGE_H, COLORS["bg"])
    c.fill_round_rect(300, 70, 600, 620, 32, COLORS["surface"])
    c.stroke_rect(300, 70, 600, 620, COLORS["line"], 2)
    c.fill_round_rect(540, 110, 120, 120, 26, COLORS["primary"])
    c.text(565, 158, "GV", (255, 255, 255), scale=6)
    c.text(390, 270, "WITAJ PONOWNIE", COLORS["text"], scale=6)
    c.text(390, 320, "DOSTEP DO CYFROWEJ BIBLIOTEKI I PANELI ROL", COLORS["muted"], scale=2)
    c.fill_round_rect(390, 360, 420, 50, 18, COLORS["green_bg"])
    c.stroke_rect(390, 360, 420, 50, COLORS["green"], 2)
    c.text(420, 377, "SESJA ZOSTALA BEZPIECZNIE ZAKONCZONA", COLORS["green"], scale=2)
    draw_input(c, 390, 450, 420, 56, "E-MAIL", "ADRES@EMAIL.COM")
    draw_input(c, 390, 540, 420, 56, "HASLO", "********")
    draw_button(c, 390, 625, 420, 62, "ZALOGUJ SIE", primary=True)
    c.text(605, 710, "ODZYSKAJ HASLO", COLORS["primary"], scale=2)
    return c.png_bytes()


def render_password_reset() -> bytes:
    c = Canvas(IMAGE_W, IMAGE_H, COLORS["bg"])
    draw_window_panel(c, 40, 80, 510, 580, "ODZYSKAJ HASLO", "KROK 1 - WYSYLANIE KODU")
    draw_input(c, 86, 200, 420, 56, "E-MAIL", "USER@EXAMPLE.COM")
    draw_button(c, 86, 286, 420, 60, "WYSLIJ KOD JEDNORAZOWY", primary=True)
    c.text(190, 388, "POWROT DO LOGOWANIA", COLORS["primary"], scale=2)
    c.text(86, 450, "SYSTEM ZWROCI TEN SAM KOMUNIKAT", COLORS["muted"], scale=2)
    c.text(86, 474, "NIEZALEZNIE OD TEGO, CZY KONTO ISTNIEJE", COLORS["muted"], scale=2)

    draw_window_panel(c, 610, 80, 550, 580, "ODZYSKAJ HASLO", "KROK 2 - USTAWIENIE NOWEGO HASLA")
    c.fill_round_rect(656, 168, 460, 48, 16, COLORS["green_bg"])
    c.stroke_rect(656, 168, 460, 48, COLORS["green"], 2)
    c.text(676, 184, "KOD WYSLANY NA: USER@EXAMPLE.COM", COLORS["green"], scale=2)
    draw_input(c, 656, 250, 460, 56, "KOD JEDNORAZOWY", "123456")
    draw_input(c, 656, 340, 460, 56, "NOWE HASLO", "************")
    draw_input(c, 656, 430, 460, 56, "POWTORZ NOWE HASLO", "************")
    draw_button(c, 656, 522, 460, 60, "USTAW NOWE HASLO", primary=True)
    return c.png_bytes()


def render_catalog() -> bytes:
    c = Canvas(IMAGE_W, IMAGE_H, COLORS["bg"])
    draw_navbar(c, "SKLEP", "ADMINISTRATOR")
    c.text(40, 112, "CYFROWY KATALOG", COLORS["text"], scale=6)
    c.text(40, 160, "FILTROWANIE, WYSZUKIWANIE, BESTSELLERY, DODAWANIE DO BIBLIOTEKI", COLORS["muted"], scale=2)
    draw_button(c, 40, 196, 170, 40, "PELNA KOLEKCJA", primary=False)
    draw_button(c, 224, 196, 140, 40, "BESTSELLERY", primary=False)
    draw_input(c, 790, 192, 250, 44, "SZUKAJ", "CYBERPUNK")
    draw_button(c, 1060, 196, 58, 40, "+", primary=True)

    positions = [
        (40, 260, "COUNTER STRIKE 2", "FREE", "AKCJA"),
        (330, 260, "CYBERPUNK 2077", "129.99", "RPG"),
        (620, 260, "THE WITCHER 3", "59.99", "RPG"),
        (910, 260, "CIVILIZATION VII", "229.99", "STRATEGIA"),
        (40, 500, "EA SPORTS FC 25", "249.99", "SPORT"),
        (330, 500, "RESIDENT EVIL 4", "189.99", "HORROR"),
        (620, 500, "PORTAL 2", "39.99", "LOGICZNA"),
        (910, 500, "CITIES SKYLINES 2", "149.99", "SYMULACJA"),
    ]
    for x, y, title, price, genre in positions:
        draw_game_card(c, x, y, 250, 210, title, price, genre)
    return c.png_bytes()


def render_order_wizard() -> bytes:
    c = Canvas(IMAGE_W, IMAGE_H, COLORS["bg"])
    c.fill_round_rect(30, 30, 1140, 700, 28, COLORS["dark"])
    c.text(60, 56, "1 WYBIERZ GRE", (255, 255, 255), scale=2)
    c.text(300, 56, "2 TWOJE DANE", COLORS["surface3"], scale=2)
    c.text(520, 56, "3 PLATNOSC", COLORS["surface3"], scale=2)
    c.text(730, 56, "4 POTWIERDZENIE", COLORS["surface3"], scale=2)
    c.text(1100, 54, "X", COLORS["surface3"], scale=3)

    c.fill_rect(290, 86, 850, 620, COLORS["surface"])
    c.fill_round_rect(50, 100, 200, 580, 18, COLORS["dark2"])
    c.text(70, 126, "PODSUMOWANIE", COLORS["surface3"], scale=2)
    c.text(70, 174, "KOSZYK GIER", (255, 255, 255), scale=3)
    c.text(70, 210, "ELEKTRONICZNA", COLORS["surface3"], scale=2)
    c.text(70, 270, "DO ZAPLATY", COLORS["muted"], scale=2)
    c.text(70, 300, "189.98 ZL", COLORS["green"], scale=5)

    c.text(330, 120, "WYBIERZ GRE", COLORS["text"], scale=5)
    c.text(330, 152, "KREATOR ZAMOWIENIA PROWADZI UZYTKOWNIKA PRZEZ 4 ETAPY", COLORS["muted"], scale=2)
    draw_button(c, 330, 190, 250, 46, "ELEKTRONICZNA", primary=False)
    draw_button(c, 600, 190, 250, 46, "PUDELKOWA", primary=False)

    for idx, (gx, gy, title, price) in enumerate(
        [
            (330, 260, "COUNTER STRIKE 2", "DARMOWA"),
            (600, 260, "CYBERPUNK 2077", "129.99"),
            (330, 320, "THE WITCHER 3", "59.99"),
            (600, 320, "CIVILIZATION VII", "229.99"),
        ]
    ):
        c.fill_round_rect(gx, gy, 240, 48, 14, COLORS["surface2"])
        c.stroke_rect(gx, gy, 240, 48, COLORS["line"], 2)
        c.text(gx + 16, gy + 14, title, COLORS["text"], scale=2)
        c.text(gx + 16, gy + 30, price, COLORS["primary"], scale=2)

    draw_input(c, 330, 414, 760, 50, "KROK 2 - DANE", "IMIE, EMAIL, TELEFON, ADRES")
    draw_input(c, 330, 492, 760, 50, "KROK 3 - PLATNOSC", "BLIK LUB PRZELEW")
    c.fill_round_rect(330, 564, 760, 78, 18, COLORS["green_bg"])
    c.stroke_rect(330, 564, 760, 78, COLORS["green"], 2)
    c.text(470, 587, "KROK 4 - POTWIERDZENIE I WYSYLKA KLUCZA", COLORS["green"], scale=3)
    return c.png_bytes()


def render_orders_history() -> bytes:
    c = Canvas(IMAGE_W, IMAGE_H, COLORS["bg"])
    draw_navbar(c, "ZAMOWIENIA", "ADMINISTRATOR")
    c.text(40, 112, "TWOJE ZAMOWIENIA", COLORS["text"], scale=6)
    c.text(40, 158, "HISTORIA ZAKUPOW ORAZ STATUSY REALIZACJI", COLORS["muted"], scale=2)
    draw_button(c, 40, 200, 190, 52, "KUP NOWA GRE", primary=True)
    draw_order_row(c, 40, 290, 1120, "THE WITCHER 3 + CYBERPUNK 2077", "PROMOCJA 2 ROZNE GRY -10%", "OCZEKUJE", "170.98 ZL")
    draw_order_row(c, 40, 388, 1120, "CYBERPUNK 2077", "MARIUSZ WOZNIAK / WYSYLKA", "WYSLANE", "129.99 ZL")
    draw_order_row(c, 40, 486, 1120, "CYBERPUNK 2077", "CATALOG MANAGER / ZAKUP", "OCZEKUJE", "129.99 ZL")
    draw_order_row(c, 40, 584, 1120, "THE WITCHER 3", "JAN KOWALSKI / LICENCJA", "ZREALIZOWANE", "59.99 ZL")
    c.text(860, 680, "GRUPOWANIE PO GROUPID ORAZ SUMOWANIE RABATU", COLORS["muted"], scale=2)
    return c.png_bytes()


def render_reviews() -> bytes:
    c = Canvas(IMAGE_W, IMAGE_H, COLORS["bg"])
    draw_navbar(c, "RECENZJE", "ADMINISTRATOR")
    c.text(40, 112, "TWOJE RECENZJE", COLORS["text"], scale=6)
    c.text(40, 160, "DODAWANIE, EDYCJA I USUWANIE OPINII O GIERACH", COLORS["muted"], scale=2)
    c.fill_round_rect(40, 220, 420, 470, 24, COLORS["surface"])
    c.stroke_rect(40, 220, 420, 470, COLORS["line"], 2)
    c.text(70, 250, "NAPISZ RECENZJE", COLORS["text"], scale=4)
    draw_input(c, 70, 320, 360, 50, "GRA", "COUNTER STRIKE 2")
    c.text(70, 398, "OCENA", COLORS["muted"], scale=2)
    c.text(70, 424, "STAR STAR STAR STAR STAR", COLORS["primary"], scale=2)
    draw_input(c, 70, 470, 360, 150, "KOMENTARZ", "FAJNA GRA NAPRAWDE FAJNA GRA")
    draw_button(c, 70, 636, 360, 46, "OPUBLIKUJ RECENZJE", primary=True)

    c.text(520, 250, "TWOJE PUBLIKACJE", COLORS["text"], scale=4)
    for offset, title, note in [
        (0, "COUNTER STRIKE 2", "5/5 - OPUBLIKOWANO"),
        (130, "CYBERPUNK 2077", "4/5 - SWIETNY KLIMAT"),
        (260, "RESIDENT EVIL 4", "5/5 - BARDZO DOBRY REMAKE"),
    ]:
        c.fill_round_rect(520, 290 + offset, 620, 110, 18, COLORS["surface"])
        c.stroke_rect(520, 290 + offset, 620, 110, COLORS["line"], 2)
        c.text(550, 318 + offset, title, COLORS["text"], scale=4)
        c.text(550, 360 + offset, note, COLORS["muted"], scale=2)
        c.text(550, 390 + offset, "EDYTUJ / USUN", COLORS["primary"], scale=2)
    return c.png_bytes()


def render_manager_panel() -> bytes:
    c = Canvas(IMAGE_W, IMAGE_H, COLORS["bg"])
    draw_navbar(c, "DASHBOARD", "MANAGER")
    c.text(40, 112, "PANEL MANAGERA", COLORS["text"], scale=6)
    c.text(40, 156, "KATALOG GIER, ZAMOWIENIA I PROMOCJE", COLORS["muted"], scale=2)

    draw_metric_card(c, 40, 200, 250, 82, "AKTYWNE GRY", "8", COLORS["primary"])
    draw_metric_card(c, 320, 200, 250, 82, "ZAMOWIENIA", "10", COLORS["secondary"])
    draw_metric_card(c, 600, 200, 250, 82, "OCZEKUJACE", "3", COLORS["amber"])

    panels = [
        (40, 320, 350, 360, "KATALOG GIER"),
        (420, 320, 350, 360, "ZAMOWIENIA"),
        (800, 320, 350, 360, "PROMOCJE"),
    ]
    for x, y, w, h, title in panels:
        c.fill_round_rect(x, y, w, h, 20, COLORS["surface"])
        c.stroke_rect(x, y, w, h, COLORS["line"], 2)
        c.text(x + 18, y + 22, title, COLORS["text"], scale=4)

    draw_input(c, 64, 400, 300, 44, "NOWA GRA", "CYBERPUNK 2077 / CD PROJEKT")
    c.text(64, 470, "EDYCJA, ZMIANA STANU I AKTYWNOSCI", COLORS["muted"], scale=2)
    draw_button(c, 64, 516, 300, 44, "DODAJ GRE", primary=True)

    draw_order_row(c, 444, 392, 302, "THE WITCHER 3", "SYSTEM ADMINISTRATOR", "OCZEKUJE", "53.99 ZL")
    draw_order_row(c, 444, 476, 302, "CYBERPUNK 2077", "MARIUSZ WOZNIAK", "WYSLANE", "129.99 ZL")
    c.text(444, 584, "MANAGER MOZE ZMIENIC STATUS I PODEJRZEC SZCZEGOLY", COLORS["muted"], scale=2)

    draw_input(c, 824, 400, 300, 44, "NAZWA PROMOCJI", "KUP 2 ROZNE GRY -10%")
    draw_input(c, 824, 476, 140, 44, "MIN GIER", "2")
    draw_input(c, 984, 476, 140, 44, "ZNIZKA", "10")
    draw_button(c, 824, 548, 300, 44, "ZAPISZ PROMOCJE", primary=True)
    return c.png_bytes()


def render_admin_panel() -> bytes:
    c = Canvas(IMAGE_W, IMAGE_H, COLORS["bg"])
    draw_navbar(c, "DASHBOARD", "ADMINISTRATOR")
    c.text(40, 112, "PANEL ADMINISTRATORA", COLORS["text"], scale=6)
    c.text(40, 156, "UZYTKOWNICY, SMTP, KATALOG I AUDYT", COLORS["muted"], scale=2)

    draw_metric_card(c, 40, 198, 230, 80, "UZYTKOWNICY", "5", COLORS["primary"])
    draw_metric_card(c, 300, 198, 230, 80, "ADMINI", "1", COLORS["red"])
    draw_metric_card(c, 560, 198, 230, 80, "MANAGERZY", "1", COLORS["secondary"])
    draw_metric_card(c, 820, 198, 230, 80, "GRY", "8", COLORS["accent"])

    areas = [
        (40, 320, 340, 370, "UZYTKOWNICY"),
        (420, 320, 340, 370, "GRY"),
        (800, 320, 340, 370, "AUDIT LOG"),
    ]
    for x, y, w, h, title in areas:
        c.fill_round_rect(x, y, w, h, 20, COLORS["surface"])
        c.stroke_rect(x, y, w, h, COLORS["line"], 2)
        c.text(x + 18, y + 20, title, COLORS["text"], scale=4)

    draw_input(c, 64, 386, 292, 42, "UTWORZ KONTO", "JAN KOWALSKI / USER")
    draw_input(c, 64, 456, 292, 42, "ZMIEN ROLE", "MANAGER -> USER")
    draw_input(c, 64, 526, 292, 42, "SMTP", "SMTP.GMAIL.COM / 587")
    draw_button(c, 64, 592, 292, 42, "ZAPISZ SMTP", primary=True)

    c.text(444, 388, "PELNY KATALOG WIDOCZNY TYLKO DLA ADMINA", COLORS["muted"], scale=2)
    for idx, game in enumerate(["CITIES SKYLINES 2", "CIVILIZATION VII", "COUNTER STRIKE 2", "CYBERPUNK 2077"]):
        c.text(444, 430 + idx * 44, game, COLORS["text"], scale=3)
        draw_badge(c, 664, 428 + idx * 44, "AKTYWNA", COLORS["green_bg"], COLORS["green"])

    logs = [
        ("REVIEW_CREATED", COLORS["green_bg"], COLORS["green"]),
        ("AUTH_CSRF_ISSUED", COLORS["green_bg"], COLORS["green"]),
        ("ORDER_CREATED", COLORS["green_bg"], COLORS["green"]),
        ("AUTH_LOGIN_FAILURE", COLORS["red_bg"], COLORS["red"]),
    ]
    for idx, (label, bg, fg) in enumerate(logs):
        c.fill_round_rect(824, 386 + idx * 66, 292, 48, 12, bg)
        c.stroke_rect(824, 386 + idx * 66, 292, 48, fg, 2)
        c.text(842, 402 + idx * 66, label, fg, scale=2)
    return c.png_bytes()


@dataclass
class ImageAsset:
    filename: str
    title: str
    width_px: int
    height_px: int
    data: bytes


def get_png_size(data: bytes) -> tuple[int, int]:
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("Unsupported image format; expected PNG")
    return struct.unpack(">II", data[16:24])


def extract_images_from_docx(path: Path) -> list[ImageAsset]:
    if not path.exists():
        raise FileNotFoundError(f"Brakuje pliku ze screenami: {path}")

    namespaces = {
        "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    }

    import xml.etree.ElementTree as ET

    with zipfile.ZipFile(path) as archive:
        rels_root = ET.fromstring(archive.read("word/_rels/document.xml.rels"))
        relation_map = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels_root}
        document_root = ET.fromstring(archive.read("word/document.xml"))
        ordered_rids = []
        for blip in document_root.findall(".//a:blip", namespaces):
            rid = blip.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed")
            if rid:
                ordered_rids.append(rid)

        captions = [
            "Zrzut 1. Ekran logowania",
            "Zrzut 2. Odzyskiwanie hasła - wysłanie kodu",
            "Zrzut 3. Odzyskiwanie hasła - ustawienie nowego hasła",
            "Zrzut 4. Strona główna GameVault",
            "Zrzut 5. Katalog gier",
            "Zrzut 6. Kreator zamówienia - wybór gry",
            "Zrzut 7. Kreator zamówienia - dane klienta",
            "Zrzut 8. Kreator zamówienia - wybór metody płatności",
            "Zrzut 9. Kreator zamówienia - płatność BLIK",
            "Zrzut 10. Kreator zamówienia - potwierdzenie zakupu",
            "Zrzut 11. Dodatkowy ekran operacyjny użytkownika",
            "Zrzut 12. Historia zamówień",
            "Zrzut 13. Ekran recenzji",
            "Zrzut 14. Walidacja formularza recenzji",
            "Zrzut 15. Panel managera - katalog gier",
            "Zrzut 16. Panel managera - zamówienia",
            "Zrzut 17. Panel managera - promocje",
            "Zrzut 18. Panel administratora - użytkownicy i SMTP",
            "Zrzut 19. Panel administratora - katalog gier",
            "Zrzut 20. Panel administratora - audit log",
            "Zrzut 21. Dashboard administratora",
        ]

        images: list[ImageAsset] = []
        for index, rid in enumerate(ordered_rids, start=1):
            target = relation_map[rid]
            data = archive.read(f"word/{target}")
            width_px, height_px = get_png_size(data)
            images.append(
                ImageAsset(
                    filename=f"dok1_{index:02d}.png",
                    title=captions[index - 1] if index <= len(captions) else f"Zrzut {index}",
                    width_px=width_px,
                    height_px=height_px,
                    data=data,
                )
            )
        return images


def build_images() -> list[ImageAsset]:
    images = [
        ImageAsset("architektura.png", "Rysunek 1. Architektura wdrożeniowa", IMAGE_W, IMAGE_H, render_architecture()),
    ]
    images.extend(extract_images_from_docx(SCREENSHOT_DOCX))
    return images


def escape(text: str) -> str:
    return saxutils.escape(text)


def paragraph(text: str, style: str | None = None, align: str | None = None, bold: bool = False, spacing_after: int | None = None) -> str:
    ppr = []
    if style:
        ppr.append(f'<w:pStyle w:val="{style}"/>')
    if align:
        ppr.append(f'<w:jc w:val="{align}"/>')
    if spacing_after is not None:
        ppr.append(f'<w:spacing w:after="{spacing_after}"/>')
    ppr_xml = f"<w:pPr>{''.join(ppr)}</w:pPr>" if ppr else ""
    rpr = "<w:rPr><w:b/></w:rPr>" if bold else ""
    runs = []
    for line in text.split("\n"):
        if runs:
            runs.append("<w:r><w:br/></w:r>")
        runs.append(f'<w:r>{rpr}<w:t xml:space="preserve">{escape(line)}</w:t></w:r>')
    return f"<w:p>{ppr_xml}{''.join(runs)}</w:p>"


def page_break() -> str:
    return "<w:p><w:r><w:br w:type=\"page\"/></w:r></w:p>"


def note_box(title: str, body: str, fill: str = "E8F7EF", border: str = "19AD78", title_color: str = "0F6F4D") -> str:
    return table(
        ["Aspekt", "Opis"],
        [[title, body]],
        widths=[1800, 7600],
        header_fill=fill,
        header_text_color=title_color,
        row_fills=[fill],
        border_color=border,
    )


def cell_paragraph(text: str, bold: bool = False, color: str | None = None, align: str | None = None) -> str:
    ppr = []
    if align:
        ppr.append(f'<w:jc w:val="{align}"/>')
    ppr_xml = f"<w:pPr>{''.join(ppr)}</w:pPr>" if ppr else ""
    rpr_bits = []
    if bold:
        rpr_bits.append("<w:b/>")
    if color:
        rpr_bits.append(f'<w:color w:val="{color}"/>')
    rpr = f"<w:rPr>{''.join(rpr_bits)}</w:rPr>" if rpr_bits else ""
    runs = []
    for line in text.split("\n"):
        if runs:
            runs.append("<w:r><w:br/></w:r>")
        runs.append(f'<w:r>{rpr}<w:t xml:space="preserve">{escape(line)}</w:t></w:r>')
    return f"<w:p>{ppr_xml}{''.join(runs)}</w:p>"


def table(
    headers: list[str],
    rows: list[list[str]],
    widths: list[int],
    header_fill: str = "4E46E5",
    header_text_color: str = "FFFFFF",
    row_fills: list[str] | None = None,
    border_color: str = "D6DCE6",
) -> str:
    if len(headers) != len(widths):
        raise ValueError("headers and widths length mismatch")
    grid = "".join(f'<w:gridCol w:w="{width}"/>' for width in widths)
    tbl_pr = (
        "<w:tblPr>"
        '<w:tblStyle w:val="TableGrid"/>'
        '<w:tblW w:w="0" w:type="auto"/>'
        '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>'
        "<w:tblBorders>"
        f'<w:top w:val="single" w:sz="8" w:space="0" w:color="{border_color}"/>'
        f'<w:left w:val="single" w:sz="8" w:space="0" w:color="{border_color}"/>'
        f'<w:bottom w:val="single" w:sz="8" w:space="0" w:color="{border_color}"/>'
        f'<w:right w:val="single" w:sz="8" w:space="0" w:color="{border_color}"/>'
        f'<w:insideH w:val="single" w:sz="6" w:space="0" w:color="{border_color}"/>'
        f'<w:insideV w:val="single" w:sz="6" w:space="0" w:color="{border_color}"/>'
        "</w:tblBorders>"
        '<w:tblCellMar><w:top w:w="110" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="110" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar>'
        "</w:tblPr>"
    )

    def make_cell(text: str, width: int, fill: str | None = None, bold: bool = False, color: str | None = None) -> str:
        tc_pr = [f'<w:tcW w:w="{width}" w:type="dxa"/>', '<w:vAlign w:val="top"/>']
        if fill:
            tc_pr.append(f'<w:shd w:val="clear" w:color="auto" w:fill="{fill}"/>')
        return f"<w:tc><w:tcPr>{''.join(tc_pr)}</w:tcPr>{cell_paragraph(text, bold=bold, color=color)}</w:tc>"

    header_cells = "".join(
        make_cell(text, width, fill=header_fill, bold=True, color=header_text_color)
        for text, width in zip(headers, widths)
    )
    trs = [f"<w:tr>{header_cells}</w:tr>"]

    for row_index, row in enumerate(rows):
        fill = row_fills[row_index] if row_fills and row_index < len(row_fills) else ("F7F9FD" if row_index % 2 == 0 else "FFFFFF")
        row_cells = "".join(make_cell(text, width, fill=fill) for text, width in zip(row, widths))
        trs.append(f"<w:tr>{row_cells}</w:tr>")

    return f"<w:tbl>{tbl_pr}<w:tblGrid>{grid}</w:tblGrid>{''.join(trs)}</w:tbl>"


def image_paragraph(rid: str, name: str, width_px: int, height_px: int, drawing_id: int) -> str:
    max_width_px = 1000
    px = min(width_px, max_width_px)
    scale = px / width_px
    py = int(height_px * scale)
    cx = int(px * 9525)
    cy = int(py * 9525)
    return (
        "<w:p>"
        "<w:pPr><w:jc w:val=\"center\"/><w:spacing w:after=\"120\"/></w:pPr>"
        "<w:r><w:drawing>"
        "<wp:inline distT=\"0\" distB=\"0\" distL=\"0\" distR=\"0\" "
        "xmlns:wp=\"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing\" "
        "xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" "
        "xmlns:pic=\"http://schemas.openxmlformats.org/drawingml/2006/picture\">"
        f"<wp:extent cx=\"{cx}\" cy=\"{cy}\"/>"
        f"<wp:docPr id=\"{drawing_id}\" name=\"{escape(name)}\"/>"
        "<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect=\"1\"/></wp:cNvGraphicFramePr>"
        "<a:graphic><a:graphicData uri=\"http://schemas.openxmlformats.org/drawingml/2006/picture\">"
        "<pic:pic>"
        f"<pic:nvPicPr><pic:cNvPr id=\"0\" name=\"{escape(name)}\"/><pic:cNvPicPr/></pic:nvPicPr>"
        f"<pic:blipFill><a:blip r:embed=\"{rid}\"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>"
        f"<pic:spPr><a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\"{cx}\" cy=\"{cy}\"/></a:xfrm>"
        "<a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom></pic:spPr>"
        "</pic:pic></a:graphicData></a:graphic>"
        "</wp:inline></w:drawing></w:r></w:p>"
    )


def build_document_xml(images: list[ImageAsset], packages: dict[str, dict]) -> str:
    image_rids = {image.filename: f"rIdImage{index + 1}" for index, image in enumerate(images)}
    image_map = {image.filename: image for image in images}

    def fig(filename: str, name: str, drawing_id: int) -> str:
        image = image_map[filename]
        return image_paragraph(image_rids[filename], name, image.width_px, image.height_px, drawing_id)

    client_deps = packages["client"]["dependencies"]
    server_deps = packages["server"]["dependencies"]
    root_dev_deps = packages["root"].get("devDependencies", {})

    blocks: list[str] = []
    blocks.append(paragraph("Dokumentacja systemu GameVault", style="Tytu", align="center"))
    blocks.append(paragraph("Zakres: wyłącznie aplikacja wdrożona pod /Projekt/\nWersja dokumentu: 2026-04-12\nTyp: dokumentacja użytkowa, administracyjna i techniczna", style="Podtytu", align="center", spacing_after=320))
    blocks.append(paragraph("Dokument obejmuje widok użytkownika końcowego, managera i administratora, opis stacku technologicznego, wszystkie kluczowe biblioteki oraz mechanizmy bezpieczeństwa wdrożone w aplikacji GameVault.", align="center"))
    blocks.append(page_break())

    blocks.append(paragraph("1. Cel i zakres dokumentu", style="Nagwek1"))
    blocks.append(paragraph("GameVault jest sklepem z grami cyfrowymi uruchomionym w kontekście /Projekt/. Dokumentacja łączy dwa poziomy opisu: biznesowy i techniczny. Po stronie biznesowej pokazuje krok po kroku, jak użytkownik, manager i administrator korzystają z systemu. Po stronie technicznej wyjaśnia, jakie biblioteki i konfiguracje tworzą aplikację oraz jak konkretne mechanizmy chronią ją przed nadużyciami."))
    blocks.append(note_box("Założenie dokumentu", "Każdy opis funkcji jest powiązany z ochroną bezpieczeństwa. Dokument nie ogranicza się do listy ekranów, ale pokazuje również, dlaczego dany komponent został wdrożony i w jaki sposób wzmacnia odporność systemu."))

    blocks.append(paragraph("2. Role i zakres uprawnień", style="Nagwek1"))
    blocks.append(paragraph("W systemie istnieją trzy role: USER, MANAGER oraz ADMIN. Uprawnienia nie są definiowane wyłącznie przez frontend. Ostateczne ograniczenia są wymuszane po stronie API przez middleware autoryzacji i przez zakresy zapytań do bazy danych."))
    blocks.append(
        table(
            ["Rola", "Dostępne obszary", "Dozwolone operacje", "Najważniejsze ograniczenia bezpieczeństwa"],
            [
                ["USER", "Dashboard użytkownika, sklep, zamówienia, recenzje, zmiana hasła", "Kupno gier, publikacja własnych recenzji, podgląd własnych zamówień, reset i zmiana hasła", "Widoczność ograniczona do aktywnych gier oraz własnych danych. Brak dostępu do paneli operacyjnych i administracyjnych."],
                ["MANAGER", "Wszystko co USER oraz panel managera", "Dodawanie i edycja gier, aktywacja i dezaktywacja tytułów, obsługa zamówień, zmiana statusów, zarządzanie promocjami", "Brak dostępu do zarządzania użytkownikami, ról, SMTP i pełnego audit logu."],
                ["ADMIN", "Wszystko co MANAGER oraz panel administratora", "Tworzenie kont, zmiana ról, konfiguracja SMTP, test SMTP, podgląd audit logu, pełny wgląd w katalog i statystyki", "Self-demotion guard blokuje odebranie sobie roli ADMIN. Wszystkie operacje są audytowane."],
            ],
            widths=[1200, 2500, 2800, 3100],
            header_fill="4E46E5",
        )
    )

    blocks.append(paragraph("3. Architektura i wdrożenie", style="Nagwek1"))
    blocks.append(paragraph("Aplikacja składa się z frontendu SPA w React, reverse proxy Nginx, backendu REST API w Express oraz bazy PostgreSQL obsługiwanej przez Prisma. Dodatkowe usługi wspierające bezpieczeństwo i operacyjność to reCAPTCHA Enterprise oraz SMTP do wiadomości systemowych."))
    blocks.append(fig("architektura.png", "architektura", 1))
    blocks.append(
        table(
            ["Warstwa", "Technologia", "Zadanie", "Znaczenie dla bezpieczeństwa"],
            [
                ["Interfejs", "React + Vite + TypeScript", "Renderuje SPA, formularze i routing pod /Projekt/", "Waliduje dane wejściowe po stronie klienta, ale nie jest jedyną linią obrony."],
                ["Proxy", "Nginx", "Serwuje frontend i przekazuje /Projekt/api/ do backendu", "Zamyka nieobsługiwane ścieżki, przekazuje X-Forwarded-Proto i chroni poprawność cookies Secure."],
                ["API", "Express", "Obsługuje logowanie, katalog, zamówienia, recenzje, admina", "Egzekwuje sesję, CSRF, role, CORS, nagłówki bezpieczeństwa, rate limiting i audit log."],
                ["Dane", "PostgreSQL + Prisma", "Przechowuje konta, sesje, reset haseł, gry, zamówienia i logi", "Zapewnia trwałość, relacje i ograniczenia integralności, w tym unikalne recenzje użytkownik-gra."],
                ["Usługi zewnętrzne", "reCAPTCHA Enterprise i SMTP", "Chronią logowanie i wysyłają wiadomości systemowe", "Ograniczają automatyczne ataki i wspierają bezpieczne odzyskiwanie dostępu."],
            ],
            widths=[1500, 2200, 2600, 3300],
            header_fill="3A7BE6",
        )
    )
    blocks.append(paragraph("Publiczny adres pracy użytkownika to https://31.97.72.66/Projekt/. Wewnętrzny Nginx projektu nasłuchuje na porcie 6000, a mapowanie 6080:6000 stanowi techniczny dostęp HTTP do kontenera. Kluczowe znaczenie ma nagłówek X-Forwarded-Proto, ponieważ backend na jego podstawie rozpoznaje ruch HTTPS i nadaje flagę Secure dla cookies."))

    blocks.append(paragraph("4. Stack technologiczny", style="Nagwek1"))
    blocks.append(paragraph(f"Frontend korzysta z React {client_deps['react']}, React DOM {client_deps['react-dom']}, TypeScript {packages['client']['devDependencies']['typescript']} i Vite {packages['client']['devDependencies']['vite']}. Backend wykorzystuje Express {server_deps['express']}, Prisma Client {server_deps['@prisma/client']} oraz PostgreSQL. Całość uruchamiana jest lokalnie przez concurrently {root_dev_deps['concurrently']} i wdrażana kontenerowo przez Docker Compose."))
    blocks.append(
        table(
            ["Obszar", "Technologie", "Dlaczego te technologie", "Korzyść bezpieczeństwa"],
            [
                ["Frontend", "React, TypeScript, Vite", "Szybkie SPA, silne typowanie, prosty build pod /Projekt/", "Mniej błędów typów, łatwiejsze utrzymanie i przewidywalny przepływ danych."],
                ["Routing i stan", "React Router, React Query", "Kontrola tras, cache serwerowy, invalidacja danych", "Spójna obsługa sesji i kontrola dostępu bez ręcznego mnożenia logiki."],
                ["Formularze i walidacja", "React Hook Form, Zod", "Wydajne formularze i wspólne zasady walidacji", "Wczesne odrzucanie błędnych danych i spójne reguły bezpieczeństwa."],
                ["API", "Express", "Czytelna warstwa middleware i REST API", "Łatwe łączenie autoryzacji, CSRF, CORS, Helmet i obsługi błędów."],
                ["Baza danych", "PostgreSQL, Prisma", "Relacyjny model danych i bezpieczny ORM", "Mniejsze ryzyko błędów zapytań i silniejsze ograniczenia integralności."],
                ["Operacyjność", "Nginx, Docker Compose, Nodemailer, Pino", "Serwowanie SPA, izolacja usług, poczta i logowanie", "Czytelne wdrożenie, rozdzielenie ról komponentów i audyt techniczny."],
            ],
            widths=[1400, 2300, 2900, 3000],
            header_fill="6D4CE6",
        )
    )

    blocks.append(paragraph("5. Wszystkie biblioteki i ich znaczenie", style="Nagwek1"))
    blocks.append(paragraph("Poniższe tabele podsumowują użyte biblioteki oraz uzasadniają, dlaczego zostały wybrane w tym projekcie. Szczególny nacisk położono na biblioteki wpływające na bezpieczeństwo, integralność danych i jakość obsługi sesji."))
    blocks.append(
        table(
            ["Biblioteka frontend", "Co robi", "Dlaczego została użyta", "Wpływ na bezpieczeństwo"],
            [
                [f"react {client_deps['react']}", "Buduje interfejs SPA i komponenty", "To główna baza interfejsu systemu", "Umożliwia kontrolowany przepływ danych i czytelne wydzielanie ekranów."],
                [f"react-dom {client_deps['react-dom']}", "Renderuje komponenty React do DOM", "Niezbędny element stosu React", "Pozwala utrzymać spójny rendering UI bez ręcznej manipulacji DOM."],
                [f"react-router-dom {client_deps['react-router-dom']}", "Obsługuje routing i nawigację", "Potrzebny do pracy pod /Projekt/ i do podziału ekranów", "Wspiera przekierowania po 401 i ogranicza dostęp do tras po roli."],
                [f"@tanstack/react-query {client_deps['@tanstack/react-query']}", "Cache danych serwerowych i mutacje", "Porządkuje komunikację z API", "Zmniejsza ryzyko niespójnych stanów po logowaniu, wylogowaniu i zmianach danych."],
                [f"react-hook-form {client_deps['react-hook-form']}", "Obsługuje formularze i ich stan", "Jest wydajny i prosty do łączenia z walidacją", "Ogranicza błędy formularzy i wspiera kontrolę poprawności danych."],
                [f"@hookform/resolvers {client_deps['@hookform/resolvers']}", "Łączy React Hook Form z Zod", "Pozwala używać jednego schematu walidacji", "Walidacja jest spójna i bardziej przewidywalna."],
                [f"zod {client_deps['zod']}", "Definiuje schematy walidacyjne", "Jasno opisuje reguły wejścia", "Wymusza poprawne e-maile, silne hasła i ograniczenia treści."],
                ["Tailwind forms", "Stylizuje pola formularzy", "Ułatwia utrzymanie spójnego interfejsu", "Zmniejsza ryzyko nieczytelnych stanów formularzy i błędów UX."],
                ["Tailwind container-queries", "Buduje komponenty zależne od kontenera", "Usprawnia responsywność", "Pomaga unikać ukrywania istotnych kontrolek na małych ekranach."],
            ],
            widths=[2300, 2200, 2600, 2700],
            header_fill="4E46E5",
        )
    )
    blocks.append(
        table(
            ["Biblioteka backend", "Co robi", "Dlaczego została użyta", "Wpływ na bezpieczeństwo"],
            [
                [f"express {server_deps['express']}", "Tworzy REST API i middleware", "Pozwala budować czytelne API warstwowe", "Ułatwia centralne egzekwowanie polityk bezpieczeństwa."],
                [f"@prisma/client {server_deps['@prisma/client']}", "ORM do bazy PostgreSQL", "Zapewnia model typowany i relacje", "Ogranicza ryzyko błędów zapytań i wzmacnia integralność danych."],
                [f"argon2 {server_deps['argon2']}", "Haszuje i weryfikuje hasła", "Jest nowoczesnym algorytmem odpornym na cracking", "Chroni hasła przy ewentualnym wycieku bazy."],
                [f"cookie-parser {server_deps['cookie-parser']}", "Obsługuje cookies i signed cookies", "Wymagany do sesji i CSRF", "Pozwala wykrywać manipulację podpisanym tokenem CSRF."],
                [f"cors {server_deps['cors']}", "Kontroluje originy przeglądarki", "Potrzebny do pracy z credentials", "Blokuje nieautoryzowane źródła wykonujące żądania do API."],
                [f"helmet {server_deps['helmet']}", "Ustawia nagłówki bezpieczeństwa", "Szybki standard ochrony HTTP", "Chroni przed clickjackingiem, sniffingiem i częścią skutków XSS."],
                [f"express-rate-limit {server_deps['express-rate-limit']}", "Ogranicza liczbę prób", "Chroni punkty wrażliwe", "Hamuje brute force i flood na logowaniu, rejestracji i resecie hasła."],
                [f"nodemailer {server_deps['nodemailer']}", "Wysyła e-maile systemowe", "Reset hasła i potwierdzenia zakupów wymagają poczty", "Pozwala kontrolować komunikację systemową z jednego miejsca."],
                [f"pino {server_deps['pino']}", "Logowanie strukturalne", "Wydajny logger do produkcji", "Maskuje hasła, cookies i nagłówki wrażliwe."],
                [f"@google-cloud/recaptcha-enterprise {server_deps['@google-cloud/recaptcha-enterprise']}", "Weryfikuje tokeny reCAPTCHA", "Chroni logowanie przed automatyzacją", "Odrzuca logowania o niskim score lub złej akcji."],
            ],
            widths=[2400, 2200, 2400, 2400],
            header_fill="3A7BE6",
        )
    )

    blocks.append(paragraph("6. Konfiguracja i komponenty wdrożeniowe", style="Nagwek1"))
    blocks.append(paragraph("Docker Compose definiuje usługi postgres, backend i nginx. Backend działa z TRUST_PROXY=true, COOKIE_SECURE=true i whitelistą CLIENT_ORIGINS. Klient budowany jest z VITE_BASE_PATH=/Projekt/. Nginx przekierowuje /Projekt/api/ na backend oraz wystawia statyczny build klienta."))
    blocks.append(
        table(
            ["Komponent", "Konfiguracja", "Co robi", "Dlaczego jest bezpieczne"],
            [
                ["Nginx projektu", "listen 6000, alias /usr/share/nginx/html, proxy_pass /Projekt/api/", "Serwuje SPA i pośredniczy do API", "Zamyka nieobsługiwane ścieżki 403, przekazuje poprawny protokół i IP do backendu."],
                ["Backend Express", "PORT=4000, TRUST_PROXY=true, COOKIE_SECURE=true", "Obsługuje logikę biznesową i bezpieczeństwo", "Rozpoznaje HTTPS po proxy i nadaje Secure cookies tylko gdy trzeba."],
                ["CORS", "CLIENT_ORIGINS z whitelistą", "Pozwala tylko wskazanym frontendom korzystać z API", "Blokuje obce originy przy pracy z credentials i cookies."],
                ["SMTP", "z bazy lub ze zmiennych środowiskowych", "Wysyła reset hasła i potwierdzenia", "Konfiguracja jest centralna, testowalna i audytowana."],
                ["reCAPTCHA", "włączane hostowo przez RECAPTCHA_ENFORCE_HOST", "Chroni logowanie przed botami", "Nie obciąża każdego hosta, a tam gdzie trzeba blokuje automatyzację."],
            ],
            widths=[1800, 2400, 2300, 3100],
            header_fill="6D4CE6",
        )
    )

    blocks.append(paragraph("7. Model danych", style="Nagwek1"))
    blocks.append(paragraph("Model danych obejmuje użytkowników, sesje, kody resetu hasła, gry, zamówienia, promocje, recenzje, FAQ, ustawienia systemowe i audit log. Kluczowe ograniczenia bezpieczeństwa są zapisane na poziomie bazy, a nie jedynie w interfejsie."))
    blocks.append(
        table(
            ["Model", "Zawartość", "Istotne zabezpieczenie lub reguła"],
            [
                ["User", "Konto, e-mail, rola, hash hasła", "Unikalny e-mail i role ADMIN, MANAGER, USER."],
                ["Session", "Hash tokenu, wygasanie, IP, user-agent", "Surowy token nie jest przechowywany w bazie."],
                ["PasswordResetCode", "Hash kodu resetu, wygasanie, usedAt", "Kod 6-cyfrowy wygasa po 10 minutach i może być użyty tylko raz."],
                ["Game", "Tytuł, opis, cena, gatunek, stan, aktywność", "Stan i aktywność są walidowane przed zamówieniem."],
                ["Order", "Pozycja zakupu, cena, rabat, groupId, status", "Statusy są ograniczone i część z nich staje się niemodyfikowalna."],
                ["Promotion", "Nazwa, minimalna liczba gier, zniżka, aktywność", "Promocje wpływają na wycenę koszyka tylko gdy są aktywne."],
                ["Review", "Ocena i komentarz użytkownika do gry", "Unikalność [userId, gameId] blokuje wielokrotne recenzje tej samej gry."],
                ["AuditLog", "Akcja, wynik, aktor, requestId, szczegóły", "Wrażliwe pola są czyszczone przed zapisem."],
            ],
            widths=[1700, 3200, 4700],
            header_fill="4E46E5",
        )
    )

    blocks.append(paragraph("8. Zabezpieczenia aplikacji", style="Nagwek1"))
    blocks.append(paragraph("System zabezpieczono warstwowo. Ochrona obejmuje sesję, CSRF, kontrolę ról, reCAPTCHA, walidację, ograniczenie prób, nagłówki HTTP, audit log i integralność transakcji. Dzięki temu przełamanie jednej warstwy nie daje od razu pełnej kontroli nad aplikacją."))
    blocks.append(note_box("Wniosek bezpieczeństwa", "Najważniejsza decyzja projektowa polega na tym, że frontend nie jest jedyną linią obrony. Nawet jeśli napastnik ręcznie wywoła endpoint lub ominie ukryte przyciski w UI, backend nadal egzekwuje sesję, rolę, CSRF, walidację i zakres danych."))
    blocks.append(paragraph("8.1. Mechanizmy ochronne", style="Nagwek2"))
    blocks.append(
        table(
            ["Mechanizm", "Implementacja w projekcie", "Przed czym chroni"],
            [
                ["Sesja w cookie", "sid z HttpOnly, SameSite=Strict i Secure zależnym od HTTPS", "Przed kradzieżą tokenu przez skrypt i przed prostym użyciem w cross-site requestach."],
                ["CSRF double submit", "signed cookie csrf_token + nagłówek X-CSRF-Token", "Przed wymuszeniem mutacji przez obcą stronę."],
                ["Argon2id", "Hashowanie haseł z memoryCost 19456 i timeCost 3", "Przed szybkim łamaniem haseł po wycieku bazy."],
                ["Rate limiting", "Limity na login, rejestrację i reset hasła", "Przed brute force i nadużyciami automatycznymi."],
                ["reCAPTCHA Enterprise", "Weryfikacja tokenu i score dla logowania", "Przed botami i próbami zautomatyzowanego uwierzytelniania."],
                ["RBAC", "requireRole i zakresy zapytań do bazy", "Przed broken access control i eskalacją poziomą."],
                ["Helmet", "CSP dla API, no-sniff, frameguard, referrer policy", "Przed clickjackingiem, sniffingiem i częścią skutków XSS."],
                ["CORS whitelist", "Lista CLIENT_ORIGINS i credentials", "Przed wywołaniami API z nieautoryzowanych frontendów."],
                ["Audit log", "writeAuditLog z sanitacją szczegółów", "Przed brakiem śladu po incydentach i zmianach krytycznych."],
                ["Transakcje zamówień", "Prisma transaction przy zapisie orderów i stock", "Przed niespójnością magazynu i częściowym zapisem koszyka."],
            ],
            widths=[1800, 4300, 3400],
            header_fill="19AD78",
        )
    )

    blocks.append(paragraph("8.2. Tabela zagrożeń i sposobów obrony", style="Nagwek2"))
    blocks.append(
        table(
            ["Zagrożenie", "Możliwy skutek", "Jak aplikacja broni się przed zagrożeniem"],
            [
                ["Kradzież sesji z localStorage", "Przejęcie konta przez złośliwy skrypt", "Projekt nie używa localStorage ani sessionStorage do auth. Sesja jest wyłącznie w HttpOnly cookie."],
                ["CSRF na zamówieniach i zmianach danych", "Zakupy lub zmiany wywołane bez wiedzy użytkownika", "Mutacje wymagają zgodności signed cookie i nagłówka X-CSRF-Token."],
                ["Brute force logowania", "Próby odgadnięcia hasła", "Rate limiting i opcjonalna reCAPTCHA Enterprise dla hosta produkcyjnego."],
                ["Broken Access Control", "Podgląd cudzych danych lub funkcji administracyjnych", "Backend filtruje dane po roli i blokuje endpointy przez requireRole."],
                ["Enumeracja kont w resecie hasła", "Poznanie, które e-maile istnieją w systemie", "Odpowiedź na żądanie resetu jest taka sama niezależnie od istnienia konta."],
                ["Modyfikacja zakończonych zamówień", "Fałszowanie procesu realizacji", "API odrzuca zmiany statusu dla zamówień COMPLETED i CANCELLED."],
                ["Wycieki sekretów do logów", "Ujawnienie haseł, cookies i tokenów", "Pino maskuje pola wrażliwe, a audit log usuwa podejrzane klucze."],
                ["Atak na starszą sesję po zmianie hasła", "Napastnik utrzymuje dostęp mimo resetu", "Po zmianie lub resecie hasła usuwane są wszystkie sesje użytkownika."],
                ["Nieautoryzowany origin frontendowy", "Zewnętrzny frontend wykonuje żądania z credentials", "CORS dopuszcza wyłącznie whitelistę skonfigurowanych originów."],
            ],
            widths=[2300, 2300, 4900],
            header_fill="DB414E",
        )
    )

    blocks.append(paragraph("9. Instrukcja użytkownika końcowego", style="Nagwek1"))
    blocks.append(paragraph("9.1. Strona główna", style="Nagwek2"))
    blocks.append(paragraph("Strona główna pełni rolę publicznego wejścia do systemu. Pokazuje wyróżnione gry, recenzje społeczności i FAQ. Użytkownik niezalogowany widzi przyciski logowania i rejestracji, a użytkownik zalogowany skróty do sklepu i zamówień."))
    blocks.append(fig("dok1_04.png", "landing", 2))

    blocks.append(paragraph("9.2. Logowanie", style="Nagwek2"))
    blocks.append(paragraph("Ekran logowania jest wspólny dla wszystkich ról. Po wpisaniu e-maila i hasła formularz pobiera token CSRF, a dla hosta produkcyjnego dodatkowo może użyć reCAPTCHA. Po zalogowaniu frontend zapisuje użytkownika do cache React Query i przechodzi do dashboardu właściwej roli."))
    blocks.append(fig("dok1_01.png", "login", 3))

    blocks.append(paragraph("9.3. Odzyskiwanie hasła", style="Nagwek2"))
    blocks.append(paragraph("Proces odzyskiwania hasła jest dwuetapowy. Najpierw użytkownik podaje e-mail, a potem wpisuje kod jednorazowy i nowe hasło. Po sukcesie wszystkie wcześniejsze sesje są usuwane."))
    blocks.append(fig("dok1_02.png", "forgot-request", 4))
    blocks.append(fig("dok1_03.png", "forgot-confirm", 5))

    blocks.append(paragraph("9.4. Katalog gier", style="Nagwek2"))
    blocks.append(paragraph("Po zalogowaniu użytkownik może filtrować gry po gatunku, wyszukiwać po nazwie lub wydawcy oraz przełączać się między pełną kolekcją i bestsellerami. Widoczność gier zależy od roli i flagi aktywności."))
    blocks.append(fig("dok1_05.png", "catalog", 6))

    blocks.append(paragraph("9.5. Proces zakupu", style="Nagwek2"))
    blocks.append(paragraph("Kreator zamówienia prowadzi przez wybór gry, dane kontaktowe, wybór płatności i potwierdzenie. W każdym kroku formularz waliduje dane, a backend przy zapisie koszyka sprawdza stany magazynowe i nalicza promocje."))
    blocks.append(fig("dok1_06.png", "checkout-select", 7))
    blocks.append(fig("dok1_07.png", "checkout-contact", 8))
    blocks.append(fig("dok1_08.png", "checkout-payment", 9))
    blocks.append(fig("dok1_09.png", "checkout-blik", 10))
    blocks.append(fig("dok1_10.png", "checkout-success", 11))

    blocks.append(paragraph("9.6. Historia zamówień", style="Nagwek2"))
    blocks.append(paragraph("Ekran zamówień grupuje pozycje po groupId, pokazuje rabat, status realizacji i szczegóły pozycji. Jest to widok użytkownika końcowego na własne zakupy i licencje."))
    blocks.append(fig("dok1_12.png", "orders", 12))

    blocks.append(paragraph("9.7. Recenzje", style="Nagwek2"))
    blocks.append(paragraph("Użytkownik może publikować recenzje, edytować je i usuwać. Formularz wymaga wskazania gry, oceny 1-5 i komentarza minimum 10 znaków. Backend dba o to, aby jeden użytkownik nie dodał dwóch recenzji tej samej gry."))
    blocks.append(fig("dok1_13.png", "reviews", 13))
    blocks.append(fig("dok1_14.png", "reviews-validation", 14))

    blocks.append(paragraph("10. Instrukcja dla managera", style="Nagwek1"))
    blocks.append(paragraph("Manager po zalogowaniu widzi panel operacyjny z trzema głównymi obszarami: katalog gier, zamówienia i promocje. Może modyfikować stan sklepu, ale nie może zarządzać użytkownikami ani konfiguracją poczty."))
    blocks.append(fig("dok1_15.png", "manager-games", 15))
    blocks.append(fig("dok1_16.png", "manager-orders", 16))
    blocks.append(fig("dok1_17.png", "manager-promotions", 17))

    blocks.append(paragraph("11. Instrukcja dla administratora", style="Nagwek1"))
    blocks.append(paragraph("Administrator ma najszerszy zakres uprawnień. Oprócz funkcji managera otrzymuje zarządzanie kontami, rolami, ustawieniami SMTP i pełnym audit logiem zdarzeń systemowych."))
    blocks.append(fig("dok1_21.png", "admin-dashboard", 18))
    blocks.append(fig("dok1_18.png", "admin-users", 19))
    blocks.append(fig("dok1_19.png", "admin-games", 20))
    blocks.append(fig("dok1_20.png", "admin-audit", 21))

    blocks.append(paragraph("12. Logowanie administratora i managera", style="Nagwek1"))
    blocks.append(paragraph("Administrator i manager korzystają z identycznego ekranu logowania. Różnica nie polega na innym formularzu, lecz na odpowiedzi backendu. Po uwierzytelnieniu API zwraca rolę użytkownika, a frontend odsłania odpowiednie trasy i panele. Ostateczna kontrola jest jednak utrzymywana po stronie serwera."))

    blocks.append(paragraph("13. Komponenty i co w nich jest bezpieczne", style="Nagwek1"))
    blocks.append(
        table(
            ["Komponent", "Rola w systemie", "Co jest bezpieczne"],
            [
                ["LandingPage", "Publiczny ekran wejścia", "Korzysta tylko z publicznych endpointów FAQ i recenzji; nie ujawnia danych prywatnych."],
                ["LoginPage", "Logowanie użytkownika", "Łączy CSRF, sesję w cookie, rate limiting i opcjonalną reCAPTCHA."],
                ["ForgotPasswordPage", "Reset dostępu", "Neutralna odpowiedź, kod jednorazowy, wygasanie i usuwanie sesji po zmianie hasła."],
                ["GamesPage", "Przegląd katalogu", "Dane są filtrowane po roli po stronie backendu, a nie jedynie w UI."],
                ["OrderPage", "Zakupy i historia zamówień", "CSRF, walidacja, transakcje bazy, kontrola stanów magazynowych i statusów."],
                ["ReviewPage", "Opinie użytkowników", "Jedna recenzja na użytkownika i grę, edycja tylko właściciela lub admina."],
                ["ManageGamesPage", "Panel managera", "Dostęp tylko po roli MANAGER lub ADMIN, mutacje objęte CSRF."],
                ["AdminPage", "Panel administratora", "Dostęp tylko dla ADMIN oraz audyt operacji wrażliwych."],
                ["API wrapper client", "Centralna komunikacja z backendem", "Automatycznie pobiera CSRF i ponawia żądanie po kontrolowanym błędzie 403."],
                ["Nginx", "Warstwa wejściowa projektu", "Blokuje nieobsługiwane ścieżki i przekazuje protokół HTTPS do backendu."],
            ],
            widths=[1900, 2500, 5000],
            header_fill="19AD78",
        )
    )

    blocks.append(paragraph("14. Konta przykładowe i seed danych", style="Nagwek1"))
    blocks.append(paragraph("Projekt posiada konta testowe admin@example.com, manager@example.com i user@example.com wraz z hasłami developerskimi. Seed tworzy również 8 gier, przykładowe zamówienia, wpis FAQ, recenzję oraz aktywną promocję. Dane te służą wyłącznie środowisku testowemu i powinny zostać zmienione lub usunięte przed użyciem poza laboratorium."))

    blocks.append(paragraph("15. Uwagi eksploatacyjne", style="Nagwek1"))
    blocks.append(paragraph("Frontend jest budowany jako statyczny bundle i serwowany przez Nginx projektu. API działa w Express i tam egzekwowane są nagłówki Helmet, CORS, sesja, CSRF, role i audit log. Przy pracy za reverse proxy należy utrzymywać prawidłowy X-Forwarded-Proto, aby cookies zachowywały się poprawnie dla HTTPS."))

    blocks.append(paragraph("16. Podsumowanie bezpieczeństwa", style="Nagwek1"))
    blocks.append(paragraph("GameVault jest przykładem aplikacji, w której bezpieczeństwo zostało rozdzielone pomiędzy wiele warstw. Nie ma jednego mechanizmu, który odpowiada za całą ochronę. Zamiast tego sesja, CSRF, RBAC, reCAPTCHA, limity prób, audit log, ORM, transakcje i polityka cookies wzajemnie się uzupełniają."))
    blocks.append(note_box("Najważniejsza cecha projektu", "Najbardziej wartościowe jest to, że decyzje bezpieczeństwa nie są ukryte tylko w warstwie interfejsu. Nawet przy ręcznym odpytywaniu API serwer nadal wymusza dostęp po roli, ważną sesję, poprawny CSRF, poprawne payloady oraz ograniczenia widoczności danych.", fill="EAF2FF", border="3A7BE6", title_color="2459A6"))

    blocks.append(page_break())
    blocks.append(paragraph("17. Galeria wszystkich screenów dostarczonych w Dok1.docx", style="Nagwek1"))
    gallery = [
        ("dok1_01.png", "Ekran logowania"),
        ("dok1_02.png", "Reset hasła - wysłanie kodu"),
        ("dok1_03.png", "Reset hasła - ustawienie nowego hasła"),
        ("dok1_04.png", "Strona główna"),
        ("dok1_05.png", "Katalog gier"),
        ("dok1_06.png", "Kreator zamówienia - wybór gry"),
        ("dok1_07.png", "Kreator zamówienia - dane klienta"),
        ("dok1_08.png", "Kreator zamówienia - wybór metody płatności"),
        ("dok1_09.png", "Kreator zamówienia - BLIK"),
        ("dok1_10.png", "Kreator zamówienia - potwierdzenie"),
        ("dok1_11.png", "Dodatkowy ekran operacyjny użytkownika"),
        ("dok1_12.png", "Historia zamówień"),
        ("dok1_13.png", "Twoje recenzje"),
        ("dok1_14.png", "Błąd walidacji recenzji"),
        ("dok1_15.png", "Panel managera - katalog"),
        ("dok1_16.png", "Panel managera - zamówienia"),
        ("dok1_17.png", "Panel managera - promocje"),
        ("dok1_18.png", "Panel administratora - użytkownicy i SMTP"),
        ("dok1_19.png", "Panel administratora - katalog"),
        ("dok1_20.png", "Panel administratora - audit log"),
        ("dok1_21.png", "Dashboard administratora"),
    ]
    drawing_id = 100
    for filename, caption in gallery:
        blocks.append(paragraph(caption, style="Nagwek2"))
        blocks.append(fig(filename, caption, drawing_id))
        drawing_id += 1

    body = "".join(blocks)
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" '
        'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
        'xmlns:o="urn:schemas-microsoft-com:office:office" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
        'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" '
        'xmlns:v="urn:schemas-microsoft-com:vml" '
        'xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" '
        'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
        'xmlns:w10="urn:schemas-microsoft-com:office:word" '
        'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" '
        'xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" '
        'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" '
        'xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" '
        'xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" '
        'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" '
        'mc:Ignorable="w14 w15 wp14">'
        f"<w:body>{body}"
        '<w:sectPr>'
        '<w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="1417" w:right="1134" w:bottom="1417" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>'
        '<w:cols w:space="708"/>'
        '<w:docGrid w:linePitch="360"/>'
        "</w:sectPr>"
        "</w:body></w:document>"
    )


def build_document_rels(images: list[ImageAsset]) -> str:
    rels = [
        ('rId1', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles', 'styles.xml'),
        ('rId2', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings', 'settings.xml'),
        ('rId3', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/webSettings', 'webSettings.xml'),
        ('rId4', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable', 'fontTable.xml'),
        ('rId5', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme', 'theme/theme1.xml'),
    ]
    for index, image in enumerate(images, start=1):
        rels.append(
            (
                f"rIdImage{index}",
                'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
                f"media/{image.filename}",
            )
        )
    xml = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">']
    for rid, rel_type, target in rels:
        xml.append(f'<Relationship Id="{rid}" Type="{rel_type}" Target="{target}"/>')
    xml.append("</Relationships>")
    return "".join(xml)


def build_content_types() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Default Extension="png" ContentType="image/png"/>'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
        '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>'
        '<Override PartName="/word/webSettings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.webSettings+xml"/>'
        '<Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>'
        '<Override PartName="/word/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>'
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
        "</Types>"
    )


def build_root_rels() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
        "</Relationships>"
    )


def build_app_xml() -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" '
        'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
        '<Application>Codex</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop>'
        '<Company></Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc>'
        '<HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0000</AppVersion>'
        "</Properties>"
    )


def build_core_xml() -> str:
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/" '
        'xmlns:dcterms="http://purl.org/dc/terms/" '
        'xmlns:dcmitype="http://purl.org/dc/dcmitype/" '
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
        '<dc:title>Dokumentacja GameVault</dc:title>'
        '<dc:subject>GameVault /Projekt</dc:subject>'
        '<dc:creator>Codex</dc:creator>'
        '<cp:keywords>GameVault, Projekt, dokumentacja, bezpieczeństwo</cp:keywords>'
        '<dc:description>Dokumentacja użytkowa i techniczna aplikacji GameVault.</dc:description>'
        '<cp:lastModifiedBy>Codex</cp:lastModifiedBy>'
        f'<dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>'
        f'<dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>'
        "</cp:coreProperties>"
    )


def load_template_parts() -> dict[str, bytes]:
    if not TEMPLATE_DOCX.exists():
        raise FileNotFoundError(f"Brakuje szablonu Word: {TEMPLATE_DOCX}")
    wanted = {
        "word/styles.xml",
        "word/settings.xml",
        "word/webSettings.xml",
        "word/fontTable.xml",
        "word/theme/theme1.xml",
    }
    with zipfile.ZipFile(TEMPLATE_DOCX) as archive:
        return {name: archive.read(name) for name in wanted}


def load_package_metadata() -> dict[str, dict]:
    return {
        "root": json.loads((ROOT / "package.json").read_text()),
        "client": json.loads((ROOT / "client/package.json").read_text()),
        "server": json.loads((ROOT / "server/package.json").read_text()),
    }


def write_docx(images: list[ImageAsset], document_xml: str, template_parts: dict[str, bytes]) -> None:
    if ASSET_DIR.exists():
        shutil.rmtree(ASSET_DIR)
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    for image in images:
        (ASSET_DIR / image.filename).write_bytes(image.data)

    with zipfile.ZipFile(OUTPUT_DOCX, "w", compression=zipfile.ZIP_DEFLATED) as docx:
        docx.writestr("[Content_Types].xml", build_content_types())
        docx.writestr("_rels/.rels", build_root_rels())
        docx.writestr("docProps/app.xml", build_app_xml())
        docx.writestr("docProps/core.xml", build_core_xml())
        docx.writestr("word/document.xml", document_xml)
        docx.writestr("word/_rels/document.xml.rels", build_document_rels(images))
        for part_name, data in template_parts.items():
            docx.writestr(part_name, data)
        for image in images:
            docx.writestr(f"word/media/{image.filename}", image.data)


def main() -> None:
    packages = load_package_metadata()
    template_parts = load_template_parts()
    images = build_images()
    document_xml = build_document_xml(images, packages)
    write_docx(images, document_xml, template_parts)
    print(f"Generated: {OUTPUT_DOCX}")
    print(f"Assets: {ASSET_DIR}")


if __name__ == "__main__":
    main()
