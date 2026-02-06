// src/main.server.ts
import 'zone.js/node';  // ← Dòng này rất quan trọng cho SSR/Node

import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

export default async function bootstrap(context: BootstrapContext) {
  return bootstrapApplication(AppComponent, config, context);
}