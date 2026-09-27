import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { DashboardComponent } from './pages/dashboard/dashboard.component';

export const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        redirectTo: 'create-barcode',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'create-barcode',
        loadChildren: () =>
          import('./pages/barcode-label-generator/barcode-label-generator.module')
            .then(m => m.BarcodeLabelGeneratorModule)
      },
      {
        path: 'create-cheque',
        loadChildren: () =>
          import('./pages/cheque-template-generator/cheque-template-generator.module')
            .then(m => m.ChequeTemplateGeneratorModule)
      }
    ]
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      preloadingStrategy: PreloadAllModules
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}