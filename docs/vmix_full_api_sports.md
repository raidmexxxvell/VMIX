
# 📘 Полное руководство vMix API для спортивных трансляций  
_Максимально подробный файл в формате .md, адаптирован под работу со счётом, фолами, пенальти, повторами, музыкой, графикой и титрами._

---

# 🧭 1. Основы работы с HTTP API

vMix API вызывается через HTTP:

```
http://127.0.0.1:8088/api/?Function=ИмяФункции&Параметры
```

Если выполнить `/api/` без параметров — vMix вернёт **XML состояние**.

---

# 🔄 2. Управление переходами (Transitions)

## Fade (Плавный переход)
```
/api/?Function=Fade&Duration=700
```

Перевести конкретный Input в эфир:
```
/api/?Function=Fade&Input=3&Duration=700
```

## Cut (резкий переход)
```
/api/?Function=Cut
```

---

# 🎛️ 3. Управление входами (Inputs)

## Поставить во **Active**:
```
/api/?Function=ActiveInput&Input=4
```

## Поставить в **Preview**:
```
/api/?Function=PreviewInput&Input=5
```

## Включить / выключить звук:
```
/api/?Function=AudioOn&Input=5
/api/?Function=AudioOff&Input=5
```

---

# 📝 4. Управление титрами и текстом (SetText, GT Titles)

## 4.1. Простые XAML / TITLE титры

### Обновить текст:
```
/api/?Function=SetText&Input=Scoreboard&SelectedName=ScoreHome&Value=2
```

Работает без `.Text`.

---

## 4.2. GT Titles (важно — заканчивается на `.Text`)

```
/api/?Function=SetText&Input=ScoreGT&SelectedName=TeamNameHome.Text&Value=Barcelona
```

---

## 4.3. Замена изображения

```
/api/?Function=SetImage&Input=PlayerCard&SelectedName=Photo.Source&Value=player.png
```

---

# 🔢 5. Счёт матча

### Установить счёт хозяев:
```
/api/?Function=SetText&Input=Scoreboard&SelectedName=ScoreHome&Value=3
```

### Установить счёт гостей:
```
/api/?Function=SetText&Input=Scoreboard&SelectedName=ScoreAway&Value=1
```

---

# 🚨 6. Фолы, карточки, угловые

## Фолы:
```
/api/?Function=SetText&Input=Scoreboard&SelectedName=FoulsHome&Value=4
/api/?Function=SetText&Input=Scoreboard&SelectedName=FoulsAway&Value=2
```

## Показать жёлтую карточку:
```
/api/?Function=OverlayInput1In&Input=YellowCard
```

## Убрать:
```
/api/?Function=OverlayInput1Out
```

---

# 🥅 7. Пенальти — забил / промах

## Показать «забил» (зелёный индикатор + фото)
```
/api/?Function=SetImage&Input=Penalty&SelectedName=Indicator.Source&Value=green.png
/api/?Function=SetImage&Input=Penalty&SelectedName=Photo.Source&Value=player12.jpg
/api/?Function=OverlayInput2In&Input=Penalty
```

## Показать «промах» (красный)
```
/api/?Function=SetImage&Input=Penalty&SelectedName=Indicator.Source&Value=red.png
```

---

# ⏱️ 8. Таймеры (обратный / прямой отсчёт)

## Установить:
```
/api/?Function=SetCountdown&Input=MainTimer&Value=00:45:00
```

## Запустить:
```
/api/?Function=StartCountdown&Input=MainTimer
```

## Остановить:
```
/api/?Function=StopCountdown&Input=MainTimer
```

---

# 🎥 9. Полный контроль Instant Replay (повторы)

## Начать запись
```
/api/?Function=ReplayStartRecording
```

## Остановить запись
```
/api/?Function=ReplayStopRecording
```

## Поставить точку In
```
/api/?Function=ReplayMarkIn
```

## Поставить точку Out
```
/api/?Function=ReplayMarkOut
```

## Сохранить повтор
```
/api/?Function=ReplaySave
```

## Сохранить последний момент
```
/api/?Function=ReplaySaveLastEvent
```

## Проиграть последний повтор
```
/api/?Function=ReplayPlayLastEvent
```

## Выбрать событие по номеру:
```
/api/?Function=ReplayPlayEvent&Value=1
```

---

# 🎼 10. Музыка

## Включить:
```
/api/?Function=Play&Input=Music
```

## Пауза:
```
/api/?Function=Pause&Input=Music
```

## Остановить:
```
/api/?Function=Stop&Input=Music
```

## Установить громкость:
```
/api/?Function=SetVolume&Input=Music&Value=200
```

---

# 🖥️ 11. Overlay (графика поверх видео)

## Показать:
```
/api/?Function=OverlayInput1In&Input=Scoreboard
```

## Скрыть:
```
/api/?Function=OverlayInput1Out
```

## Переключить:
```
/api/?Function=OverlayInput1Toggle&Input=Scoreboard
```

---

# 🗂️ 12. Плейлисты (повторы в перерывах)

## Запустить:
```
/api/?Function=PlayListStart
```

## Остановить:
```
/api/?Function=PlayListStop
```

---

# ➕ 13. Добавление новых входов

## Видео:
```
/api/?Function=AddInput&Value=Video|c:\videos\goal1.mp4
```

## Картинка:
```
/api/?Function=AddInput&Value=Image|c:\graphics\logo.png
```

---

# 📡 14. Получение XML состояния vMix

```
http://127.0.0.1:8088/api/
```

---

# 📘 15. Самые важные команды в одной таблице

| Задача | Команда |
|-------|---------|
| Смена счёта | SetText |
| Фолы | SetText |
| Пенальти | SetImage + OverlayInputXIn |
| Фото игрока | SetImage |
| Обновление текста | SetText |
| Показ карточки | OverlayInputXIn |
| Мгновенная запись | ReplayStartRecording |
| Создать событие | ReplayMarkIn/ReplayMarkOut |
| Запустить повтор | ReplayPlayLastEvent |
| Сохранить повтор | ReplaySaveLastEvent |
| Музыка | Play/Pause/Stop |
| Overlay | OverlayInputXIn/Out |
| Переключение камеры | ActiveInput |
| Получить XML | /api/ |

---
