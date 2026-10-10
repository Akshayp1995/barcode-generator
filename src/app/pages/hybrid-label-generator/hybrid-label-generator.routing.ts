import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HybridLabelGeneratorComponent } from './hybrid-label-generator.component';


const routes: Routes = [
  {
    path: '',
    component: HybridLabelGeneratorComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HybridLabelGeneratorRoutingModule {}