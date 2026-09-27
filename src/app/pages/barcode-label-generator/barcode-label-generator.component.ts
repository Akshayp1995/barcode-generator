import { Component, ChangeDetectionStrategy, signal, computed, effect, HostListener, ElementRef, OnInit, inject, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// --- UTILITIES & EXTERNAL SCRIPTS ---
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(); return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
};

const DEFAULT_SAMPLE_DATA = {
  productName: "Premium Cotton T-Shirt",
  style: "Mens Classic",
  size: "XL",
  color: "Navy Blue",
  mrp: "1299.00",
  currency: "₹",
  itemCode: "TS-NVY-XL-01",
  sku: "1004829104",
  barcode: "890123456789",
  brand: "Noddy",
  manufacturer: "Fashion Boutique, Ahmedabad",
  email: "support@noddy.com",
  phone: "+91 98765 43210"
};

const DEFAULT_TEMPLATE = {
  name: "Garment Price Tag",
  width: 50,
  height: 75,
  unit: "mm",
  pageLayout: { 
    labelsPerRow: 1, labelsPerCol: 1, 
    horizontalGap: 0, verticalGap: 0, 
    pageWidth: 50, pageHeight: 75, 
    marginTop: 0, marginLeft: 0, 
    printQuantity: 1, startPosition: 1,
    showBorders: false, showWatermark: false
  },
  elements: [
    { id: "el_box1", type: "box", x: 2, y: 2, width: 46, height: 71, style: { borderWidth: 0.5, borderStyle: 'solid', borderColor: '#000000', borderRadius: 2, backgroundColor: 'transparent', borderTopWidth: 0.5, borderRightWidth: 0.5, borderBottomWidth: 0.5, borderLeftWidth: 0.5 } },
    { id: "el_brand", type: "text", content: "{{brand}}", x: 5, y: 5, width: 40, height: 8, style: { fontSize: 16, fontWeight: '800', textAlign: 'center', fontFamily: 'Arial' } },
    { id: "el_prod", type: "text", content: "{{productName}}", x: 5, y: 15, width: 40, height: 8, style: { fontSize: 10, fontWeight: '600', textAlign: 'center', fontFamily: 'Arial' } },
    { id: "el_style", type: "text", content: "Style: {{style}}", x: 5, y: 25, width: 40, height: 5, style: { fontSize: 8, fontWeight: '400', textAlign: 'left', fontFamily: 'Arial' } },
    { id: "el_size_col", type: "text", content: "Size: {{size}}  |  Color: {{color}}", x: 5, y: 31, width: 40, height: 5, style: { fontSize: 8, fontWeight: '400', textAlign: 'left', fontFamily: 'Arial' } },
    { id: "el_mrp_label", type: "text", content: "MRP:", x: 5, y: 39, width: 12, height: 6, style: { fontSize: 10, fontWeight: '700', textAlign: 'left', fontFamily: 'Arial' } },
    { id: "el_mrp_val", type: "text", content: "{{currency}}{{mrp}}", x: 17, y: 38, width: 28, height: 8, style: { fontSize: 14, fontWeight: '800', textAlign: 'left', fontFamily: 'Arial' } },
    { id: "el_barcode", type: "barcode", content: "{{barcode}}", x: 5, y: 48, width: 40, height: 15, style: { barcodeType: 'CODE128', displayValue: true, fontSize: 10 } },
    { id: "el_mfg", type: "text", content: "Mfg by: {{manufacturer}}", x: 5, y: 66, width: 40, height: 4, style: { fontSize: 6, fontWeight: '400', textAlign: 'center', fontFamily: 'Arial', color: '#666666' } }
  ]
};

@Pipe({ name: 'resolveContent', standalone: true })
class ResolveContentPipe implements PipeTransform {
  transform(text: string, data: any, mapping?: any): string {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/\{\{(.*?)\}\}/g, (match: string, key: string) => {
      const cleanKey = key.trim();
      const mappedKey = (mapping && mapping[cleanKey]) ? mapping[cleanKey] : cleanKey;
      const value = mappedKey.split('.').reduce((o: any, i: string) => (o ? o[i] : null), data);
      return value !== null && value !== undefined ? String(value) : '';
    });
  }
}

@Pipe({ name: 'baseStyle', standalone: true })
class BaseStylePipe implements PipeTransform {
  transform(el: any): any {
    const style = el.style || {};
    let borderStyleObj = {};
    if (el.type === 'box' && (style.borderTopWidth !== undefined || style.borderRightWidth !== undefined || style.borderBottomWidth !== undefined || style.borderLeftWidth !== undefined)) {
      borderStyleObj = {
        borderTopWidth: `${style.borderTopWidth ?? style.borderWidth ?? 0}mm`,
        borderRightWidth: `${style.borderRightWidth ?? style.borderWidth ?? 0}mm`,
        borderBottomWidth: `${style.borderBottomWidth ?? style.borderWidth ?? 0}mm`,
        borderLeftWidth: `${style.borderLeftWidth ?? style.borderWidth ?? 0}mm`,
        borderStyle: style.borderStyle || 'solid',
        borderColor: style.borderColor || '#000'
      };
    } else {
      borderStyleObj = {
        borderWidth: `${style.borderWidth || 0}mm`,
        borderStyle: style.borderStyle || 'solid',
        borderColor: style.borderColor || '#000'
      };
    }

    return {
      width: '100%', height: '100%', fontFamily: style.fontFamily || 'sans-serif',
      fontSize: `${style.fontSize || 10}pt`, fontWeight: style.fontWeight || 'normal',
      color: style.color || '#000', backgroundColor: style.backgroundColor || 'transparent',
      textAlign: style.textAlign || 'left',
      ...borderStyleObj,
      borderRadius: `${style.borderRadius || 0}mm`, padding: `${style.padding || 0}mm`,
      overflow: style.overflow || 'hidden', whiteSpace: style.whiteSpace || 'normal',
      wordBreak: 'break-word', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
      justifyContent: style.verticalAlign === 'middle' ? 'center' : style.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
      alignItems: el.type === 'barcode' || el.type === 'icon' ? (style.textAlign === 'center' ? 'center' : style.textAlign === 'right' ? 'flex-end' : 'flex-start') : 'stretch'
    };
  }
}

@Pipe({ name: 'textStyle', standalone: true })
class TextStylePipe implements PipeTransform {
  transform(el: any): any {
    const style = el.style || {};
    let overflowStyles: any = {};
    if (style.textOverflowEnabled) {
      if (style.textOverflowType === 'multi') {
        overflowStyles = {
          display: '-webkit-box',
          '-webkit-line-clamp': (style.textOverflowLines || 2).toString(),
          '-webkit-box-orient': 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'normal'
        };
      } else {
        overflowStyles = {
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '100%'
        };
      }
    }
    return {
      letterSpacing: `${style.letterSpacing || 0}px`,
      lineHeight: style.lineHeight || 1.2,
      textTransform: style.textTransform || 'none',
      ...overflowStyles
    };
  }
}

@Pipe({ name: 'barcodeSrc', standalone: true })
class BarcodeSrcPipe implements PipeTransform {
  transform(content: string, style: any, isScriptsLoaded: boolean): string {
    if (!isScriptsLoaded || !(window as any).JsBarcode) return '';
    try {
      const canvas = document.createElement('canvas');
      (window as any).JsBarcode(canvas, content || '123456', {
        format: style.barcodeType || 'CODE128',
        width: 2, height: 40,
        displayValue: style.displayValue !== false,
        fontSize: style.fontSize || 12, margin: 0
      });
      return canvas.toDataURL('image/png');
    } catch (e) {
      return '';
    }
  }
}

@Pipe({ name: 'qrCodeSrc', standalone: true })
class QrCodeSrcPipe implements PipeTransform {
  transform(content: string, style: any, isScriptsLoaded: boolean): string {
    if (!isScriptsLoaded || !(window as any).QRCode) return '';
    try {
      const div = document.createElement('div');
      new (window as any).QRCode(div, {
        text: content || 'EMPTY',
        width: 512, height: 512,
        colorDark: style.color || '#000000',
        colorLight: style.backgroundColor || '#ffffff',
        correctLevel: (window as any).QRCode.CorrectLevel.H
      });
      const canvas = div.querySelector('canvas');
      return canvas ? canvas.toDataURL('image/png') : '';
    } catch (e) { return ''; }
  }
}


@Component({
  selector: 'app-barcode-label-generator',
  standalone: true,
  imports: [CommonModule, ResolveContentPipe, BaseStylePipe, TextStylePipe, BarcodeSrcPipe, QrCodeSrcPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './barcode-label-generator.component.html',
  styleUrls: ['./barcode-label-generator.component.css']
})
export class BarcodeLabelGeneratorComponent implements OnInit {

  sanitizer = inject(DomSanitizer);

  template = signal<any>(DEFAULT_TEMPLATE);
  sampleData = signal<any>(DEFAULT_SAMPLE_DATA);
  selectedId = signal<string | null>(null);
  zoom = signal<number>(3);
  viewMode = signal<'design' | 'preview'>('design');
  leftTab = signal<'elements' | 'layers' | 'data' | 'library'>('elements');
  isScriptsLoaded = signal<boolean>(false);
  isAiScanning = signal<boolean>(false);
  copyState = signal<'idle' | 'copied'>('idle');

  dataSource = signal<'sample' | 'excel'>('sample');
  excelData = signal<any[]>([]);
  uploadedFileName = signal<string>('');
  selectedExcelRow = signal<number>(0);
  fieldMapping = signal<Record<string, string>>({});

  savedLibrary = signal<any[]>([]);
  customFonts = signal<string[]>([]);
  fontFacesCss = signal<string>('');

  selectedElement = computed(() => this.template().elements.find((e: any) => e.id === this.selectedId()));
  sampleDataString = computed(() => JSON.stringify(this.sampleData(), null, 2));

  activePreviewData = computed(() => {
    if (this.dataSource() === 'excel' && this.excelData().length > 0) {
       return this.excelData()[this.selectedExcelRow()] || {};
    }
    return this.sampleData();
  });

  templateVariables = computed(() => {
    const keys = new Set<string>();
    const regex = /\{\{(.*?)\}\}/g;
    this.template().elements.forEach((el: any) => {
      let match;
      if (el.content && el.type === 'text') {
        while ((match = regex.exec(el.content)) !== null) {
          keys.add(match[1].trim());
        }
      }
    });
    return Array.from(keys);
  });

  dataFields = computed(() => {
    const data = this.dataSource() === 'excel' && this.excelData().length > 0 
      ? this.excelData()[0] 
      : this.sampleData();
    
    const getKeys = (obj: any, prefix = ''): string[] => {
      let keys: string[] = [];
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          keys = keys.concat(getKeys(obj[key], prefix + key + '.'));
        } else {
          keys.push(prefix + key);
        }
      }
      return keys;
    };
    return getKeys(data);
  });

  rulerTicksX = computed(() => {
    const w = this.template().width;
    const z = this.zoom();
    const ticks = [];
    for (let mm = 0; mm <= w; mm += 5) {
      const px = (mm * 3.779527559) * z;
      ticks.push({ val: mm, px, isMajor: mm % 10 === 0, isMedium: mm % 10 !== 0 });
    }
    return ticks;
  });

  rulerTicksY = computed(() => {
    const h = this.template().height;
    const z = this.zoom();
    const ticks = [];
    for (let mm = 0; mm <= h; mm += 5) {
      const px = (mm * 3.779527559) * z;
      ticks.push({ val: mm, px, isMajor: mm % 10 === 0, isMedium: mm % 10 !== 0 });
    }
    return ticks;
  });

  printSlots = computed(() => {
    const layout = this.template().pageLayout;
    const qty = Math.max(1, layout.printQuantity || 1);
    const startPos = Math.max(1, layout.startPosition || 1);
    const skipCount = startPos - 1;
    const cols = Math.max(1, layout.labelsPerRow || 1);
    const rows = Math.max(1, layout.labelsPerCol || 1);
    const labelsPerPage = cols * rows;
    
    const totalSlotsNeeded = skipCount + qty;
    const totalPages = Math.ceil(totalSlotsNeeded / labelsPerPage);
    const totalGridSlots = totalPages * labelsPerPage;
    
    const slots = [];
    const ds = this.dataSource();
    const excelArr = this.excelData();
    const sample = this.sampleData();

    for (let i = 0; i < totalGridSlots; i++) {
      if (i < skipCount || i >= skipCount + qty) {
        slots.push({ isEmpty: true, data: {} });
      } else {
        const dataIndex = i - skipCount;
        let data = sample;
        if (ds === 'excel' && excelArr.length > 0) {
           data = excelArr[dataIndex] || {};
        }
        slots.push({ isEmpty: false, data });
      }
    }
    return slots;
  });

  dragState = { active: false, id: '', action: 'move', handle: '', startX: 0, startY: 0, initialX: 0, initialY: 0, initialW: 0, initialH: 0 };

  ngOnInit() {
    Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'),
      loadScript('https://unpkg.com/tesseract.js@5/dist/tesseract.min.js'),
      loadScript('https://docs.opencv.org/4.8.0/opencv.js')
    ]).then(() => {
      this.isScriptsLoaded.set(true);
      const saved = localStorage.getItem('label_library');
      if (saved) {
        try { this.savedLibrary.set(JSON.parse(saved)); } catch(e) {}
      }
    }).catch(err => console.error(err));
  }

  saveToLibrary() {
    const t = this.template();
    const newItem = { id: `lib_${Date.now()}`, name: t.name || 'Untitled Label', width: t.width, height: t.height, template: JSON.parse(JSON.stringify(t)) };
    const updated = [newItem, ...this.savedLibrary()];
    this.savedLibrary.set(updated);
    localStorage.setItem('label_library', JSON.stringify(updated));
    alert('Label saved to library successfully!');
  }

  loadFromLibrary(item: any) {
    this.template.set(JSON.parse(JSON.stringify(item.template)));
    this.selectedId.set(null);
  }

  deleteFromLibrary(id: string) {
    const updated = this.savedLibrary().filter(x => x.id !== id);
    this.savedLibrary.set(updated);
    localStorage.setItem('label_library', JSON.stringify(updated));
  }

  onTtfUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const fontName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const cssRule = `@font-face { font-family: '${fontName}'; src: url('${base64}'); }\n`;
      this.fontFacesCss.update(css => css + cssRule);
      this.customFonts.update(fonts => [...fonts, fontName]);
      
      const styleEl = document.createElement('style');
      styleEl.innerHTML = cssRule;
      document.head.appendChild(styleEl);

      const sel = this.selectedElement();
      if (sel && sel.type === 'text') {
        this.updateElStyleDirect('fontFamily', fontName);
      }
    };
    reader.readAsDataURL(file);
  }

  async onAiSketchUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    const Tesseract = (window as any).Tesseract;
    const cv = (window as any).cv;
    if (!Tesseract) {
      alert('OCR Engine is still loading. Please try again in a moment.');
      return;
    }

    this.isAiScanning.set(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imgSrc = e.target?.result as string;
      try {
        let detectedBoxes: any[] = [];
        
        if (cv && cv.imread) {
          try {
            const imgElement = new Image();
            imgElement.src = imgSrc;
            await new Promise(res => { imgElement.onload = res; });
            const canvas = document.createElement('canvas');
            canvas.width = imgElement.width;
            canvas.height = imgElement.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(imgElement, 0, 0);
            
            const src = cv.imread(canvas);
            const gray = new cv.Mat();
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
            const blurred = new cv.Mat();
            cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
            const thresh = new cv.Mat();
            cv.adaptiveThreshold(blurred, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);
            
            const contours = new cv.MatVector();
            const hierarchy = new cv.Mat();
            cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
            
            for (let i = 0; i < contours.size(); ++i) {
              const cnt = contours.get(i);
              const rect = cv.boundingRect(cnt);
              if (rect.width > 30 && rect.height > 15 && rect.width < src.cols * 0.95 && rect.height < src.rows * 0.95) {
                detectedBoxes.push({
                  x: (rect.x / src.cols) * 50,
                  y: (rect.y / src.rows) * 75,
                  width: (rect.width / src.cols) * 50,
                  height: (rect.height / src.rows) * 75
                });
              }
              cnt.delete();
            }
            src.delete(); gray.delete(); blurred.delete(); thresh.delete(); contours.delete(); hierarchy.delete();
          } catch(cvErr) {
            console.warn('OpenCV pre-processing skipped, falling back to pure OCR text flow', cvErr);
          }
        }

        const worker = await Tesseract.createWorker('eng');
        const ret = await worker.recognize(imgSrc);
        await worker.terminate();

        const lines = ret.data.lines || [];
        let newElements: any[] = [];
        let labelW = 50;
        let labelH = 75;

        newElements.push({
          id: `el_box_${Date.now()}`, type: "box", x: 2, y: 2, width: labelW - 4, height: labelH - 4,
          style: { borderWidth: 0.5, borderStyle: 'solid', borderColor: '#000000', borderRadius: 2, backgroundColor: 'transparent', borderTopWidth: 0.5, borderRightWidth: 0.5, borderBottomWidth: 0.5, borderLeftWidth: 0.5 }
        });

        if (lines.length > 0) {
          let yCursor = 5;
          for (let i = 0; i < Math.min(lines.length, 7); i++) {
            const line = lines[i];
            const text = line.text ? line.text.trim() : '';
            if (!text) continue;

            let mappedKey = 'productName';
            const lower = text.toLowerCase();
            if (lower.includes('mrp') || lower.includes('price') || lower.includes('rs') || lower.includes('₹')) {
              mappedKey = 'mrp';
            } else if (lower.includes('style') || lower.includes('code')) {
              mappedKey = 'style';
            } else if (lower.includes('size')) {
              mappedKey = 'size';
            } else if (i === 0) {
              mappedKey = 'brand';
            }

            newElements.push({
              id: `el_ocr_${i}_${Date.now()}`,
              type: 'text',
              content: `{{${mappedKey}}}`,
              x: 5,
              y: yCursor,
              width: 40,
              height: 7,
              style: {
                fontSize: i === 0 ? 14 : 10,
                fontWeight: i === 0 ? 'bold' : 'normal',
                textAlign: i === 0 ? 'center' : 'left',
                fontFamily: 'Arial'
              }
            });
            yCursor += 9;
          }

          newElements.push({
            id: `el_ocr_bc_${Date.now()}`,
            type: 'barcode',
            content: '{{barcode}}',
            x: 5,
            y: Math.min(yCursor + 5, 52),
            width: 40,
            height: 14,
            style: { barcodeType: 'CODE128', displayValue: true, fontSize: 10 }
          });
        } else {
          newElements = DEFAULT_TEMPLATE.elements;
        }

        this.template.update(t => ({
          ...t,
          name: "Hybrid AI Scanned Label",
          width: labelW,
          height: labelH,
          elements: newElements,
          pageLayout: { ...t.pageLayout, pageWidth: labelW, pageHeight: labelH }
        }));
        this.selectedId.set(null);
        alert(`Hybrid AI Scan Successful! OpenCV detected structural contours and Tesseract OCR mapped your text items.`);
      } catch (err) {
        console.error(err);
        alert('AI scanning failed. Please try a clearer image.');
      } finally {
        this.isAiScanning.set(false);
        (event.target as HTMLInputElement).value = '';
      }
    };
    reader.readAsDataURL(file);
  }

  updateZoom(amount: number) { this.zoom.update(z => Math.max(0.5, Math.min(10, z + amount))); }
  
  exportJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.template(), null, 2));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `${this.template().name.replace(/\s+/g, '_')}.json`);
    dl.click();
  }

  generateLabelHtml(): string {
    const t = this.template();
    const l = t.pageLayout;
    const cols = Math.max(1, l.labelsPerRow || 1);
    const rows = Math.max(1, l.labelsPerCol || 1);
    
    const borderCss = l.showBorders ? 'border: 0.5px dashed #999;' : '';
    const watermarkCss = l.showWatermark ? 'background: #f8f9fa;' : '';

    let labelsHtml = '';
    const slots = this.printSlots();
    
    for (const slot of slots) {
      let innerElements = '';
      if (!slot.isEmpty) {
        for (const el of t.elements) {
          const style = el.style || {};
          const jc = style.verticalAlign === 'middle' ? 'center' : style.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start';
          const ai = el.type === 'barcode' || el.type === 'icon' ? (style.textAlign === 'center' ? 'center' : style.textAlign === 'right' ? 'flex-end' : 'flex-start') : 'stretch';

          const resolved = new ResolveContentPipe().transform(el.content, slot.data, this.fieldMapping());
          let contentHtml = '';

          if (el.type === 'text') {
            let overflowStyles = '';
            if (style.textOverflowEnabled) {
              if (style.textOverflowType === 'multi') {
                overflowStyles = `display: -webkit-box; -webkit-line-clamp: ${style.textOverflowLines || 2}; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; white-space: normal;`;
              } else {
                overflowStyles = `display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%;`;
              }
            }
            contentHtml = `<span style="letter-spacing: ${style.letterSpacing || 0}px; line-height: ${style.lineHeight || 1.2}; text-transform: ${style.textTransform || 'none'}; ${overflowStyles}">${resolved || 'Text Field'}</span>`;
          } else if (el.type === 'icon') {
            contentHtml = `<i class="${resolved}" style="font-size: ${style.fontSize || 14}pt; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;"></i>`;
          } else if (el.type === 'barcode') {
            const src = new BarcodeSrcPipe().transform(resolved, style, true);
            contentHtml = `<img src="${src}" style="width: 100%; height: 100%; object-fit: contain;" />`;
          } else if (el.type === 'qrcode') {
            const src = new QrCodeSrcPipe().transform(resolved, style, true);
            contentHtml = `<img src="${src}" style="width: 100%; height: 100%; object-fit: contain;" />`;
          } else if (el.type === 'image' && resolved) {
            contentHtml = `<img src="${resolved}" style="width: 100%; height: 100%; object-fit: ${style.objectFit || 'contain'};" />`;
          }

          let boxBorderCss = '';
          if (el.type === 'box' && (style.borderTopWidth !== undefined || style.borderRightWidth !== undefined || style.borderBottomWidth !== undefined || style.borderLeftWidth !== undefined)) {
            boxBorderCss = `
              border-top-width: ${style.borderTopWidth ?? style.borderWidth ?? 0}mm;
              border-right-width: ${style.borderRightWidth ?? style.borderWidth ?? 0}mm;
              border-bottom-width: ${style.borderBottomWidth ?? style.borderWidth ?? 0}mm;
              border-left-width: ${style.borderLeftWidth ?? style.borderWidth ?? 0}mm;
              border-style: ${style.borderStyle || 'solid'};
              border-color: ${style.borderColor || '#000'};
            `;
          } else {
            boxBorderCss = `border: ${style.borderWidth || 0}mm ${style.borderStyle || 'solid'} ${style.borderColor || '#000'};`;
          }

          const rot = el.style?.rotation ? `transform: rotate(${el.style.rotation}deg); transform-origin: center center;` : '';
          innerElements += `
            <div style="position: absolute; left: ${el.x}mm; top: ${el.y}mm; width: ${el.width}mm; height: ${el.height}mm; ${rot}">
              <div style="width: 100%; height: 100%; font-family: ${style.fontFamily || 'sans-serif'}; font-size: ${style.fontSize || 10}pt; font-weight: ${style.fontWeight || 'normal'}; color: ${style.color || '#000'}; background-color: ${style.backgroundColor || 'transparent'}; text-align: ${style.textAlign || 'left'}; ${boxBorderCss} border-radius: ${style.borderRadius || 0}mm; padding: ${style.padding || 0}mm; overflow: ${style.overflow || 'hidden'}; white-space: ${style.whiteSpace || 'normal'}; word-break: break-word; box-sizing: border-box; display: flex; flex-direction: column; justify-content: ${jc}; align-items: ${ai};">
                ${contentHtml}
              </div>
            </div>`;
        }
      }

      labelsHtml += `
        <div class="print-label ${slot.isEmpty ? 'empty' : ''}" style="position: relative; overflow: hidden; page-break-inside: avoid; width: ${t.width}mm; height: ${t.height}mm; box-sizing: border-box; ${borderCss} ${slot.isEmpty && l.showWatermark ? watermarkCss : ''}">
          ${slot.isEmpty && l.showWatermark ? '<div style="display: flex; align-items: center; justify-content: center; height: 100%; font-family: sans-serif; font-size: 10pt; color: #ccc;">EMPTY</div>' : innerElements}
        </div>`;
    }

    return `<!DOCTYPE html>
<html>
  <head>
    <title>${t.name}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <style>
      ${this.fontFacesCss()}
      @page { 
        size: ${l.pageWidth || 210}mm ${l.pageHeight || 297}mm; 
        margin: 0; 
      }
      html, body { 
        margin: 0 !important; 
        padding: 0 !important; 
        width: ${l.pageWidth || 210}mm !important;
        height: ${l.pageHeight || 297}mm !important;
        background: white; 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact; 
      }
      #print-container { 
        box-sizing: border-box;
        width: ${l.pageWidth || 210}mm;
        height: ${l.pageHeight || 297}mm;
        padding-left: ${l.marginLeft || 0}mm; 
        padding-top: ${l.marginTop || 0}mm; 
        display: grid;
        grid-template-columns: repeat(${cols}, ${t.width}mm);
        grid-template-rows: repeat(${rows}, ${t.height}mm);
        gap: ${l.verticalGap || 0}mm ${l.horizontalGap || 0}mm;
        align-content: start;
        justify-content: start;
      }
      .print-label {
        position: relative;
        overflow: hidden;
        page-break-inside: avoid;
        width: ${t.width}mm;
        height: ${t.height}mm;
        box-sizing: border-box;
      }
      * { box-sizing: border-box; }
    </style>
  </head>
  <body>
    <div id="print-container">
      ${labelsHtml}
    </div>
  </body>
</html>`;
  }

  copyHtmlCode() {
    const html = this.generateLabelHtml();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(html).then(() => {
        this.copyState.set('copied');
        setTimeout(() => this.copyState.set('idle'), 2000);
      }).catch(() => {
        this.fallbackCopyTextToClipboard(html);
      });
    } else {
      this.fallbackCopyTextToClipboard(html);
    }
  }

  fallbackCopyTextToClipboard(text: string) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        this.copyState.set('copied');
        setTimeout(() => this.copyState.set('idle'), 2000);
      }
    } catch (err) {}
    document.body.removeChild(textArea);
  }

  print() {
    const html = this.generateLabelHtml();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the labels.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    };
  }

  rotateLabel() {
    this.template.update(t => {
      const newCanvasW = t.height;
      const newCanvasH = t.width;
      
      const elements = t.elements.map((el: any) => {
        const cx = el.x + (el.width / 2);
        const cy = el.y + (el.height / 2);
        
        const newCx = t.height - cy;
        const newCy = cx;
        
        const newX = newCx - (el.width / 2);
        const newY = newCy - (el.height / 2);
        const newRot = ((el.style.rotation || 0) + 90) % 360;
        
        return {
          ...el,
          x: Number(newX.toFixed(2)), 
          y: Number(newY.toFixed(2)),
          style: { ...el.style, rotation: newRot }
        };
      });
      
      return {
        ...t,
        width: newCanvasW,
        height: newCanvasH,
        elements,
        pageLayout: {
          ...t.pageLayout,
          pageWidth: t.pageLayout.pageHeight,
          pageHeight: t.pageLayout.pageWidth,
          labelsPerRow: t.pageLayout.labelsPerCol,
          labelsPerCol: t.pageLayout.labelsPerRow,
          horizontalGap: t.pageLayout.verticalGap,
          verticalGap: t.pageLayout.horizontalGap
        }
      };
    });
  }

  updateTemplate(key: string, e: Event) {
    const val = (e.target as HTMLInputElement).value;
    const numVal = Number(val);
    
    this.template.update(t => {
      const next = { ...t, [key]: key === 'name' ? val : numVal };
      if ((key === 'width' || key === 'height') && t.pageLayout.labelsPerRow === 1 && t.pageLayout.labelsPerCol === 1) {
        next.pageLayout = { ...next.pageLayout, [key === 'width' ? 'pageWidth' : 'pageHeight']: numVal };
      }
      return next;
    });
  }

  updatePageLayoutDirect(key: string, val: number) {
    this.template.update(t => ({ ...t, pageLayout: { ...t.pageLayout, [key]: val } }));
  }

  updatePageLayout(key: string, e: Event) {
    let val = Number((e.target as HTMLInputElement).value);
    if (key === 'labelsPerRow' || key === 'labelsPerCol' || key === 'printQuantity' || key === 'startPosition') {
       val = Math.max(1, val);
    }
    
    this.template.update(t => {
      const next = { ...t, pageLayout: { ...t.pageLayout, [key]: val } };
      if ((key === 'labelsPerRow' || key === 'labelsPerCol') && next.pageLayout.labelsPerRow === 1 && next.pageLayout.labelsPerCol === 1) {
         next.pageLayout.pageWidth = t.width;
         next.pageLayout.pageHeight = t.height;
      }
      return next;
    });
  }

  updatePageLayoutCheckbox(key: string, e: Event) {
    const val = (e.target as HTMLInputElement).checked;
    this.template.update(t => ({ ...t, pageLayout: { ...t.pageLayout, [key]: val } }));
  }
  
  getPresetMode() {
    const l = this.template().pageLayout;
    if (l.labelsPerRow === 1 && l.labelsPerCol === 1) return '1x1';
    if (l.labelsPerRow === 2 && l.labelsPerCol === 1) return '2x1';
    if (l.pageWidth === 210 && l.pageHeight === 297) return 'a4';
    return 'custom';
  }

  onPresetChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    const l = this.template().pageLayout;
    
    if (val === '1x1') {
      this.template.update(t => ({ ...t, pageLayout: { ...l, labelsPerRow: 1, labelsPerCol: 1, pageWidth: t.width, pageHeight: t.height, horizontalGap: 0, verticalGap: 0, marginLeft: 0, marginTop: 0 } }));
    } else if (val === '2x1') {
      this.template.update(t => ({ ...t, pageLayout: { ...l, labelsPerRow: 2, labelsPerCol: 1, pageWidth: (t.width * 2) + 2, pageHeight: t.height, horizontalGap: 2, verticalGap: 0, marginLeft: 0, marginTop: 0 } }));
    } else if (val === 'a4') {
      this.template.update(t => ({ ...t, pageLayout: { ...l, labelsPerRow: 2, labelsPerCol: 3, pageWidth: 210, pageHeight: 297, horizontalGap: 5, verticalGap: 5, marginLeft: 10, marginTop: 10 } }));
    }
  }

  updateElProp(key: string, e: Event) {
    const id = this.selectedId();
    if (!id) return;
    const val = (e.target as HTMLInputElement).value;
    this.template.update(t => ({
      ...t, elements: t.elements.map((el: any) => el.id === id ? { ...el, [key]: key === 'content' ? val : Number(val) } : el)
    }));
  }

  updateElStyle(key: string, e: Event) {
    this.updateElStyleDirect(key, (e.target as HTMLInputElement).value);
  }
  
  updateElStyleCheckbox(key: string, e: Event) {
    this.updateElStyleDirect(key, (e.target as HTMLInputElement).checked);
  }

  updateElStyleDirect(key: string, val: any) {
    const id = this.selectedId();
    if (!id) return;
    this.template.update(t => ({
      ...t, elements: t.elements.map((el: any) => el.id === id ? { ...el, style: { ...el.style, [key]: typeof val === 'string' && !isNaN(Number(val)) && (key.includes('Size') || key.includes('Width')) ? Number(val) : val } } : el)
    }));
  }

  updateSampleData(e: Event) {
    try {
      this.sampleData.set(JSON.parse((e.target as HTMLTextAreaElement).value));
    } catch(err) {}
  }
  
  onFileUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadedFileName.set(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = (window as any).XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = (window as any).XLSX.utils.sheet_to_json(worksheet);
      
      this.excelData.set(json);
      this.selectedExcelRow.set(0);
      this.updatePageLayoutDirect('printQuantity', json.length);
    };
    reader.readAsArrayBuffer(file);
  }

  onAddImageUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const newEl = {
        id: `el_${Date.now()}`, type: 'image', x: 10, y: 10,
        width: 30, height: 30,
        content: base64,
        style: { objectFit: 'contain' }
      };
      this.template.update(t => ({ ...t, elements: [...t.elements, newEl] }));
      this.selectedId.set(newEl.id);
    };
    reader.readAsDataURL(file);
    (event.target as HTMLInputElement).value = '';
  }

  updatePreviewRow(e: Event) {
    const val = Number((e.target as HTMLInputElement).value) - 1;
    this.selectedExcelRow.set(Math.max(0, Math.min(this.excelData().length - 1, val)));
  }

  updateMapping(varName: string, e: Event) {
    const fieldName = (e.target as HTMLSelectElement).value;
    this.fieldMapping.update(m => ({ ...m, [varName]: fieldName }));
  }

  addElement(type: string) {
    const newEl = {
      id: `el_${Date.now()}`, type, x: 10, y: 10,
      width: type === 'box' ? 40 : 30, height: type === 'text' ? 10 : (type === 'barcode' ? 15 : 30),
      content: type === 'text' ? 'New Text' : (type === 'barcode' ? '12345678' : ''),
      style: { fontSize: 10, fontFamily: 'Arial', color: '#000000', textAlign: 'left', barcodeType: 'CODE128', displayValue: true, borderTopWidth: 0.5, borderRightWidth: 0.5, borderBottomWidth: 0.5, borderLeftWidth: 0.5 }
    };
    this.template.update(t => ({ ...t, elements: [...t.elements, newEl] }));
    this.selectedId.set(newEl.id);
  }

  addIcon(iconClass: string) {
    const newEl = {
      id: `el_${Date.now()}`, type: 'icon', x: 10, y: 10,
      width: 10, height: 10,
      content: iconClass,
      style: { color: '#000000', fontSize: 14 }
    };
    this.template.update(t => ({ ...t, elements: [...t.elements, newEl] }));
    this.selectedId.set(newEl.id);
  }

  duplicateElement() {
    const el = this.selectedElement();
    if (!el) return;
    const newEl = { ...el, id: `el_${Date.now()}`, x: el.x + 2, y: el.y + 2 };
    this.template.update(t => ({ ...t, elements: [...t.elements, newEl] }));
    this.selectedId.set(newEl.id);
  }

  deleteElement() {
    const id = this.selectedId();
    if (!id) return;
    this.template.update(t => ({ ...t, elements: t.elements.filter((e: any) => e.id !== id) }));
    this.selectedId.set(null);
  }

  moveLayer(index: number, direction: number) {
    const arr = [...this.template().elements];
    if ((direction === -1 && index === 0) || (direction === 1 && index === arr.length - 1)) return;
    const targetIndex = index + direction;
    [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
    this.template.update(t => ({ ...t, elements: arr }));
  }

  onMouseDown(e: MouseEvent, id: string, action: 'move' | 'resize', handle: string = '') {
    if (this.viewMode() !== 'design') return;
    e.stopPropagation();
    e.preventDefault();

    this.selectedId.set(id);
    const el = this.template().elements.find((x: any) => x.id === id);
    if (!el) return;

    this.dragState = { active: true, id, action, handle, startX: e.clientX, startY: e.clientY, initialX: el.x, initialY: el.y, initialW: el.width, initialH: el.height };
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    if (!this.dragState.active) return;
    const state = this.dragState;

    const dx_px = e.clientX - state.startX;
    const dy_px = e.clientY - state.startY;
    const zoom = this.zoom();
    const dx_mm = (dx_px / zoom) / 3.779527559;
    const dy_mm = (dy_px / zoom) / 3.779527559;
    const snap = e.shiftKey ? 1 : 0.1;

    if (state.action === 'move') {
      const newX = Math.round((state.initialX + dx_mm) / snap) * snap;
      const newY = Math.round((state.initialY + dy_mm) / snap) * snap;
      this.template.update(t => ({ ...t, elements: t.elements.map((el: any) => el.id === state.id ? { ...el, x: newX, y: newY } : el) }));
    } else if (state.action === 'resize') {
      const el = this.template().elements.find((x: any) => x.id === state.id);
      const rot = el?.style?.rotation || 0;
      
      let rdx = dx_mm;
      let rdy = dy_mm;
      if (rot === 90) { rdx = dy_mm; rdy = -dx_mm; }
      else if (rot === 180) { rdx = -dx_mm; rdy = -dy_mm; }
      else if (rot === 270) { rdx = -dy_mm; rdy = dx_mm; }

      let newW = state.initialW;
      let newH = state.initialH;
      if (state.handle.includes('e')) newW = Math.max(1, Math.round((state.initialW + rdx) / snap) * snap);
      if (state.handle.includes('s')) newH = Math.max(1, Math.round((state.initialH + rdy) / snap) * snap);
      this.template.update(t => ({ ...t, elements: t.elements.map((el: any) => el.id === state.id ? { ...el, width: newW, height: newH } : el) }));
    }
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    this.dragState.active = false;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (!this.selectedId() || this.viewMode() !== 'design') return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

    const step = e.shiftKey ? 10 : 0.5;
    const el = this.selectedElement();
    if (!el) return;

    switch(e.key) {
      case 'ArrowUp': this.template.update(t => ({ ...t, elements: t.elements.map((x: any) => x.id === el.id ? { ...x, y: Math.max(0, el.y - step) } : x) })); e.preventDefault(); break;
      case 'ArrowDown': this.template.update(t => ({ ...t, elements: t.elements.map((x: any) => x.id === el.id ? { ...x, y: el.y + step } : x) })); e.preventDefault(); break;
      case 'ArrowLeft': this.template.update(t => ({ ...t, elements: t.elements.map((x: any) => x.id === el.id ? { ...x, x: el.x - step } : x) })); e.preventDefault(); break;
      case 'ArrowRight': this.template.update(t => ({ ...t, elements: t.elements.map((x: any) => x.id === el.id ? { ...x, x: el.x + step } : x) })); e.preventDefault(); break;
      case 'Delete': case 'Backspace': this.deleteElement(); e.preventDefault(); break;
    }
  }

}













