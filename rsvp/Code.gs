/**
 * Google Apps Script для RSVP → Google Таблица
 *
 * !!! ВАЖНО: текущего развёртывания недостаточно только «Сохранить».
 * После вставки кода обязательно:
 *   Развернуть → Новое развёртывание → Веб-приложение
 *   (или Управление развёртываниями → ✏️ → Новая версия → Развернуть)
 * Иначе Google продолжит старый код без колонки «Блюда».
 *
 * Заголовки в строке 1 (порядок любой):
 * Дата | Имя | Присутствие | Гости | Блюда | Комментарий
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    var attendanceLabel = {
      yes: 'Да',
      no: 'Нет',
    };

    var names = String(data.names || data.name || '');
    var meals = String(data.meals || data.meal || '');
    var attendance = attendanceLabel[data.attendance] || data.attendance || '';
    var guests = String(data.guests || '');
    var comment = String(data.comment || '');

    // Берём минимум 6 колонок, даже если «Блюда» ещё пустая
    var headerCount = Math.max(sheet.getLastColumn(), 6);
    var headers = sheet.getRange(1, 1, 1, headerCount).getValues()[0];

    var valuesByHeader = {
      'дата': new Date(),
      'имя': names,
      'присутствие': attendance,
      'гости': guests,
      'блюда': meals,
      'комментарий': comment,
    };

    var row = [];
    var foundMealsCol = false;

    for (var i = 0; i < headers.length; i++) {
      var key = String(headers[i] || '').trim().toLowerCase();
      if (key === 'блюда') foundMealsCol = true;
      if (Object.prototype.hasOwnProperty.call(valuesByHeader, key)) {
        row.push(valuesByHeader[key]);
      } else {
        row.push('');
      }
    }

    // Если заголовок «Блюда» не найден — фиксированный порядок:
    // Дата | Имя | Присутствие | Гости | Блюда | Комментарий
    if (!foundMealsCol) {
      row = [new Date(), names, attendance, guests, meals, comment];
    }

    sheet.appendRow(row);

    return jsonResponse({
      ok: true,
      version: 'meals-v2',
      received: { names: names, meals: meals },
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function doGet() {
  return jsonResponse({
    ok: true,
    version: 'meals-v2',
    message: 'RSVP endpoint ready. If version is missing in response, redeploy.',
  });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
