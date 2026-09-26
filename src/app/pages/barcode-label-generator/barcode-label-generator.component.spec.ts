import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarcodeLabelGeneratorComponent } from './barcode-label-generator.component';

describe('BarcodeLabelGeneratorComponent', () => {
  let component: BarcodeLabelGeneratorComponent;
  let fixture: ComponentFixture<BarcodeLabelGeneratorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BarcodeLabelGeneratorComponent]
    });
    fixture = TestBed.createComponent(BarcodeLabelGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
