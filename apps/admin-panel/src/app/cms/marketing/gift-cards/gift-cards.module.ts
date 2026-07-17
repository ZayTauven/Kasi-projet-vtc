import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { GiftCardsRoutingModule } from './gift-cards-routing.module';
import { GiftBatchesListComponent } from './gift-batches-list/gift-batches-list.component';
import { GiftBatchNewComponent } from './gift-batch-new/gift-batch-new.component';
import { GiftBatchViewComponent } from './gift-batch-view/gift-batch-view.component';
import { SharedModule } from '@kasi/admin-panel/src/app/@components/shared.module';

@NgModule({
  declarations: [GiftBatchesListComponent, GiftBatchNewComponent, GiftBatchViewComponent],
  imports: [
    CommonModule,
    GiftCardsRoutingModule,
    SharedModule
  ]
})
export class GiftCardsModule { }
