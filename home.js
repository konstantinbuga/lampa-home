/*
 * Домашний плагин Lampa (Samsung + Mi Box).
 * 1. Включает торренты, если сборка Lampa их спрятала (разделы «Парсер» и «TorrServer»).
 * 2. При первом запуске прописывает парсер jac.red и два TorrServer: ПК (основной) и Mi Box (запасной).
 * 3. Автопереключение: если ПК не отвечает — берёт TorrServer с Mi Box, когда ПК вернулся — снова ПК.
 */
(function () {
  'use strict';

  var PC  = 'http://192.168.3.40:8090';   // основной: ПК
  var BOX = 'http://192.168.3.29:8090';   // запасной: Mi Box
  var INIT_KEY = 'home_plugin_init_v1';

  if (window.home_plugin_loaded) return;
  window.home_plugin_loaded = true;

  if (window.lampa_settings) window.lampa_settings.torrents_use = true;

  function defaults() {
    var S = Lampa.Storage;
    if (S.get(INIT_KEY, '')) return;
    S.set('parser_use', true);
    S.set('parser_torrent_type', 'jackett');
    S.set('jackett_url', 'jac.red');
    S.set('jackett_key', '');
    S.set('torrserver_url', PC);
    S.set('torrserver_url_two', BOX);
    S.set('torrserver_use_link', 'one');
    S.set(INIT_KEY, '1');
  }

  function alive(url, cb) {
    var done = false;
    var xhr = new XMLHttpRequest();
    var timer = setTimeout(function () { if (!done) { done = true; try { xhr.abort(); } catch (e) {} cb(false); } }, 1500);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4 || done) return;
      done = true; clearTimeout(timer);
      cb(xhr.status === 200);
    };
    try { xhr.open('GET', url + '/echo', true); xhr.send(); }
    catch (e) { if (!done) { done = true; clearTimeout(timer); cb(false); } }
  }

  var last = 0;
  function check(force) {
    var now = Date.now();
    if (!force && now - last < 20000) return;   // не чаще раза в 20 секунд
    last = now;
    var main = Lampa.Storage.get('torrserver_url', PC) || PC;
    alive(main, function (ok) {
      var want = ok ? 'one' : 'two';
      if (Lampa.Storage.get('torrserver_use_link', 'one') !== want) {
        Lampa.Storage.set('torrserver_use_link', want);
        if (Lampa.Noty) Lampa.Noty.show(ok ? 'TorrServer: ПК' : 'ПК недоступен — TorrServer с Mi Box');
      }
    });
  }

  function start() {
    defaults();
    check(true);
    // перепроверка при открытии карточки фильма — до выбора торрента
    Lampa.Listener.follow('full', function (e) { if (e.type === 'complite') check(false); });
    // и раз в 5 минут, пока Lampa открыта
    setInterval(function () { check(true); }, 5 * 60 * 1000);
  }

  if (window.appready) start();
  else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
