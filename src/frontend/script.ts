import './styles.css';
import logoUrl from './vt.png';

/* global window, localStorage, document, console, fetch, setTimeout */

type ResultData =
  | {
      x: number;
      y: number;
      r: number;
      result: string;
      time: string;
      workTime: string;
    }
  | {
      error: string;
    };

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('logo-img')?.setAttribute('src', logoUrl);

  const savedForm = localStorage.getItem('pointForm');
  if (savedForm) {
    try {
      const formData: { x?: number[]; y?: string; r?: number } =
        JSON.parse(savedForm);
      if (formData.x !== undefined) {
        document
          .querySelectorAll<HTMLInputElement>('.x-checkbox')
          .forEach((cb) => {
            cb.checked = <boolean>formData.x?.includes(Number(cb.value));
          });
      }
      if (formData.y !== undefined) {
        const yInput = document.getElementById('y') as HTMLInputElement | null;
        if (yInput) yInput.value = String(formData.y);
      }
      if (formData.r !== undefined) {
        document
          .querySelectorAll<HTMLInputElement>('.r-radio')
          .forEach((rb) => {
            rb.checked = rb.value === String(formData.r);
          });
      }
    } catch (e) {
      console.error('Ошибка восстановления формы:', e);
    }
  }

  const savedResults = localStorage.getItem('resultsTable');
  if (savedResults) {
    try {
      const results: ResultData[] = JSON.parse(savedResults);
      results.forEach((data) => addResultToTable(data));
    } catch (e) {
      console.error('Ошибка восстановления таблицы:', e);
    }
  }

  let r = 2;
  const checkedR = document.querySelector<HTMLInputElement>('.r-radio:checked');
  if (checkedR) r = parseInt(checkedR.value);
  drawGraph(r);

  document.querySelectorAll<HTMLInputElement>('.r-radio').forEach((radio) => {
    radio.addEventListener('change', () => {
      r = parseInt(radio.value);
      animateGraphChange(r);
      saveFormToLocalStorage();
    });
  });

  document.querySelectorAll<HTMLInputElement>('.x-checkbox').forEach((cb) => {
    cb.addEventListener('change', saveFormToLocalStorage);
  });

  const yInput = document.getElementById('y') as HTMLInputElement | null;
  if (yInput) yInput.addEventListener('input', saveFormToLocalStorage);

  const form = document.getElementById('point-form');
  if (form && !(form as any)._submitHandlerAdded) {
    form.addEventListener('submit', handleFormSubmit as EventListener);
    (form as any)._submitHandlerAdded = true;
  }
});

const saveFormToLocalStorage = (): void => {
  const xCheckboxes = Array.from(
    document.querySelectorAll<HTMLInputElement>('.x-checkbox'),
  )
    .filter((cb) => cb.checked)
    .map((cb) => parseInt(cb.value));
  const yInput = document.getElementById('y') as HTMLInputElement | null;
  const rRadio = document.querySelector<HTMLInputElement>('.r-radio:checked');
  const formData = {
    x: xCheckboxes,
    y: yInput ? yInput.value : '',
    r: rRadio ? parseInt(rRadio.value) : null,
  };
  localStorage.setItem('pointForm', JSON.stringify(formData));
};

(window as any).saveFormToLocalStorage = saveFormToLocalStorage;

const saveResultsToLocalStorage = (): void => {
  const tableBody = document.querySelector(
    '#results-table tbody',
  ) as HTMLTableSectionElement | null;
  if (!tableBody) return;
  const rows = Array.from(tableBody.querySelectorAll('tr'));
  const results: ResultData[] = rows.map(
    (row: { querySelectorAll: (arg0: string) => any }) => {
      const cells = row.querySelectorAll('td');
      return {
        x: Number(cells[0]?.textContent ?? 0),
        y: Number(cells[1]?.textContent ?? 0),
        r: Number(cells[2]?.textContent ?? 0),
        result: cells[3]?.textContent === 'Попадание' ? 'true' : 'false',
        time: cells[4]?.textContent ?? '',
        workTime: cells[5]?.textContent ?? '',
      };
    },
  );
  localStorage.setItem('resultsTable', JSON.stringify(results));
};

function handleFormSubmit(event: Event) {
  event.preventDefault();

  const xCheckboxes = Array.from(
    document.querySelectorAll<HTMLInputElement>('.x-checkbox'),
  )
    .filter((cb) => cb.checked)
    .map((cb) => parseInt(cb.value));
  const yInput = document.getElementById('y') as HTMLInputElement | null;
  const y: string = yInput ? yInput.value.trim() : '';
  const rRadio = document.querySelector<HTMLInputElement>('.r-radio:checked');
  const r: string | null = rRadio ? rRadio.value : null;

  const err: string = validateInput(xCheckboxes, y, r);
  if (err !== '') {
    showToast('Некорректные данные. ' + err, 'error');
    return;
  }

  Promise.all(
    xCheckboxes.map((xValue) => {
      const jsonData = {
        x: xValue,
        y: parseFloat(y),
        r: parseInt(r as string),
      };
      return fetch('http://localhost:8080/fcgi-bin/server.jar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData),
      })
        .then((response: Response) => response.json())
        .then((data: ResultData) => {
          if ('error' in data) {
            showToast(data.error, 'error');
            return;
          }
          addResultToTable(data);
          saveResultsToLocalStorage();
          const rRadio =
            document.querySelector<HTMLInputElement>('.r-radio:checked');
          const currentR = rRadio ? parseInt(rRadio.value) : 2;
          drawGraph(currentR);
          showToast('Точка успешно добавлена!', 'success');
        })
        .catch((error: Error) => {
          console.log(error);
          showToast(error.message, 'error');
        });
    }),
  ).then(() => {
    saveFormToLocalStorage();
  });
}

const validateInput = (
  x: number[] | null,
  y: string,
  r: string | null,
): string => {
  let res = '';
  if (!x || x.length === 0 || x.some((v) => isNaN(v) || v < -4 || v > 4))
    res += 'X: выберите хотя бы одно значение [-4;4]. ';
  const yNum = parseFloat(y);
  if (isNaN(yNum) || yNum < -3 || yNum > 5)
    res += 'Y: число должно быть в [-3;5]. ';
  const rNum = parseInt(r ?? '');
  if (isNaN(rNum) || rNum < 1 || rNum > 5) res += 'R: выберите радиус [1;5].';
  return res;
};

const addResultToTable = (data: ResultData): void => {
  if ('error' in data) return;
  const tableBody = document.querySelector(
    '#results-table tbody',
  ) as HTMLTableSectionElement | null;
  if (!tableBody) return;

  const row = document.createElement('tr');

  const xCell = document.createElement('td');
  xCell.textContent = String(data.x);
  row.appendChild(xCell);

  const yCell = document.createElement('td');
  yCell.textContent = String(data.y);
  row.appendChild(yCell);

  const rCell = document.createElement('td');
  rCell.textContent = String(data.r);
  row.appendChild(rCell);

  const resultCell = document.createElement('td');
  resultCell.textContent = data.result === 'true' ? 'Попадание' : 'Промах';
  row.appendChild(resultCell);

  const timeCell = document.createElement('td');
  timeCell.textContent = data.time;
  row.appendChild(timeCell);

  const workTimeCell = document.createElement('td');
  workTimeCell.textContent = data.workTime;
  row.appendChild(workTimeCell);

  tableBody.insertBefore(row, tableBody.firstChild);

  const rRadio = document.querySelector<HTMLInputElement>('.r-radio:checked');
  const currentR = rRadio ? parseInt(rRadio.value) : 2;
  if (data.r === currentR) {
    drawPointOnGraph(data.x, data.y);
  }
};

function drawPointOnGraph(x: number, y: number): void {
  const canvas = document.getElementById(
    'graph-canvas',
  ) as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cx = canvas.width / 2,
    cy = canvas.height / 2;
  const scale = 200 / 5;

  const px = cx + x * scale;
  const py = cy - y * scale;

  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, 6, 0, 2 * Math.PI);
  ctx.fillStyle = '#d32f2f';
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

const drawGraph = (r: number = 2): void => {
  const canvas = document.getElementById(
    'graph-canvas',
  ) as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = 260,
    cy = 260;
  const scale = 200 / 5;

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#2b8be6';

  ctx.beginPath();
  ctx.moveTo(cx - (scale * r) / 2, cy);
  ctx.lineTo(cx, cy - scale * r);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - scale * r);
  ctx.arc(cx, cy, scale * r, -Math.PI / 2, 0, false);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fill();

  ctx.fillRect(cx, cy, scale * r, (scale * r) / 2);

  ctx.restore();

  ctx.save();
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  for (let i = -5; i <= 5; i++) {
    const x = cx + i * scale;
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.lineTo(x, 500);
    ctx.stroke();
  }

  for (let i = -5; i <= 5; i++) {
    const y = cy + i * scale;
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(500, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(20, cy);
  ctx.lineTo(500, cy);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, 500);
  ctx.lineTo(cx, 20);
  ctx.stroke();

  ctx.save();
  ctx.fillStyle = '#111';

  ctx.beginPath();
  ctx.moveTo(500, cy);
  ctx.lineTo(490, cy - 5);
  ctx.lineTo(490, cy + 5);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx, 20);
  ctx.lineTo(cx - 5, 30);
  ctx.lineTo(cx + 5, 30);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1;
  const sizeScale = r / 5;
  ctx.font = `${25 * sizeScale}px Arial`;
  ctx.fillStyle = '#111';

  ctx.beginPath();
  ctx.moveTo(cx - scale * r, cy - 5);
  ctx.lineTo(cx - scale * r, cy + 5);
  ctx.moveTo(cx - (scale * r) / 2, cy - 5);
  ctx.lineTo(cx - (scale * r) / 2, cy + 5);
  ctx.moveTo(cx + (scale * r) / 2, cy - 5);
  ctx.lineTo(cx + (scale * r) / 2, cy + 5);
  ctx.moveTo(cx + scale * r, cy - 5);
  ctx.lineTo(cx + scale * r, cy + 5);
  ctx.stroke();

  ctx.fillText('-R', cx - scale * r - 18 * sizeScale, cy + 25 * sizeScale);
  ctx.fillText(
    '-R/2',
    cx - (scale * r) / 2 - 28 * sizeScale,
    cy + 25 * sizeScale,
  );
  ctx.fillText(
    'R/2',
    cx + (scale * r) / 2 - 10 * sizeScale,
    cy + 25 * sizeScale,
  );
  ctx.fillText('R', cx + scale * r - 10 * sizeScale, cy + 25 * sizeScale);

  ctx.beginPath();
  ctx.moveTo(cx - 5, cy + scale * r);
  ctx.lineTo(cx + 5, cy + scale * r);
  ctx.moveTo(cx - 5, cy + (scale * r) / 2);
  ctx.lineTo(cx + 5, cy + (scale * r) / 2);
  ctx.moveTo(cx - 5, cy - (scale * r) / 2);
  ctx.lineTo(cx + 5, cy - (scale * r) / 2);
  ctx.moveTo(cx - 5, cy - scale * r);
  ctx.lineTo(cx + 5, cy - scale * r);
  ctx.stroke();

  ctx.fillText('-R', cx + 10 * sizeScale, cy + scale * r + 7 * sizeScale);
  ctx.fillText(
    '-R/2',
    cx + 10 * sizeScale,
    cy + (scale * r) / 2 + 7 * sizeScale,
  );
  ctx.fillText(
    'R/2',
    cx + 10 * sizeScale,
    cy - (scale * r) / 2 + 7 * sizeScale,
  );
  ctx.fillText('R', cx + 10 * sizeScale, cy - scale * r + 7 * sizeScale);

  ctx.font = `${22 + 10 / r}px Arial`;
  ctx.fillText('x', 505, cy - 15);
  ctx.fillText('y', cx + 15, 35);

  ctx.font = `${16 + 10 / r}px Arial`;
  ctx.fillStyle = '#111';
  ctx.fillText('0', cx - 12, cy + 18);
  ctx.fillText('1', cx + scale - 7, cy - 8);
  ctx.fillText('1', cx - 15, cy - scale + 5);

  const tableBody = document.querySelector(
    '#results-table tbody',
  ) as HTMLTableSectionElement | null;
  if (tableBody) {
    Array.from(tableBody.querySelectorAll('tr')).forEach(
      (row: { querySelectorAll: (arg0: string) => any }) => {
        const cells = row.querySelectorAll('td');
        const x = Number(cells[0]?.textContent ?? 0);
        const y = Number(cells[1]?.textContent ?? 0);
        const rValue = Number(cells[2]?.textContent ?? 0);
        if (rValue === r) {
          drawPointOnGraph(x, y);
        }
      },
    );
  }
};

function showToast(
  message: string,
  type: 'success' | 'error' | 'info' = 'info',
) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function animateGraphChange(r: number) {
  const canvas = document.getElementById('graph-canvas');
  if (!canvas) {
    drawGraph(r);
    return;
  }
  canvas.classList.add('graph-animating', 'fade-out');
  canvas.classList.remove('fade-in');
  setTimeout(() => {
    drawGraph(r);
    canvas.classList.remove('fade-out');
    canvas.classList.add('fade-in');
    setTimeout(() => {
      canvas.classList.remove('fade-in', 'graph-animating');
    }, 300);
  }, 300);
}
