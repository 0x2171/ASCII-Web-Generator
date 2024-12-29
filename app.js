// Глобальная переменная для хранения оригинального изображения
let originalImage = null;
let originalImageData = null;

// Обработчик для открытия файла
document.getElementById('openFileBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

// Обработчик изменения файла
document.getElementById('fileInput').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img; // Сохраняем оригинальное изображение
                const canvas = document.getElementById('imageCanvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height); // Сохраняем оригинальные данные изображения
                applyImageEffects();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Обработчик для сохранения файла
document.getElementById('saveFileBtn').addEventListener('click', () => {
    const text = document.getElementById('textArea').value;
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'text.txt';
    link.click();
});

// Обработчик для сохранения текста как PNG
document.getElementById('saveAsPngBtn').addEventListener('click', () => {
    const text = document.getElementById('textArea').value;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = 12;
    const lineHeight = fontSize * 1.2;
    const lines = text.split('\n');
    const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    canvas.width = maxWidth + 20;
    canvas.height = lines.length * lineHeight + 20;
    ctx.font = `${fontSize}px Courier New`;
    ctx.fillStyle = 'black';
    ctx.textBaseline = 'top';

    lines.forEach((line, index) => {
        ctx.fillText(line, 10, 10 + index * lineHeight);
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'text.png';
    link.click();
});

// Обработчики для изменений эффектов
document.getElementById('saturation').addEventListener('input', applyImageEffects);
document.getElementById('sharpness').addEventListener('input', applyImageEffects);
document.getElementById('thickness').addEventListener('input', applyImageEffects);
document.getElementById('height').addEventListener('input', applyImageEffects);
document.getElementById('width').addEventListener('input', applyImageEffects);

// Функция для применения эффектов к изображению
function applyImageEffects() {
    if (!originalImageData) return; // Если изображение не загружено, выходим

    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');

    // Клонируем оригинальные данные изображения для обработки
    const imageData = new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height
    );

    // Получение и парсинг значений эффектов
    const saturation = parseInt(document.getElementById('saturation').value);
    const sharpness = parseInt(document.getElementById('sharpness').value);
    const thickness = parseFloat(document.getElementById('thickness').value);
    const newHeight = parseInt(document.getElementById('height').value);
    const newWidth = parseInt(document.getElementById('width').value);

    const processedImageData = processImage(imageData, saturation, sharpness, thickness, newHeight, newWidth);

    // Устанавливаем размеры канваса в соответствии с масштабированием
    canvas.width = processedImageData.width;
    canvas.height = processedImageData.height;

    ctx.putImageData(processedImageData, 0, 0);
    loadImageAsAsciiArt(processedImageData);
}

// Функция для преобразования изображения в ASCII-арт
function loadImageAsAsciiArt(imageData) {
    const textArea = document.getElementById('textArea');
    textArea.value = '';
    const asciiChars = '@%#*+=-:. ';
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y += 2) { // Уменьшаем высоту для лучшего пропорционального отображения
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
            const asciiIndex = Math.floor(brightness * (asciiChars.length - 1));
            textArea.value += asciiChars[asciiIndex];
        }
        textArea.value += '\n';
    }
}

// Функция для обработки изображения с применением эффектов
function processImage(imageData, saturation, sharpness, thickness, newHeight, newWidth) {
    // Создаем временный канвас для обработки
    let tempCanvas = document.createElement('canvas');
    let tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    tempCtx.putImageData(imageData, 0, 0);

    // Применение насыщенности
    if (saturation !== 0) {
        let data = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        let saturationFactor = 1 + saturation / 100;
        for (let i = 0; i < data.data.length; i += 4) {
            let r = data.data[i];
            let g = data.data[i + 1];
            let b = data.data[i + 2];
            let gray = r * 0.3 + g * 0.59 + b * 0.11;
            data.data[i] = clamp(gray + saturationFactor * (r - gray), 0, 255);
            data.data[i + 1] = clamp(gray + saturationFactor * (g - gray), 0, 255);
            data.data[i + 2] = clamp(gray + saturationFactor * (b - gray), 0, 255);
        }
        tempCtx.putImageData(data, 0, 0);
    }

    // Применение резкости
    if (sharpness !== 0) {
        const sharpnessFactor = sharpness / 100;
        const filter = [
            [0, -sharpnessFactor, 0],
            [-sharpnessFactor, 1 + 4 * sharpnessFactor, -sharpnessFactor],
            [0, -sharpnessFactor, 0]
        ];
        applyConvolutionFilter(tempCtx, filter);
    }

    // Применение толщины (масштабирование)
    if (thickness !== 1) {
        let scaledWidth = tempCanvas.width * thickness;
        let scaledHeight = tempCanvas.height * thickness;
        let scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = scaledWidth;
        scaledCanvas.height = scaledHeight;
        let scaledCtx = scaledCanvas.getContext('2d');
        scaledCtx.imageSmoothingEnabled = false; // Отключаем сглаживание для четкого масштабирования
        scaledCtx.drawImage(tempCanvas, 0, 0, scaledWidth, scaledHeight);
        tempCanvas = scaledCanvas;
        tempCtx = scaledCtx;
    }

    // Применение изменения высоты и ширины
    if (newWidth !== tempCanvas.width || newHeight !== tempCanvas.height) {
        let resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = newWidth;
        resizedCanvas.height = newHeight;
        let resizedCtx = resizedCanvas.getContext('2d');
        resizedCtx.imageSmoothingEnabled = true; // Включаем сглаживание для качественного масштабирования
        resizedCtx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
        tempCanvas = resizedCanvas;
        tempCtx = resizedCtx;
    }

    return tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
}

// Функция для применения свертки (например, для резкости)
function applyConvolutionFilter(ctx, filter) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const filterSize = filter.length;
    const filterOffset = Math.floor(filterSize / 2);
    const copy = new Uint8ClampedArray(data); // Создаем копию данных для корректного применения фильтра

    for (let y = filterOffset; y < height - filterOffset; y++) {
        for (let x = filterOffset; x < width - filterOffset; x++) {
            let r = 0, g = 0, b = 0;
            for (let fy = 0; fy < filterSize; fy++) {
                for (let fx = 0; fx < filterSize; fx++) {
                    const imageX = clamp(x + fx - filterOffset, 0, width - 1);
                    const imageY = clamp(y + fy - filterOffset, 0, height - 1);
                    const index = (imageY * width + imageX) * 4;
                    r += copy[index] * filter[fy][fx];
                    g += copy[index + 1] * filter[fy][fx];
                    b += copy[index + 2] * filter[fy][fx];
                }
            }
            const idx = (y * width + x) * 4;
            data[idx] = clamp(r, 0, 255);
            data[idx + 1] = clamp(g, 0, 255);
            data[idx + 2] = clamp(b, 0, 255);
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

// Функция для ограничения значений
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

window.addEventListener('DOMContentLoaded', () => {
    // Установка значений по умолчанию
    document.getElementById('saturation').value = 0;
    document.getElementById('sharpness').value = 0;
    document.getElementById('thickness').value = 1;
    document.getElementById('height').value = 100;
    document.getElementById('width').value = 100;

    // Применение эффектов с начальными значениями
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');
    // Очистка канваса при загрузке
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Очистка текстового поля
    document.getElementById('textArea').value = '';
});
