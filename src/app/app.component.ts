import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'barcode-generator';
  config: any;
  ipAddress: any;
  routerUrl = '';
  public static fireEvent: Subject<any> = new Subject();

  constructor(
    private router: Router,
  ) {}
}
