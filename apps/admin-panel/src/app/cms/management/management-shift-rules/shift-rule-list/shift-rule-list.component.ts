import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApolloQueryResult } from '@apollo/client/core';
import { ShiftRuleListQuery } from '@kasi/admin-panel/generated/graphql';
import { TableService } from '@kasi/admin-panel/src/app/@services/table-service';
import { map, Observable } from 'rxjs';

@Component({
  selector: 'app-shift-rule-list',
  templateUrl: './shift-rule-list.component.html',
})
export class ShiftRuleListComponent implements OnInit {
  query?: Observable<ApolloQueryResult<ShiftRuleListQuery>>;

  constructor(
    private route: ActivatedRoute,
    public tableService: TableService
  ) {}

  ngOnInit(): void {
    this.query = this.route.data.pipe(map((data) => data.shiftRules));
  }
}
