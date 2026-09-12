(function () {
  'use strict';
  var el = function (id) { return document.getElementById(id); };
  var timer, cameraTimer, deadline = 0, duration = 15, generation = 0, mediaNode;
  var audio = el('chime');
  var system = window.webOSSystem || window.PalmSystem;

  function clean() {
    generation += 1;
    clearInterval(timer);
    clearTimeout(cameraTimer);
    audio.pause();
    if (mediaNode) {
      mediaNode.onload = mediaNode.onerror = mediaNode.onplaying = null;
      if (mediaNode.pause) mediaNode.pause();
      mediaNode.removeAttribute('src');
      if (mediaNode.load) mediaNode.load();
    }
    mediaNode = null;
    el('media').textContent = '';
    el('media').hidden = true;
    document.body.className = '';
    el('camera-status').textContent = '';
    el('audio-status').textContent = '';
  }

  function idle() {
    clean();
    el('status').textContent = 'PRIPRAVENÉ NA ZAZVONENIE';
    el('title').textContent = 'Vitaj doma.';
    el('message').textContent = 'Keď niekto zazvoní, uvidíš to tu.';
    el('location').textContent = 'VCHODOVÉ DVERE';
    el('countdown').textContent = 'LG Ring';
    el('progress').style.width = '0%';
    el('dismiss').hidden = true;
    el('test').focus();
  }

  function dismiss() {
    idle();
    if (system) window.close();
  }

  function playSound(token) {
    el('audio-status').textContent = '';
    function failed() {
      if (token === generation) el('audio-status').textContent = 'Zvuk sa nespustil. Stlač „Vyskúšať zvonček“.';
    }
    try {
      audio.currentTime = 0;
      var result = audio.play();
      if (result && result.catch) result.catch(failed);
    } catch (error) { failed(); }
  }

  function camera(url, type, token) {
    if (!url) return;
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      el('camera-status').textContent = 'Kamera potrebuje priamu HTTP(S) adresu videa alebo obrázka.';
      return;
    }
    var node = document.createElement(type === 'image' ? 'img' : 'video');
    mediaNode = node;
    function ready() {
      if (token !== generation) return;
      clearTimeout(cameraTimer);
      el('camera-status').textContent = '';
    }
    function failed() {
      if (token !== generation) return;
      clearTimeout(cameraTimer);
      el('camera-status').textContent = 'Kamera nie je dostupná. Zvonček funguje ďalej.';
      el('media').hidden = true;
      document.body.className = 'ringing';
    }
    node.onerror = failed;
    if (type === 'image') {
      node.alt = 'Obraz z kamery pri dverách';
      node.onload = ready;
    } else {
      node.muted = true;
      node.autoplay = true;
      node.setAttribute('playsinline', '');
      node.onplaying = ready;
    }
    el('camera-status').textContent = 'Pripájam kameru…';
    el('media').appendChild(node);
    el('media').hidden = false;
    document.body.className = 'ringing has-camera';
    cameraTimer = setTimeout(failed, 10000);
    node.src = url;
    if (node.play) {
      try {
        var result = node.play();
        if (result && result.catch) result.catch(failed);
      } catch (error) { failed(); }
    }
  }

  function ring(params) {
    clean();
    var token = generation;
    var seconds = Number(params.duration);
    duration = isFinite(seconds) && seconds > 0 ? Math.max(5, Math.min(120, seconds)) : 15;
    deadline = Date.now() + duration * 1000;
    document.body.className = 'ringing';
    el('status').textContent = 'NIEKTO JE PRI DVERÁCH';
    el('title').textContent = 'Niekto zvoní.';
    el('message').textContent = typeof params.message === 'string' ? params.message.slice(0, 160) : 'Pozri sa, kto prišiel na návštevu.';
    el('location').textContent = typeof params.label === 'string' ? params.label.slice(0, 50) : 'VCHODOVÉ DVERE';
    el('dismiss').hidden = false;
    el('dismiss').focus();
    var volume = Number(params.volume);
    audio.volume = params.volume !== undefined && isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0.7;
    playSound(token);
    camera(params.camera, params.cameraType, token);
    function tick() {
      var remaining = Math.max(0, deadline - Date.now());
      el('countdown').textContent = 'Zavrie sa o ' + Math.ceil(remaining / 1000) + ' s';
      el('progress').style.width = (remaining / (duration * 1000) * 100) + '%';
      if (!remaining) dismiss();
    }
    timer = setInterval(tick, 250);
    tick();
  }

  function launch(event) {
    var params = event.detail || {};
    if (typeof params === 'string') {
      try { params = JSON.parse(params); } catch (error) { params = {}; }
    }
    if (system && system.activate) system.activate();
    if (params && params.action === 'doorbell') ring(params);
    else idle();
  }

  document.addEventListener('webOSLaunch', launch, true);
  document.addEventListener('webOSRelaunch', launch, true);
  document.addEventListener('visibilitychange', function () { if (document.hidden) idle(); });
  document.addEventListener('webkitvisibilitychange', function () { if (document.webkitHidden) idle(); });
  document.addEventListener('keydown', function (event) {
    var code = event.keyCode;
    if (code === 461 || code === 27) { event.preventDefault(); dismiss(); }
    else if (code >= 37 && code <= 40) {
      event.preventDefault();
      if (document.activeElement === el('test') && !el('dismiss').hidden) el('dismiss').focus();
      else el('test').focus();
    }
  });
  el('test').onclick = function () { ring({}); };
  el('dismiss').onclick = dismiss;
  function clock() {
    var now = new Date();
    el('clock').textContent = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
  }
  clock();
  setInterval(clock, 1000);
  idle();
}());
