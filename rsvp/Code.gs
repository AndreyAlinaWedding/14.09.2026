/**
 * Google Apps Script для RSVP → Google Таблица
 *
 * После изменения кода обязательно:
 *   Развернуть → Новое развёртывание → Веб-приложение
 *   (или Управление развёртываниями → ✏️ → Новая версия → Развернуть)
 *
 * Заголовки в строке 1 (порядок любой):
 * Дата | Имя | Присутствие | Гости | Напитки | Комментарий
 *
 * Если колонки «Напитки» ещё нет — добавьте её в строку 1 таблицы.
 * Старую колонку «Блюда» можно переименовать в «Напитки» или оставить пустой.
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
    var drinks = String(data.drinks || data.drink || '');
    var attendance = attendanceLabel[data.attendance] || data.attendance || '';
    var guests = String(data.guests || '');
    var comment = String(data.comment || '');

    var headerCount = Math.max(sheet.getLastColumn(), 6);
    var headers = sheet.getRange(1, 1, 1, headerCount).getValues()[0];

    var valuesByHeader = {
      'дата': new Date(),
      'имя': names,
      'присутствие': attendance,
      'гости': guests,
      'напитки': drinks,
      'комментарий': comment,
    };

    var row = [];
    var foundDrinksCol = false;
    var matched = 0;

    for (var i = 0; i < headers.length; i++) {
      var key = String(headers[i] || '').trim().toLowerCase();
      if (key === 'напитки' || key === 'блюда') foundDrinksCol = true;
      if (key === 'напитки' || key === 'блюда') {
        row.push(drinks);
        matched += 1;
      } else if (Object.prototype.hasOwnProperty.call(valuesByHeader, key)) {
        row.push(valuesByHeader[key]);
        matched += 1;
      } else {
        row.push('');
      }
    }

    if (matched === 0) {
      row = [new Date(), names, attendance, guests, drinks, comment];
    }

    sheet.appendRow(row);

    return jsonResponse({
      ok: true,
      version: 'drinks-v4',
      received: { names: names, drinks: drinks },
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function doGet() {
  return jsonResponse({
    ok: true,
    version: 'drinks-v4',
    message: 'RSVP endpoint ready. If version is missing in response, redeploy.',
  });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
