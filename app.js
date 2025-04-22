// app.js - 編集付きPDF名言整形表示ツール v2
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js';

let currentData = [];

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

    currentData = parseBlocks(lines);
    renderTable(currentData);
  };
  reader.readAsArrayBuffer(file);
});

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

      results.push({ ja: ja.trim(), en: en.trim(), author: author.trim() });
    }
  }

  return results;
}

function renderTable(data) {
  const output = document.getElementById('output');
  const table = document.createElement('table');
  table.innerHTML = '<tr><th>日付</th><th>日本語</th><th>英語</th><th>出典</th><th>操作</th></tr>';

  data.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>1/${idx + 1}</td>
      <td contenteditable="true">${item.ja}</td>
      <td contenteditable="true">${item.en}</td>
      <td contenteditable="true">${item.author}</td>
      <td>
        <button class="move-up" onclick="moveRow(${idx}, -1)">↑</button>
        <button class="move-down" onclick="moveRow(${idx}, 1)">↓</button>
      </td>
    `;
    table.appendChild(tr);
  });

  output.innerHTML = '';
  output.appendChild(table);
}

function moveRow(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= currentData.length) return;
  const temp = currentData[index];
  currentData[index] = currentData[newIndex];
  currentData[newIndex] = temp;
  renderTable(currentData);
}

// CSV出力
function downloadCSV() {
  const headers = ['日付', '日本語', '英語', '出典'];
  let csv = headers.join(',') + '\n';
  const rows = document.querySelectorAll("#output table tr");
  rows.forEach((row, i) => {
    if (i === 0) return;
    const cells = row.querySelectorAll("td");
    const rowData = [
      cells[0]?.innerText.trim(),
      cells[1]?.innerText.trim(),
      cells[2]?.innerText.trim(),
      cells[3]?.innerText.trim()
    ];
    csv += rowData.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',') + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '名言編集結果.csv';
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('download-csv').addEventListener('click', downloadCSV);
