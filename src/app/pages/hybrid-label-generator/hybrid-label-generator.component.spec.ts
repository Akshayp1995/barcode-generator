import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HybridLabelGeneratorComponent } from './hybrid-label-generator.component';

describe('HybridLabelGeneratorComponent', () => {
  let component: HybridLabelGeneratorComponent;
  let fixture: ComponentFixture<HybridLabelGeneratorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HybridLabelGeneratorComponent]
    });
    fixture = TestBed.createComponent(HybridLabelGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
