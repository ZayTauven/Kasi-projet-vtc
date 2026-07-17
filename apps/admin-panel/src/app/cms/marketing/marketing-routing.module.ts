import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'coupons', pathMatch: 'full' },
  { path: 'coupons', loadChildren: () => import('./coupons/coupons.module').then(m => m.CouponsModule) },
  { path: 'gift-cards', loadChildren: () => import('./gift-cards/gift-cards.module').then(m => m.GiftCardsModule) },
  { path: 'announcements', loadChildren: () => import('./announcements/announcements.module').then(m => m.AnnouncementsModule) },
  { path: 'rewards', loadChildren: () => import('./rewards/rewards.module').then(m => m.RewardsModule) }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MarketingRoutingModule { }
