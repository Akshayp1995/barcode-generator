import { Component, ChangeDetectionStrategy, signal, computed, effect, HostListener, ElementRef, OnInit, inject, Pipe, PipeTransform } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
  width: 40,
  height: 60,
  canvasRotation: 0,
  unit: "mm",
  pageLayout: { 
    labelsPerRow: 1, labelsPerCol: 1, 
    horizontalGap: 0, verticalGap: 0, 
    pageWidth: 40, pageHeight: 60, 
    marginTop: 0, marginLeft: 0, 
    printQuantity: 1, startPosition: 1,
    showBorders: false, showWatermark: false
  },
  elements: [
    { id: "el_box1", type: "box", x: 1, y: 1, width: 38, height: 58, style: { borderWidth: 0.5, borderStyle: 'solid', borderColor: '#000000', borderRadius: 2, borderTopLeftRadius: 2, borderTopRightRadius: 2, borderBottomRightRadius: 2, borderBottomLeftRadius: 2, backgroundColor: 'transparent', borderTopWidth: 0.5, borderRightWidth: 0.5, borderBottomWidth: 0.5, borderLeftWidth: 0.5, rotation: 0 } },
    { id: "el_brand", type: "text", content: "{{brand}}", x: 4, y: 3, width: 32, height: 7, style: { fontSize: 14, fontWeight: '800', textAlign: 'center', fontFamily: 'Arial', rotation: 0 } },
    { id: "el_prod", type: "text", content: "{{productName}}", x: 4, y: 11, width: 32, height: 7, style: { fontSize: 9, fontWeight: '600', textAlign: 'center', fontFamily: 'Arial', rotation: 0 } },
    { id: "el_style", type: "text", content: "Style: {{style}}", x: 4, y: 19, width: 32, height: 5, style: { fontSize: 7, fontWeight: '400', textAlign: 'left', fontFamily: 'Arial', rotation: 0 } },
    { id: "el_size_col", type: "text", content: "Size: {{size}}  |  Color: {{color}}", x: 4, y: 24, width: 32, height: 5, style: { fontSize: 7, fontWeight: '400', textAlign: 'left', fontFamily: 'Arial', rotation: 0 } },
    { id: "el_mrp_label", type: "text", content: "MRP:", x: 4, y: 31, width: 10, height: 5, style: { fontSize: 9, fontWeight: '700', textAlign: 'left', fontFamily: 'Arial', rotation: 0 } },
    { id: "el_mrp_val", type: "text", content: "{{currency}}{{mrp}}", x: 14, y: 30, width: 22, height: 7, style: { fontSize: 12, fontWeight: '800', textAlign: 'left', fontFamily: 'Arial', rotation: 0 } },
    { id: "el_barcode", type: "barcode", content: "{{barcode}}", x: 4, y: 38, width: 32, height: 12, style: { barcodeType: 'CODE128', displayValue: true, fontSize: 9, rotation: 0 } },
    { id: "el_mfg", type: "text", content: "Mfg by: {{manufacturer}}", x: 4, y: 52, width: 32, height: 3, style: { fontSize: 5, fontWeight: '400', textAlign: 'center', fontFamily: 'Arial', color: '#666666', rotation: 0 } }
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
    
    const bw = style.borderWidth ?? 0;
    const btw = style.borderTopWidth ?? bw;
    const brw = style.borderRightWidth ?? bw;
    const bbw = style.borderBottomWidth ?? bw;
    const blw = style.borderLeftWidth ?? bw;

    let borderStyleObj = {
      borderTopWidth: `${btw}mm`,
      borderRightWidth: `${brw}mm`,
      borderBottomWidth: `${bbw}mm`,
      borderLeftWidth: `${blw}mm`,
      borderStyle: style.borderStyle || 'solid',
      borderColor: style.borderColor || '#000'
    };

    const rtl = style.borderTopLeftRadius ?? style.borderRadius ?? 0;
    const rtr = style.borderTopRightRadius ?? style.borderRadius ?? 0;
    const rbr = style.borderBottomRightRadius ?? style.borderRadius ?? 0;
    const rbl = style.borderBottomLeftRadius ?? style.borderRadius ?? 0;

    const pt = style.paddingTop ?? style.padding ?? 0;
    const pr = style.paddingRight ?? style.padding ?? 0;
    const pb = style.paddingBottom ?? style.padding ?? 0;
    const pl = style.paddingLeft ?? style.padding ?? 0;

    return {
      width: '100%', height: '100%', fontFamily: style.fontFamily || 'sans-serif',
      fontSize: `${style.fontSize || 10}pt`, fontWeight: style.fontWeight || 'normal',
      color: style.color || '#000', backgroundColor: style.backgroundColor || 'transparent',
      textAlign: style.textAlign || 'left',
      ...borderStyleObj,
      borderTopLeftRadius: `${rtl}mm`,
      borderTopRightRadius: `${rtr}mm`,
      borderBottomRightRadius: `${rbr}mm`,
      borderBottomLeftRadius: `${rbl}mm`,
      paddingTop: `${pt}mm`,
      paddingRight: `${pr}mm`,
      paddingBottom: `${pb}mm`,
      paddingLeft: `${pl}mm`,
      overflow: style.overflow || 'hidden', whiteSpace: style.whiteSpace || 'normal',
      wordBreak: 'break-word', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
      justifyContent: style.verticalAlign === 'middle' ? 'center' : style.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
      alignItems: el.type === 'barcode' || el.type === 'icon' || el.type === 'qrcode' ? (style.textAlign === 'center' ? 'center' : style.textAlign === 'right' ? 'flex-end' : 'flex-start') : 'stretch',
      pointerEvents: 'auto'
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
  selector: 'app-hybrid-label-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, ResolveContentPipe, BaseStylePipe, TextStylePipe, BarcodeSrcPipe, QrCodeSrcPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hybrid-label-generator.component.html',
  styleUrls: ['./hybrid-label-generator.component.css']
})
export class HybridLabelGeneratorComponent implements OnInit {
  sanitizer = inject(DomSanitizer);

  template = signal<any>(DEFAULT_TEMPLATE);
  sampleData = signal<any>(DEFAULT_SAMPLE_DATA);
  selectedIds = signal<string[]>([]);
  zoom = signal<number>(3);
  viewMode = signal<'design' | 'preview'>('design');
  leftTab = signal<'elements' | 'layers' | 'data' | 'library' | 'ai'>('elements');
  isScriptsLoaded = signal<boolean>(false);
  copyState = signal<'idle' | 'copied'>('idle');

  aiPrompt = signal<string>('');
  isGeneratingAi = signal<boolean>(false);
  sketchImageBase64 = signal<string>('');
  sketchFileName = signal<string>('');

  accordionOpen = signal<{ padding: boolean; radius: boolean; borderWidth: boolean }>({ padding: false, radius: false, borderWidth: false });

  dataSource = signal<'sample' | 'excel'>('sample');
  excelData = signal<any[]>([]);
  uploadedFileName = signal<string>('');
  selectedExcelRow = signal<number>(0);
  fieldMapping = signal<Record<string, string>>({});

  savedLibrary = signal<any[]>([]);
  customFonts = signal<string[]>([]);
  fontFacesCss = signal<string>('');

  selectedElement = computed(() => {
    const ids = this.selectedIds();
    if (ids.length === 1) {
      return this.template().elements.find((e: any) => e.id === ids[0]);
    }
    return null;
  });

  hasTextOrCompatibleSelected = computed(() => {
    const ids = this.selectedIds();
    if (ids.length === 0) return false;
    return this.template().elements.some((e: any) => ids.includes(e.id) && e.type !== 'box');
  });

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

  printPages = computed(() => {
    const slots = this.printSlots();
    const layout = this.template().pageLayout;
    const cols = Math.max(1, layout.labelsPerRow || 1);
    const rows = Math.max(1, layout.labelsPerCol || 1);
    const labelsPerPage = cols * rows;
    
    const pages = [];
    for (let i = 0; i < slots.length; i += labelsPerPage) {
      pages.push(slots.slice(i, i + labelsPerPage));
    }
    return pages;
  });

  dragState = { active: false, id: '', action: 'move', handle: '', startX: 0, startY: 0, initialX: 0, initialY: 0, initialW: 0, initialH: 0 };

  ngOnInit() {
    Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js')
    ]).then(() => {
      this.isScriptsLoaded.set(true);
      const saved = localStorage.getItem('label_library');
      if (saved) {
        try { this.savedLibrary.set(JSON.parse(saved)); } catch(e) {}
      }
    }).catch(err => console.error(err));
  }

  toggleAccordion(section: 'padding' | 'radius' | 'borderWidth') {
    this.accordionOpen.update(state => ({ ...state, [section]: !state[section] }));
  }

  getBatchPropValue(key: string, fallback: any): any {
    const ids = this.selectedIds();
    if (ids.length === 0) return fallback;
    const el = this.template().elements.find((e: any) => e.id === ids[0]);
    if (!el || !el.style) return fallback;
    return el.style[key] ?? fallback;
  }

  batchUpdateStyle(key: string, e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.batchUpdateStyleDirect(key, val);
  }

  batchUpdateStyleDirect(key: string, val: any) {
    const ids = this.selectedIds();
    if (ids.length === 0) return;
    const numericVal = typeof val === 'string' && !isNaN(Number(val)) && (key.includes('Size') || key.includes('Width') || key.includes('Radius') || key.includes('padding') || key.includes('Padding')) ? Number(val) : val;

    this.template.update(t => ({
      ...t,
      elements: t.elements.map((el: any) => ids.includes(el.id) ? {
        ...el,
        style: { ...el.style, [key]: numericVal }
      } : el)
    }));
  }

  setAllBatchPadding(e: Event) {
    const val = Number((e.target as HTMLInputElement).value) || 0;
    const ids = this.selectedIds();
    if (ids.length === 0) return;
    this.template.update(t => ({
      ...t,
      elements: t.elements.map((el: any) => ids.includes(el.id) ? {
        ...el, style: { ...el.style, padding: val, paddingTop: val, paddingRight: val, paddingBottom: val, paddingLeft: val }
      } : el)
    }));
  }

  setAllBatchRadius(e: Event) {
    const val = Number((e.target as HTMLInputElement).value) || 0;
    const ids = this.selectedIds();
    if (ids.length === 0) return;
    this.template.update(t => ({
      ...t,
      elements: t.elements.map((el: any) => ids.includes(el.id) ? {
        ...el, style: { ...el.style, borderRadius: val, borderTopLeftRadius: val, borderTopRightRadius: val, borderBottomRightRadius: val, borderBottomLeftRadius: val }
      } : el)
    }));
  }

  setAllBatchBorderWidth(e: Event) {
    const val = Number((e.target as HTMLInputElement).value) || 0;
    const ids = this.selectedIds();
    if (ids.length === 0) return;
    this.template.update(t => ({
      ...t,
      elements: t.elements.map((el: any) => ids.includes(el.id) ? {
        ...el, style: { ...el.style, borderWidth: val, borderTopWidth: val, borderRightWidth: val, borderBottomWidth: val, borderLeftWidth: val }
      } : el)
    }));
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
    this.selectedIds.set([]);
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

      this.batchUpdateStyleDirect('fontFamily', fontName);
    };
    reader.readAsDataURL(file);
  }

  onSketchImageUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.sketchFileName.set(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      this.sketchImageBase64.set(base64);
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

  async generateAiLabel() {
    const prompt = this.aiPrompt();
    const sketchImg = this.sketchImageBase64();
    if (!prompt.trim() && !sketchImg) {
      alert('Please enter a description or upload a sketch image.');
      return;
    }

    this.isGeneratingAi.set(true);
    try {
      const apiKey = "";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
      
      let userParts: any[] = [{ text: `Analyze this prompt/sketch and return ONLY a valid JSON object representing a label design: {"name": "...", "width": 40, "height": 60, "elements": [{"id": "el_1", "type": "text|barcode|qrcode|box", "x": 1, "y": 1, "width": 38, "height": 58, "content": "...", "style": {"fontSize": 12, "fontWeight": "bold", "textAlign": "center"}}]}. Prompt description: ${prompt}` }];
      
      if (sketchImg) {
        const base64Data = sketchImg.split(',')[1];
        const mimeType = sketchImg.split(';')[0].replace('data:', '');
        userParts.push({
          inlineData: { mimeType, data: base64Data }
        });
      }

      const payload = {
        contents: [{ role: 'user', parts: userParts }],
        generationConfig: { responseMimeType: "application/json" }
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.elements && Array.isArray(parsed.elements)) {
          this.template.update(t => ({
            ...t,
            name: parsed.name || 'AI Custom Label',
            width: parsed.width || t.width,
            height: parsed.height || t.height,
            elements: parsed.elements
          }));
          this.selectedIds.set([]);
          this.aiPrompt.set('');
          this.sketchImageBase64.set('');
          this.sketchFileName.set('');
          alert('AI Label generated successfully!');
        }
      }
    } catch (e) {
      alert('Failed to generate AI label. Please try again.');
    } finally {
      this.isGeneratingAi.set(false);
    }
  }

  generateLabelHtml(): string {
    const t = this.template();
    const l = t.pageLayout;
    const cols = Math.max(1, l.labelsPerRow || 1);
    const rows = Math.max(1, l.labelsPerCol || 1);
    const labelsPerPage = cols * rows;
    
    const borderCss = l.showBorders ? 'border: 0.5px dashed #999;' : '';
    const watermarkCss = l.showWatermark ? 'background: #f8f9fa;' : '';

    let pagesHtml = '';
    const slots = this.printSlots();
    
    for (let p = 0; p < slots.length; p += labelsPerPage) {
      const pageSlots = slots.slice(p, p + labelsPerPage);
      let gridHtml = '';
      
      for (const slot of pageSlots) {
        let innerElements = '';
        if (!slot.isEmpty) {
          for (const el of t.elements) {
            const style = el.style || {};
            const jc = style.verticalAlign === 'middle' ? 'center' : style.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start';
            const ai = el.type === 'barcode' || el.type === 'icon' || el.type === 'qrcode' ? (style.textAlign === 'center' ? 'center' : style.textAlign === 'right' ? 'flex-end' : 'flex-start') : 'stretch';

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

            const bw = style.borderWidth ?? 0;
            const btw = style.borderTopWidth ?? bw;
            const brw = style.borderRightWidth ?? bw;
            const bbw = style.borderBottomWidth ?? bw;
            const blw = style.borderLeftWidth ?? bw;

            let boxBorderCss = `
              border-top-width: ${btw}mm;
              border-right-width: ${brw}mm;
              border-bottom-width: ${bbw}mm;
              border-left-width: ${blw}mm;
              border-style: ${style.borderStyle || 'solid'};
              border-color: ${style.borderColor || '#000'};
            `;

            const rtl = style.borderTopLeftRadius ?? style.borderRadius ?? 0;
            const rtr = style.borderTopRightRadius ?? style.borderRadius ?? 0;
            const rbr = style.borderBottomRightRadius ?? style.borderRadius ?? 0;
            const rbl = style.borderBottomLeftRadius ?? style.borderRadius ?? 0;

            const pt = style.paddingTop ?? style.padding ?? 0;
            const pr = style.paddingRight ?? style.padding ?? 0;
            const pb = style.paddingBottom ?? style.padding ?? 0;
            const pl = style.paddingLeft ?? style.padding ?? 0;

            const rotEl = el.style?.rotation ? `transform: rotate(${el.style.rotation}deg); transform-origin: center center;` : '';
            const boxZ = el.type === 'box' ? 'z-index: 2;' : 'z-index: 10;';
            innerElements += `
              <div style="position: absolute; left: ${el.x}mm; top: ${el.y}mm; width: ${el.width}mm; height: ${el.height}mm; ${rotEl} ${boxZ}">
                <div style="width: 100%; height: 100%; font-family: ${style.fontFamily || 'sans-serif'}; font-size: ${style.fontSize || 10}pt; font-weight: ${style.fontWeight || 'normal'}; color: ${style.color || '#000'}; background-color: ${style.backgroundColor || 'transparent'}; text-align: ${style.textAlign || 'left'}; ${boxBorderCss} border-top-left-radius: ${rtl}mm; border-top-right-radius: ${rtr}mm; border-bottom-right-radius: ${rbr}mm; border-bottom-left-radius: ${rbl}mm; padding-top: ${pt}mm; padding-right: ${pr}mm; padding-bottom: ${pb}mm; padding-left: ${pl}mm; overflow: ${style.overflow || 'hidden'}; white-space: ${style.whiteSpace || 'normal'}; word-break: break-word; box-sizing: border-box; display: flex; flex-direction: column; justify-content: ${jc}; align-items: ${ai};">
                  ${contentHtml}
                </div>
              </div>`;
          }
        }

        const rotLayer = t.canvasRotation || 0;
        const innerW = rotLayer % 180 === 90 ? t.height : t.width;
        const innerH = rotLayer % 180 === 90 ? t.width : t.height;

        const wrappedInner = `
          <div style="width: ${innerW}mm; height: ${innerH}mm; transform: rotate(${rotLayer}deg); transform-origin: center center; position: relative; box-sizing: border-box; flex-shrink: 0;">
            ${innerElements}
          </div>
        `;

        gridHtml += `
          <div class="print-label ${slot.isEmpty ? 'empty' : ''}" style="display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; page-break-inside: avoid; break-inside: avoid; width: ${t.width}mm; height: ${t.height}mm; box-sizing: border-box; ${borderCss} ${slot.isEmpty && l.showWatermark ? watermarkCss : ''}">
            ${slot.isEmpty && l.showWatermark ? '<div style="display: flex; align-items: center; justify-content: center; height: 100%; font-family: sans-serif; font-size: 10pt; color: #ccc;">EMPTY</div>' : wrappedInner}
          </div>`;
      }
      
      pagesHtml += `<div class="print-page">${gridHtml}</div>`;
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
        background: white; 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact; 
      }
      .print-page { 
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
        page-break-after: always;
        break-after: page;
      }
      .print-label {
        position: relative;
        overflow: hidden;
        page-break-inside: avoid;
        break-inside: avoid;
        box-sizing: border-box;
      }
      * { box-sizing: border-box; }
    </style>
  </head>
  <body>
    ${pagesHtml}
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
      const oldWidth = Number(t.width);
      const oldHeight = Number(t.height);
      const pageLayout = t.pageLayout;

      return {
        ...t,
        width: oldHeight,
        height: oldWidth,
        canvasRotation: ((Number(t.canvasRotation) || 0) + 90) % 360,
        elements: t.elements,
        pageLayout: {
          ...pageLayout,
          pageWidth: pageLayout.pageHeight || oldHeight,
          pageHeight: pageLayout.pageWidth || oldWidth,
          labelsPerRow: pageLayout.labelsPerCol,
          labelsPerCol: pageLayout.labelsPerRow,
          horizontalGap: pageLayout.verticalGap,
          verticalGap: pageLayout.horizontalGap
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
    const ids = this.selectedIds();
    if (ids.length !== 1) return;
    const id = ids[0];
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
    const ids = this.selectedIds();
    if (ids.length !== 1) return;
    const id = ids[0];
    this.template.update(t => ({
      ...t, elements: t.elements.map((el: any) => el.id === id ? { ...el, style: { ...el.style, [key]: typeof val === 'string' && !isNaN(Number(val)) && (key.includes('Size') || key.includes('Width') || key.includes('Radius') || key.includes('padding') || key.includes('Padding')) ? Number(val) : val } } : el)
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
        style: { objectFit: 'contain', rotation: 0 }
      };
      this.template.update(t => ({ ...t, elements: [...t.elements, newEl] }));
      this.selectedIds.set([newEl.id]);
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
      width: type === 'box' ? 38 : 30, height: type === 'box' ? 58 : (type === 'text' ? 10 : (type === 'barcode' ? 15 : 30)),
      content: type === 'text' ? 'New Text' : (type === 'barcode' ? '12345678' : ''),
      style: { fontSize: 10, fontFamily: 'Arial', color: '#000000', textAlign: 'left', barcodeType: 'CODE128', displayValue: true, borderTopWidth: 0.5, borderRightWidth: 0.5, borderBottomWidth: 0.5, borderLeftWidth: 0.5, rotation: 0 }
    };
    this.template.update(t => ({ ...t, elements: type === 'box' ? [newEl, ...t.elements] : [...t.elements, newEl] }));
    this.selectedIds.set([newEl.id]);
  }

  addIcon(iconClass: string) {
    const newEl = {
      id: `el_${Date.now()}`, type: 'icon', x: 10, y: 10,
      width: 10, height: 10,
      content: iconClass,
      style: { color: '#000000', fontSize: 14, rotation: 0 }
    };
    this.template.update(t => ({ ...t, elements: [...t.elements, newEl] }));
    this.selectedIds.set([newEl.id]);
  }

  duplicateElement() {
    const ids = this.selectedIds();
    if (ids.length !== 1) return;
    const el = this.template().elements.find((x: any) => x.id === ids[0]);
    if (!el) return;
    const newEl = { ...el, id: `el_${Date.now()}`, x: el.x + 2, y: el.y + 2 };
    this.template.update(t => ({ ...t, elements: [...t.elements, newEl] }));
    this.selectedIds.set([newEl.id]);
  }

  deleteSelectedElements() {
    const ids = this.selectedIds();
    if (ids.length === 0) return;
    this.template.update(t => ({ ...t, elements: t.elements.filter((e: any) => !ids.includes(e.id)) }));
    this.selectedIds.set([]);
  }

  moveLayer(index: number, direction: number) {
    const arr = [...this.template().elements];
    if ((direction === -1 && index === 0) || (direction === 1 && index === arr.length - 1)) return;
    const targetIndex = index + direction;
    [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
    this.template.update(t => ({ ...t, elements: arr }));
  }

  selectLayerItem(e: MouseEvent, id: string) {
    if (e.shiftKey) {
      const current = this.selectedIds();
      if (current.includes(id)) {
        this.selectedIds.set(current.filter(x => x !== id));
      } else {
        this.selectedIds.set([...current, id]);
      }
    } else {
      this.selectedIds.set([id]);
    }
  }

  onElementMouseDown(e: MouseEvent, id: string) {
    if (this.viewMode() !== 'design') return;
    e.stopPropagation();

    const currentSelected = this.selectedIds();
    if (e.shiftKey) {
      if (currentSelected.includes(id)) {
        this.selectedIds.set(currentSelected.filter(x => x !== id));
      } else {
        this.selectedIds.set([...currentSelected, id]);
      }
    } else {
      if (!currentSelected.includes(id)) {
        this.selectedIds.set([id]);
      }
    }

    const el = this.template().elements.find((x: any) => x.id === id);
    if (!el) return;

    this.dragState = { active: true, id, action: 'move', handle: '', startX: e.clientX, startY: e.clientY, initialX: el.x, initialY: el.y, initialW: el.width, initialH: el.height };
  }

  onResizeMouseDown(e: MouseEvent, id: string, handle: string) {
    if (this.viewMode() !== 'design') return;
    e.stopPropagation();
    e.preventDefault();

    this.selectedIds.set([id]);
    const el = this.template().elements.find((x: any) => x.id === id);
    if (!el) return;

    this.dragState = { active: true, id, action: 'resize', handle, startX: e.clientX, startY: e.clientY, initialX: el.x, initialY: el.y, initialW: el.width, initialH: el.height };
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

    const layerRot = this.template().canvasRotation || 0;
    let localDx = dx_mm;
    let localDy = dy_mm;

    if (layerRot === 90) {
      localDx = dy_mm;
      localDy = -dx_mm;
    } else if (layerRot === 180) {
      localDx = -dx_mm;
      localDy = -dy_mm;
    } else if (layerRot === 270) {
      localDx = -dy_mm;
      localDy = dx_mm;
    }

    if (state.action === 'move') {
      const activeIds = this.selectedIds();
      const primaryEl = this.template().elements.find((x: any) => x.id === state.id);
      if (!primaryEl) return;

      const newX = Math.round((state.initialX + localDx) / snap) * snap;
      const newY = Math.round((state.initialY + localDy) / snap) * snap;
      const deltaX = newX - state.initialX;
      const deltaY = newY - state.initialY;

      this.template.update(t => ({
        ...t,
        elements: t.elements.map((el: any) => {
          if (activeIds.includes(el.id)) {
            return {
              ...el,
              x: Number((el.x + (el.id === state.id ? deltaX - (el.x - state.initialX) : deltaX)).toFixed(2)),
              y: Number((el.y + (el.id === state.id ? deltaY - (el.y - state.initialY) : deltaY)).toFixed(2))
            };
          }
          return el;
        })
      }));
    } else if (state.action === 'resize') {
      const el = this.template().elements.find((x: any) => x.id === state.id);
      const totalRot = (layerRot + (el?.style?.rotation || 0)) % 360;
      
      let rdx = dx_mm;
      let rdy = dy_mm;
      if (totalRot === 90) { rdx = dy_mm; rdy = -dx_mm; }
      else if (totalRot === 180) { rdx = -dx_mm; rdy = -dy_mm; }
      else if (totalRot === 270) { rdx = -dy_mm; rdy = dx_mm; }

      let newW = state.initialW;
      let newH = state.initialH;
      if (state.handle.includes('e')) newW = Math.max(1, Math.round((state.initialW + rdx) / snap) * snap);
      if (state.handle.includes('s')) newH = Math.max(1, Math.round((state.initialH + rdy) / snap) * snap);
      this.template.update(t => ({ ...t, elements: t.elements.map((x: any) => x.id === state.id ? { ...x, width: newW, height: newH } : x) }));
    }
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    this.dragState.active = false;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (this.selectedIds().length === 0 || this.viewMode() !== 'design') return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

    const step = e.shiftKey ? 10 : 0.5;
    const activeIds = this.selectedIds();

    let dx = 0, dy = 0;
    switch(e.key) {
      case 'ArrowUp': dy = -step; e.preventDefault(); break;
      case 'ArrowDown': dy = step; e.preventDefault(); break;
      case 'ArrowLeft': dx = -step; e.preventDefault(); break;
      case 'ArrowRight': dx = step; e.preventDefault(); break;
      case 'Delete': case 'Backspace': 
        this.deleteSelectedElements(); 
        e.preventDefault(); return;
      default: return;
    }

    if (dx !== 0 || dy !== 0) {
      const rot = this.template().canvasRotation || 0;
      let localDx = dx;
      let localDy = dy;

      if (rot === 90) {
        localDx = dy;
        localDy = -dx;
      } else if (rot === 180) {
        localDx = -dx;
        localDy = -dy;
      } else if (rot === 270) {
        localDx = -dy;
        localDy = dx;
      }

      this.template.update(t => ({
         ...t,
         elements: t.elements.map((x: any) => activeIds.includes(x.id) ? {
             ...x,
             x: Number((x.x + localDx).toFixed(2)),
             y: Number((x.y + localDy).toFixed(2))
         } : x)
      }));
    }
  }

}
