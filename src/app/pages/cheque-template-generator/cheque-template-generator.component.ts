import { Component, ChangeDetectionStrategy, signal, computed, ViewChild, ElementRef, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ChequeField {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  top: number | string;
  left: number | string;
  right: number | string;
  bottom: number | string;
  fontSize: number;
  lineHeight: number;
  rotation: number;
  width?: number | string;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  fontStyle?: 'normal' | 'italic';
  fontWeight?: 'normal' | 'bold';
  isCustom?: boolean;
}

const DEFAULT_FIELDS: ChequeField[] = [
  { id: 'f-date', label: 'Date', value: 'DD / MM / YYYY', visible: true, top: 10, left: 160, right: '', bottom: '', fontSize: 14, lineHeight: 1.5, rotation: 0, letterSpacing: 0, textTransform: 'none', fontStyle: 'normal', fontWeight: 'normal' },
  { id: 'f-acpayee', label: 'A/C Payee Cross', value: '// A/C PAYEE ONLY //', visible: true, top: 5, left: 5, right: '', bottom: '', fontSize: 12, lineHeight: 1.5, rotation: -45, letterSpacing: 0, textTransform: 'none', fontStyle: 'normal', fontWeight: 'normal' },
  { id: 'f-payee', label: 'Payee Name', value: 'John Doe', visible: true, top: 32, left: 25, right: '', bottom: '', fontSize: 14, lineHeight: 1.5, rotation: 0, letterSpacing: 0, textTransform: 'none', fontStyle: 'normal', fontWeight: 'normal' },
  { id: 'f-bearer', label: 'Bearer', value: 'OR BEARER', visible: true, top: 32, left: 175, right: '', bottom: '', fontSize: 10, lineHeight: 1.5, rotation: 0, letterSpacing: 0, textTransform: 'none', fontStyle: 'normal', fontWeight: 'normal' },
  { id: 'f-words', label: 'Amount in Words', value: 'Fifty Thousand Rupees Only', visible: true, top: 48, left: 35, right: '', bottom: '', fontSize: 14, lineHeight: 1.5, rotation: 0, letterSpacing: 0, textTransform: 'none', fontStyle: 'normal', fontWeight: 'normal' },
  { id: 'f-numbers', label: 'Amount in Numbers', value: '50,000.00', visible: true, top: 50, left: 160, right: '', bottom: '', fontSize: 14, lineHeight: 1.5, rotation: 0, letterSpacing: 0, textTransform: 'none', fontStyle: 'normal', fontWeight: 'normal' },
  { id: 'f-account', label: 'Account Number', value: 'XXXX-XXXX-1234', visible: true, top: 65, left: 25, right: '', bottom: '', fontSize: 14, lineHeight: 1.5, rotation: 0, letterSpacing: 0, textTransform: 'none', fontStyle: 'normal', fontWeight: 'normal' },
  { id: 'f-notover', label: 'Amount Not Over', value: 'NOT OVER 50000', visible: true, top: 70, left: 155, right: '', bottom: '', fontSize: 10, lineHeight: 1.5, rotation: 0, letterSpacing: 0, textTransform: 'none', fontStyle: 'normal', fontWeight: 'normal' },
];

@Component({
  selector: 'app-cheque-template-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cheque-template-generator.component.html',
  styleUrls: ['./cheque-template-generator.component.css']
})
export class ChequeTemplateGeneratorComponent implements OnInit {

  // Signals for state management
  templateName = signal('My Standard Cheque');
  unit = signal('mm');
  logicalWidth = signal(203);
  logicalHeight = signal(92);
  orientation = signal<'landscape' | 'portrait'>('landscape');
  chequeFlip = signal<'none' | 'flip-h' | 'flip-v' | 'rotate-180'>('none');
  fields = signal<ChequeField[]>(DEFAULT_FIELDS);
  zoom = signal(1);
  newFieldName = signal('');
  expandedFields = signal<string[]>(['f-date', 'f-payee']);
  showBackground = signal(true);

  // Library Signals
  savedTemplates = signal<any[]>([]);
  showLibraryModal = signal(false);
  saveMessage = signal('');

  @ViewChild('printContainer') printRef!: ElementRef;

  // Computed signals
  displayWidth = computed(() => this.orientation() === 'landscape' ? this.logicalWidth() : this.logicalHeight());
  displayHeight = computed(() => this.orientation() === 'landscape' ? this.logicalHeight() : this.logicalWidth());

  zoomPercent = computed(() => Math.round(this.zoom() * 100));
  
  canvasWidth = computed(() => `${this.displayWidth()}${this.unit()}`);
  canvasHeight = computed(() => `${this.displayHeight()}${this.unit()}`);

  visibleFields = computed(() => this.fields().filter(f => f.visible));

  // Drag state
  draggingField: string | null = null;
  dragStartX = 0;
  dragStartY = 0;
  dragStartLeft = 0;
  dragStartTop = 0;

  ngOnInit() {
    // Load saved templates from localStorage on init
    const saved = localStorage.getItem('chequePrintPro_templates');
    if (saved) {
      try {
        this.savedTemplates.set(JSON.parse(saved));
      } catch(e) {
        console.error('Failed to parse saved templates');
      }
    }
  }

  trackById(index: number, field: ChequeField): string {
    return field.id;
  }

  // --- Methods ---

  onDisplayWidthChange(val: any) {
    const num = Number(val);
    if (isNaN(num)) return;
    if (this.orientation() === 'landscape') {
      this.logicalWidth.set(num);
    } else {
      this.logicalHeight.set(num);
    }
  }

  onDisplayHeightChange(val: any) {
    const num = Number(val);
    if (isNaN(num)) return;
    if (this.orientation() === 'landscape') {
      this.logicalHeight.set(num);
    } else {
      this.logicalWidth.set(num);
    }
  }

  onUnitChange(newUnit: string) {
    const oldUnit = this.unit();
    if (oldUnit === newUnit) return;

    this.logicalWidth.set(this.convertUnit(this.logicalWidth(), oldUnit, newUnit) as number);
    this.logicalHeight.set(this.convertUnit(this.logicalHeight(), oldUnit, newUnit) as number);

    this.fields.update(prev => prev.map(f => ({
      ...f,
      top: this.convertUnit(f.top, oldUnit, newUnit),
      bottom: this.convertUnit(f.bottom, oldUnit, newUnit),
      left: this.convertUnit(f.left, oldUnit, newUnit),
      right: this.convertUnit(f.right, oldUnit, newUnit),
      width: this.convertUnit(f.width ?? null, oldUnit, newUnit)
    })));

    this.unit.set(newUnit);
  }

  convertUnit(val: number | string | null, from: string, to: string): any {
    if (val === null || val === '') return val;
    const num = Number(val);
    if (isNaN(num)) return val;
    if (from === to) return num;

    // Convert from current unit to mm first
    let mmVal = num;
    if (from === 'in') mmVal = num * 25.4;
    else if (from === 'px') mmVal = (num * 25.4) / 96;

    // Convert from mm to target unit
    let result = mmVal;
    if (to === 'in') result = mmVal / 25.4;
    else if (to === 'px') result = (mmVal * 96) / 25.4;

    return Math.round(result * 100) / 100;
  }

  isFieldExpanded(id: string): boolean {
    return this.expandedFields().includes(id);
  }

  toggleFieldExpand(id: string) {
    this.expandedFields.update(prev => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  }

  toggleFieldVisibility(event: Event, id: string) {
    event.stopPropagation();
    this.fields.update(prev => 
      prev.map(f => f.id === id ? { ...f, visible: !f.visible } : f)
    );
  }

  updateField(id: string, key: keyof ChequeField, value: any) {
    this.fields.update(prev => 
      prev.map(f => f.id === id ? { ...f, [key]: value } : f)
    );
  }

  deleteField(event: Event, id: string) {
    event.stopPropagation();
    this.fields.update(prev => prev.filter(f => f.id !== id));
  }

  addCustomField() {
    const name = this.newFieldName().trim();
    if (!name) return;
    
    const newId = `f-custom-${Date.now()}`;
    const newField: ChequeField = {
      id: newId,
      label: name,
      value: 'Custom Value',
      visible: true,
      top: this.convertUnit(10, 'mm', this.unit()), left: this.convertUnit(10, 'mm', this.unit()), right: '', bottom: '', width: '',
      fontSize: 12, lineHeight: 1.5, rotation: 0, letterSpacing: 0,
      textTransform: 'none', fontStyle: 'normal', fontWeight: 'normal',
      isCustom: true
    };
    
    this.fields.update(prev => [...prev, newField]);
    this.newFieldName.set('');
    this.expandedFields.update(prev => [...prev, newId]);
  }

  // --- Library Methods ---
  
  saveTemplate() {
    const newTmpl = {
      id: Date.now().toString(),
      name: this.templateName(),
      unit: this.unit(),
      logicalWidth: this.logicalWidth(),
      logicalHeight: this.logicalHeight(),
      orientation: this.orientation(),
      chequeFlip: this.chequeFlip(),
      fields: JSON.parse(JSON.stringify(this.fields())) // Deep copy of fields array
    };
    
    this.savedTemplates.update(prev => {
      const existingIndex = prev.findIndex(t => t.name === newTmpl.name);
      let next = [...prev];
      if (existingIndex >= 0) {
        next[existingIndex] = { ...newTmpl, id: prev[existingIndex].id }; // Overwrite but keep ID
      } else {
        next.push(newTmpl);
      }
      localStorage.setItem('chequePrintPro_templates', JSON.stringify(next));
      return next;
    });
    
    this.saveMessage.set('Saved to Library!');
    setTimeout(() => this.saveMessage.set(''), 2500);
  }
  
  loadTemplate(tmpl: any) {
    this.templateName.set(tmpl.name);
    this.unit.set(tmpl.unit);
    this.logicalWidth.set(tmpl.logicalWidth);
    this.logicalHeight.set(tmpl.logicalHeight);
    this.orientation.set(tmpl.orientation || 'landscape');
    this.chequeFlip.set(tmpl.chequeFlip || 'none');
    this.fields.set(tmpl.fields);
    this.showLibraryModal.set(false);
  }
  
  deleteTemplate(id: string) {
    this.savedTemplates.update(prev => {
      const next = prev.filter(t => t.id !== id);
      localStorage.setItem('chequePrintPro_templates', JSON.stringify(next));
      return next;
    });
  }

  // --- Drag & Drop Interaction ---
  
  startDrag(event: MouseEvent, field: ChequeField) {
    const leftVal = Number(field.left);
    const topVal = Number(field.top);
    
    this.draggingField = field.id;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    
    // Default to 0 if invalid/empty (for elements aligned via right/bottom)
    this.dragStartLeft = isNaN(leftVal) ? 0 : leftVal;
    this.dragStartTop = isNaN(topVal) ? 0 : topVal;
    
    event.preventDefault(); // prevent text selection
    event.stopPropagation();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.draggingField) return;

    // Apply zoom factor mapping
    const dx = (event.clientX - this.dragStartX) / this.zoom();
    const dy = (event.clientY - this.dragStartY) / this.zoom();

    // Convert pixel delta into current units (browser pixel-to-inch ratio is 96 DPI)
    let deltaUnitX = dx;
    let deltaUnitY = dy;
    if (this.unit() === 'mm') { deltaUnitX = (dx * 25.4) / 96; deltaUnitY = (dy * 25.4) / 96; }
    if (this.unit() === 'in') { deltaUnitX = dx / 96; deltaUnitY = dy / 96; }

    let finalDeltaX = deltaUnitX;
    let finalDeltaY = deltaUnitY;

    // In portrait mode, the inner canvas is mathematically rotated, so axes flip!
    if (this.orientation() === 'portrait') {
      finalDeltaX = deltaUnitY;
      finalDeltaY = -deltaUnitX;
    }

    // Apply flip inversions so drag follows the mouse direction correctly
    const flip = this.chequeFlip();
    if (flip === 'flip-h') {
      finalDeltaX = -finalDeltaX;
    } else if (flip === 'flip-v') {
      finalDeltaY = -finalDeltaY;
    } else if (flip === 'rotate-180') {
      finalDeltaX = -finalDeltaX;
      finalDeltaY = -finalDeltaY;
    }

    const newLeft = this.dragStartLeft + finalDeltaX;
    const newTop = this.dragStartTop + finalDeltaY;

    this.updateField(this.draggingField, 'left', Math.round(newLeft * 100) / 100);
    this.updateField(this.draggingField, 'top', Math.round(newTop * 100) / 100);
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    this.draggingField = null;
  }

  // --- Styles Computation ---

  getContainerStyles() {
    const showBg = this.showBackground();
    return {
      'box-shadow': showBg ? '0 .5rem 1rem rgba(0,0,0,.15)' : 'none',
      'border': showBg ? '1px solid #dee2e6' : '1px dashed #adb5bd',
      'background-image': showBg ? `url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='20' height='20' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 20 0 L 0 0 0 20' fill='none' stroke='%23f8f9fa' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")` : 'none'
    };
  }

  getInnerWrapperStyles() {
    const isPortrait = this.orientation() === 'portrait';
    const unitStr = this.unit();
    return {
      width: `${this.logicalWidth()}${unitStr}`,
      height: `${this.logicalHeight()}${unitStr}`,
      transform: isPortrait ? `rotate(90deg) translateY(-100%)` : 'none',
      transformOrigin: 'top left',
      position: 'absolute' as const,
      top: 0,
      left: 0
    };
  }

  getFlipWrapperStyles() {
    const flip = this.chequeFlip();
    let transform = 'none';
    if (flip === 'rotate-180') transform = 'rotate(180deg)';
    else if (flip === 'flip-h') transform = 'scaleX(-1)';
    else if (flip === 'flip-v') transform = 'scaleY(-1)';

    return {
      width: '100%',
      height: '100%',
      transform: transform,
      transformOrigin: 'center center',
      position: 'absolute' as const,
      top: 0,
      left: 0
    };
  }

  getFieldStyles(field: ChequeField) {
    const unitStr = this.unit();
    const style: any = {
      'font-size': `${field.fontSize}px`,
      'line-height': field.lineHeight,
      'transform': `rotate(${field.rotation || 0}deg)`,
      'transform-origin': 'top left',
      'color': '#000',
      'font-family': 'monospace, Arial, sans-serif',
      'letter-spacing': `${field.letterSpacing || 0}px`,
      'text-transform': field.textTransform || 'none',
      'font-style': field.fontStyle || 'normal',
      'font-weight': field.fontWeight || 'normal'
    };

    if (field.top !== '' && field.top !== null) style.top = `${field.top}${unitStr}`;
    if (field.bottom !== '' && field.bottom !== null) style.bottom = `${field.bottom}${unitStr}`;
    if (field.left !== '' && field.left !== null) style.left = `${field.left}${unitStr}`;
    if (field.right !== '' && field.right !== null) style.right = `${field.right}${unitStr}`;
    if (field.width !== '' && field.width !== null && field.width !== undefined) {
      style.width = `${field.width}${unitStr}`;
      style['word-wrap'] = 'break-word';
    }

    return style;
  }

  // --- Export ---

  copyHTML() {
    const unitStr = this.unit();
    const containerW = this.displayWidth();
    const containerH = this.displayHeight();
    const isPortrait = this.orientation() === 'portrait';
    const flip = this.chequeFlip();

    let flipTransform = 'none';
    if (flip === 'rotate-180') flipTransform = 'rotate(180deg)';
    else if (flip === 'flip-h') flipTransform = 'scaleX(-1)';
    else if (flip === 'flip-v') flipTransform = 'scaleY(-1)';

    let css = `
.cheque-template-container {
  position: relative;
  width: ${containerW}${unitStr};
  height: ${containerH}${unitStr};
  background-color: white;
  overflow: hidden;
}
.cheque-inner-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: ${this.logicalWidth()}${unitStr};
  height: ${this.logicalHeight()}${unitStr};
  transform-origin: top left;
  ${isPortrait ? 'transform: rotate(90deg) translateY(-100%);' : 'transform: none;'}
}
.cheque-flip-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-origin: center center;
  transform: ${flipTransform};
}
.cheque-field {
  position: absolute;
  white-space: pre-wrap;
  color: #000;
  font-family: monospace, Arial, sans-serif;
  transform-origin: top left;
}`;

    let html = `<div class="cheque-template-container">\n  <div class="cheque-inner-wrapper">\n    <div class="cheque-flip-wrapper">\n`;

    this.visibleFields().forEach(f => {
      let fieldCss = `
.${f.id} {
  font-size: ${f.fontSize}px;
  line-height: ${f.lineHeight};
  transform: rotate(${f.rotation || 0}deg);
  letter-spacing: ${f.letterSpacing || 0}px;
  text-transform: ${f.textTransform || 'none'};
  font-style: ${f.fontStyle || 'normal'};
  font-weight: ${f.fontWeight || 'normal'};`;

      if (f.top !== '' && f.top !== null) fieldCss += `\n  top: ${f.top}${unitStr};`;
      if (f.bottom !== '' && f.bottom !== null) fieldCss += `\n  bottom: ${f.bottom}${unitStr};`;
      if (f.left !== '' && f.left !== null) fieldCss += `\n  left: ${f.left}${unitStr};`;
      if (f.right !== '' && f.right !== null) fieldCss += `\n  right: ${f.right}${unitStr};`;
      
      if (f.width !== '' && f.width !== null && f.width !== undefined) {
        fieldCss += `\n  width: ${f.width}${unitStr};\n  word-wrap: break-word;`;
      }

      fieldCss += `\n}`;
      css += fieldCss;

      html += `      <div class="cheque-field ${f.id}">${f.value}</div>\n`;
    });

    html += `    </div>\n  </div>\n</div>\n\n<style>\n${css}\n</style>`;

    // Attempt to use modern Clipboard API if available and permitted
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(html).then(() => {
        this.saveMessage.set('HTML & CSS Copied!');
        setTimeout(() => this.saveMessage.set(''), 2500);
      }).catch(err => {
        console.warn('Clipboard API failed, attempting fallback...', err);
        this.fallbackCopyTextToClipboard(html);
      });
    } else {
      this.fallbackCopyTextToClipboard(html);
    }
  }

  fallbackCopyTextToClipboard(text: string) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Move off-screen to avoid visual glitch
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        this.saveMessage.set('HTML & CSS Copied!');
      } else {
        this.saveMessage.set('Failed to Copy');
      }
    } catch (err) {
      console.error('Fallback copy failed: ', err);
      this.saveMessage.set('Failed to Copy');
    }
    
    setTimeout(() => this.saveMessage.set(''), 2500);
    document.body.removeChild(textArea);
  }

  // --- Printing ---

  handlePrint() {
    if (!this.printRef) return;
    
    const printContent = this.printRef.nativeElement;
    const windowPrint = window.open('', '', 'width=900,height=600');
    if (!windowPrint) {
      console.error("Popup blocked. Could not open print window.");
      return;
    }

    const currentUnit = this.unit();
    const pageW = `${this.displayWidth()}${currentUnit}`;
    const pageH = `${this.displayHeight()}${currentUnit}`;
    
    const containerW = this.displayWidth();
    const containerH = this.displayHeight();

    windowPrint.document.write(`
      <html>
        <head>
          <title>Print Cheque - ${this.templateName()}</title>
          <style>
            @page {
              size: ${pageW} ${pageH};
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background-color: white;
            }
            .print-container {
              position: relative;
              width: ${containerW}${currentUnit} !important;
              height: ${containerH}${currentUnit} !important;
              overflow: hidden;
              box-shadow: none !important;
              border: none !important;
              background-image: none !important;
            }
            .field-element {
              position: absolute;
              white-space: pre-wrap;
              color: black !important;
            }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    windowPrint.document.close();
  }

}
