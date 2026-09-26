import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BarcodeLabelGeneratorComponent } from './barcode-label-generator.component';
import { BarcodeLabelGeneratorRoutingModule } from './barcode-label-generator.routing';

@NgModule({
  declarations: [
    // BarcodeLabelGeneratorComponent
  ],
  imports: [
    CommonModule,
    BarcodeLabelGeneratorRoutingModule
  ]
})
export class BarcodeLabelGeneratorModule {}