const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function client() {
  const handlers = {}, elements = {}, intervals = new Map(), timeouts = new Map();
  let now = 0, id = 0, closed = 0, played = 0;
  const document = { body: {}, hidden: false, addEventListener(name, fn) { handlers[name] = fn; } };
  function element() {
    return { hidden: false, style: {}, textContent: '', volume: 1,
      focus() { document.activeElement = this; },
      pause() {}, play() { played++; }, load() {},
      appendChild(node) { this.child = node; }, removeAttribute() {}, setAttribute() {} };
  }
  document.getElementById = id => elements[id] || (elements[id] = element());
  document.createElement = element;
  const window = { PalmSystem: { activate() {} }, close() { closed++; } };
  class Clock extends Date { static now() { return now; } }
  vm.runInNewContext(fs.readFileSync('app/app.js', 'utf8'), {
    document, window, Date: Clock,
    setInterval(fn) { intervals.set(++id, fn); return id; }, clearInterval(id) { intervals.delete(id); },
    setTimeout(fn) { timeouts.set(++id, fn); return id; }, clearTimeout(id) { timeouts.delete(id); }
  });
  return { elements, handlers, document, intervals,
    event(name, detail) { handlers[name]({ detail }); },
    advance(ms) { now += ms; [...intervals.values()].forEach(fn => fn()); },
    get closed() { return closed; }, get played() { return played; }
  };
}

test('manual launch is silent; launch and relaunch each ring once and reset expiry', () => {
  const c = client();
  c.event('webOSLaunch', {});
  assert.equal(c.played, 0);
  c.event('webOSLaunch', { action: 'doorbell', duration: 10 });
  assert.equal(c.played, 1);
  c.advance(9000);
  c.event('webOSRelaunch', { action: 'doorbell', duration: 10 });
  assert.equal(c.played, 2);
  c.advance(2000);
  assert.equal(c.closed, 0);
  c.advance(8000);
  assert.equal(c.closed, 1);
  assert.equal(c.intervals.size, 1, 'only the clock remains');
});

test('invalid payload is harmless; message is text; duration and volume are bounded', () => {
  const c = client();
  c.event('webOSLaunch', '{broken');
  c.event('webOSRelaunch', null);
  assert.equal(c.played, 0);
  c.event('webOSRelaunch', JSON.stringify({action: 'doorbell', duration: 9999, volume: 7, message: '<script>bad</script>'}));
  assert.equal(c.elements.chime.volume, 1);
  assert.equal(c.elements.message.textContent, '<script>bad</script>');
  c.advance(119000);
  assert.equal(c.closed, 0);
  c.advance(1000);
  assert.equal(c.closed, 1);
});

test('unsupported camera URL does not suppress the chime', () => {
  const c = client();
  c.event('webOSLaunch', {action: 'doorbell', camera: 'rtsp://camera/live'});
  assert.equal(c.played, 1);
  assert.match(c.elements['camera-status'].textContent, /HTTP/);
});

test('camera failure preserves ringing; stale camera callback cannot damage a later ring', () => {
  const c = client();
  c.event('webOSLaunch', {action: 'doorbell', camera: 'http://camera/image.jpg', cameraType: 'image'});
  const stale = c.elements.media.child.onerror;
  c.event('webOSRelaunch', {action: 'doorbell'});
  stale();
  assert.equal(c.elements['camera-status'].textContent, '');
  c.event('webOSRelaunch', {action: 'doorbell', camera: 'http://camera/image.jpg', cameraType: 'image'});
  c.elements.media.child.onerror();
  assert.equal(c.document.body.className, 'ringing');
  assert.equal(c.elements.media.hidden, true);
});

test('leaving the app cancels ringing and expiry; Back closes explicitly', () => {
  const c = client();
  c.event('webOSLaunch', {action: 'doorbell'});
  c.document.hidden = true;
  c.handlers.visibilitychange();
  c.advance(30000);
  assert.equal(c.closed, 0);
  assert.equal(c.intervals.size, 1);
  c.handlers.keydown({keyCode: 461, preventDefault() {}});
  assert.equal(c.closed, 1);
});
