import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { CurrentConfigurationGQL } from '@kasi/admin-panel/generated/graphql';
import { TranslateService } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ConfigGuard  {
  constructor(
    private router: Router,
    private msg: NzMessageService,
    private currentConfigGql: CurrentConfigurationGQL,
    private translate: TranslateService
  ) {}

  async canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean | UrlTree> {
    const result = await firstValueFrom(this.currentConfigGql.fetch({ variables: {} }));
    if (
      result.data!.currentConfiguration.firebaseProjectPrivateKey == null
    ) {
      return true;
    } else {
      this.msg.warning(
        this.translate.instant('msg.systemAlreadyConfigured')
      );
      this.router.navigate(['../login']);
      return false;
    }
  }
}
