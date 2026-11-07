import { $, reveal } from '/assets/app.js';
const P = [
  ['101 Contoured Foundation', 'Brand Beauty', 34, 15], ['102 Large Powder', 'Brand Beauty', 36, 15], ['103 Bronzer', 'Brand Beauty', 34, 8],
  ['Tai nghe không dây', 'Tech Store', 59, 10], ['Sạc nhanh 65W', 'Tech Store', 25, 12], ['Bình giữ nhiệt', 'Home Plus', 18, 20],
  ['Nồi chiên không dầu', 'Home Plus', 89, 9], ['Áo thun basic', 'Fashion Lab', 12, 18], ['Giày chạy bộ', 'Fashion Lab', 75, 11],
];
const tagged = new Set();
$('#seller').innerHTML = ['All Sellers', ...new Set(P.map(p => p[1]))].map(s => `<option>${s}</option>`).join('');
function render() {
  const s = $('#seller').value, q = $('#q').value.toLowerCase();
  const list = P.map((p, i) => [p, i]).filter(([p]) => (s === 'All Sellers' || p[1] === s) && p[0].toLowerCase().includes(q));
  $('#plist').innerHTML = list.map(([p, i]) => `<label class="prod"><span class="th">${p[1].slice(0, 2).toUpperCase()}</span>
    <span class="i">${p[0]}<small>${p[1]} · $${p[2].toFixed(2)}</small><span class="com">${p[3]}% commission</span></span>
    <input type="checkbox" data-i="${i}" ${tagged.has(i) ? 'checked' : ''}></label>`).join('') || '<p style="padding:20px;color:#667">Không có sản phẩm</p>';
}
$('#plist').onchange = e => { const i = +e.target.dataset.i; e.target.checked ? tagged.add(i) : tagged.delete(i); update(); };
function update() {
  $('#cnt').textContent = `${tagged.size} tagged product${tagged.size === 1 ? '' : 's'}`;
  $('#done').disabled = !tagged.size;
}
$('#done').onclick = () => {
  const est = [...tagged].reduce((s, i) => s + P[i][2] * P[i][3] / 100, 0);
  $('#earn').innerHTML = `✅ Đã gắn ${tagged.size} sản phẩm — hoa hồng ước tính <b class="grad">$${est.toFixed(2)}</b> nếu mỗi sản phẩm bán được 1 đơn.`;
};
$('#seller').onchange = $('#q').oninput = render;
render(); update(); reveal();
