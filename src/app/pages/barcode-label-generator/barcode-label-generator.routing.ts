import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { BarcodeLabelGeneratorComponent } from './barcode-label-generator.component';

const routes: Routes = [
  {
    path: '',
    component: BarcodeLabelGeneratorComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BarcodeLabelGeneratorRoutingModule {}