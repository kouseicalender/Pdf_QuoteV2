// app.js - PDF名言整形表示ツール v2
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js';

document.getElementById('pdf-upload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function () {
    const typedArray = new Uint8Array(this.result);
    const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
    const lines = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      content.items.forEach(item => {
        const text = item.str.trim();
        if (text) lines.push(text);
      });
    }

    const blocks = parseBlocks(lines);
    renderTable(blocks);
  };
  reader.readAsArrayBuffer(file);
});

// 名言ブロック解析：2026 + 通番で区切り、上をさかのぼって出典・英語・日本語を抽出
function parseBlocks(lines) {
  const results = [];
  let buffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    buffer.push(line);

    if (line === '2026' && /^\d{3}$/.test(lines[i + 1])) {
      const block = buffer.slice();
      buffer = [];

      const jaLines = block.filter(l => /[ぁ-んァ-ン一-龯]/.test(l));
      const enLines = block.filter(l => /[a-zA-Z]/.test(l) && !/[ぁ-んァ-ン一-龯]/.test(l));
      const authorLines = block.filter(l => /^[（(][0-9B.C.～年・）\s\-～]+/.test(l));

      const ja = jaLines.slice(-2).join(' ') || 'error';
      const en = enLines.slice(-1)[0] || 'error';
      const author = authorLines[0] || 'error';

      results.push({ ja, en, author });
    }
  }

  return results;
}

// 表形式で出力
function renderTable(data) {
  const output = document.getElementById('output');
  const table = document.createElement('table');
  table.innerHTML = '<tr><th>日付</th><th>日本語</th><th>英語</th><th>出典</th></tr>';

  data.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>1/${idx + 1}</td>
      <td>${item.ja}</td>
      <td>${item.en}</td>
      <td>${item.author}</td>
    `;
    table.appendChild(tr);
  });

  output.innerHTML = '';
  output.appendChild(table);
}
