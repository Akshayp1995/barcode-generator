import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChequeTemplateGeneratorComponent } from './cheque-template-generator.component';

const routes: Routes = [
  {
    path: '',
    component: ChequeTemplateGeneratorComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChequeTemplateGeneratorRoutingModule {}