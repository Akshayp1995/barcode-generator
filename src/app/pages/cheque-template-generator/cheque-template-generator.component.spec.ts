import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChequeTemplateGeneratorComponent } from './cheque-template-generator.component';

describe('ChequeTemplateGeneratorComponent', () => {
  let component: ChequeTemplateGeneratorComponent;
  let fixture: ComponentFixture<ChequeTemplateGeneratorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChequeTemplateGeneratorComponent]
    });
    fixture = TestBed.createComponent(ChequeTemplateGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
