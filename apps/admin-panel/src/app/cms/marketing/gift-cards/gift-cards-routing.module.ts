import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { GiftBatchesListComponent } from './gift-batches-list/gift-batches-list.component';
import { GiftBatchNewComponent } from './gift-batch-new/gift-batch-new.component';
import { GiftBatchViewComponent } from './gift-batch-view/gift-batch-view.component';
import { GiftBatchListResolver } from './gift-batches-list/gift-batch-list.resolver';
import { GiftBatchViewResolver } from './gift-batch-view/gift-batch-view.resolver';

const routes: Routes = [
  { path: '', component: GiftBatchesListComponent, resolve: { giftBatches: GiftBatchListResolver }, runGuardsAndResolvers: 'paramsOrQueryParamsChange' },
  { path: 'new', component: GiftBatchNewComponent },
  { path: 'view/:id', component: GiftBatchViewComponent, resolve: { giftBatch: GiftBatchViewResolver } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [
    GiftBatchListResolver,
    GiftBatchViewResolver
  ]
})
export class GiftCardsRoutingModule { }
