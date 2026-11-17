// Copy the contact email address. Falls back to selecting it if the clipboard API isn't available.
document.getElementById('copybtn') && document.getElementById('copybtn').addEventListener('click', function () {
  var el = document.getElementById('email'), b = this;
  function ok() { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1500); }
  function sel() { var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(el.textContent).then(ok, sel); else sel();
});

// Sort your week: what AI handles, what it readies for your OK, and the hours you get back. Runs only in the browser.
(function () {
  var root = document.getElementById('sx-tasks'); if (!root) return;
  var SETS = {
    personal: [
      ['Email triage and unsubscribing', 'agent', 3], ['Scheduling appointments on your calendar', 'agent', 1.5],
      ['Tracking bills and due dates', 'agent', 1], ['Researching purchases and prices', 'agent', 2],
      ['Grocery list and filling the cart', 'approve', 1.5], ['Replying to texts and emails', 'approve', 3],
      ['Paying bills', 'approve', 0.5], ['Booking travel', 'approve', 1],
      ['Filing receipts and documents', 'agent', 1], ['Remembering birthdays and gifts', 'agent', 0.5],
      ['Calls only you can make', 'human', 1], ['Signing forms', 'human', 0.5]],
    corporate: [
      ['Code review triage', 'agent', 5], ['Writing and fixing tests', 'agent', 6],
      ['Dependency and security updates', 'agent', 3], ['Docs and release notes', 'agent', 2],
      ['Ticket grooming', 'agent', 2], ['First-pass incident triage', 'agent', 2],
      ['Production deploys', 'approve', 2], ['Database migrations', 'approve', 1],
      ['Customer-facing messages', 'approve', 2], ['Architecture decisions', 'human', 3],
      ['Hiring and people work', 'human', 4]]
  };
  var EFF = { agent: 0.9, approve: 0.7, human: 0.1 };
  var LABEL = { agent: 'Handled for you', approve: 'Ready for your OK', human: 'Yours' };
  var mode = 'personal', state = { personal: [], corporate: [] }, $ = function (id) { return document.getElementById(id); };
  function fmt(n) { return String(Math.round(n * 10) / 10); }
  function render() {
    root.innerHTML = '';
    SETS[mode].forEach(function (t, i) {
      var s = state[mode][i] || (state[mode][i] = { on: i < 6, h: t[2] });
      var row = document.createElement('div'); row.className = 'sx-task' + (s.on ? '' : ' off');
      var id = 'sx-' + mode + i;
      row.innerHTML = '<input type="checkbox" id="' + id + '"' + (s.on ? ' checked' : '') + '>' +
        '<label for="' + id + '"><span class="sx-name">' + t[0] + '</span><span class="sx-door ' + t[1] + '">' + LABEL[t[1]] + '</span></label>' +
        '<div class="sx-hrs"><input type="number" min="0" step="0.5" id="' + id + 'h" value="' + s.h + '" aria-label="Hours per week: ' + t[0] + '"><span>h/wk</span></div>';
      root.appendChild(row);
      row.querySelector('input[type=checkbox]').addEventListener('change', function (e) { s.on = e.target.checked; row.classList.toggle('off', !s.on); calc(); });
      row.querySelector('.sx-hrs input').addEventListener('input', function (e) { s.h = Math.max(0, parseFloat(e.target.value) || 0); calc(); });
    });
    calc();
  }
  function totals() {
    var tot = { agent: 0, approve: 0, human: 0 }, saved = 0, all = 0, picked = [];
    SETS[mode].forEach(function (t, i) { var s = state[mode][i]; if (!s || !s.on) return; tot[t[1]] += s.h; all += s.h; saved += s.h * EFF[t[1]]; picked.push(t[0] + ' (' + fmt(s.h) + ' h, ' + LABEL[t[1]].toLowerCase() + ')'); });
    return { tot: tot, saved: saved, all: all, picked: picked };
  }
  function calc() {
    var r = totals();
    $('sx-saved').textContent = fmt(r.saved);
    ['agent', 'approve', 'human'].forEach(function (k) {
      $('sx-l-' + k).textContent = fmt(r.tot[k]) + ' h';
      $('sx-b-' + k).style.width = (r.all ? r.tot[k] / r.all * 100 : 0) + '%';
    });
    var rate = parseFloat($('sx-rate').value) || 0;
    $('sx-yr').textContent = '$' + Math.round(r.saved * rate * 48).toLocaleString('en-US');
  }
  function setMode(m) {
    mode = m;
    if ($('sx-personal')) $('sx-personal').setAttribute('aria-pressed', String(m === 'personal'));
    if ($('sx-corporate')) $('sx-corporate').setAttribute('aria-pressed', String(m === 'corporate'));
    $('sx-rate').value = m === 'personal' ? 75 : 120;
    render();
  }
  if ($('sx-personal')) $('sx-personal').addEventListener('click', function () { setMode('personal'); });
  if ($('sx-corporate')) $('sx-corporate').addEventListener('click', function () { setMode('corporate'); });
  $('sx-rate').addEventListener('input', calc);
  $('sx-cta').addEventListener('click', function () {
    var r = totals(), b = this;
    var text = 'Hi, I tried "Sort your week" (' + (mode === 'personal' ? 'personal' : 'team') + '). About ' + fmt(r.saved) +
      ' hrs/week I could get back. My list: ' + r.picked.join('; ') + '.';
    function go() { b.textContent = 'Copied. Opening your email…'; window.location.href = 'mailto:agentic@squared.pro?subject=Agentic%20Squared'; setTimeout(function () { b.textContent = 'Copy my sort and message me'; }, 2500); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(go, go); else go();
  });
  setMode(root.dataset.mode || 'personal');
})();
