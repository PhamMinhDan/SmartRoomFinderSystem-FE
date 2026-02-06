// home-page.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroComponent } from '../../components/hero/hero.component';
import { QuickFiltersComponent } from '../../components/quick-filters/quick-filters.component';
import { FeaturedListingsComponent } from '../../components/featured-listings/featured-listings.component';
import { BenefitsComponent } from '../../components/benefits/benefits.component';
import { HowItWorksComponent } from '../../components/how-it-works/how-it-works.component';
import { TestimonialsComponent } from '../../components/testimonials/testimonials.component';
import { CtaBannerComponent } from '../../components/cta-banner/cta-banner.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    HeroComponent,
    QuickFiltersComponent,
    FeaturedListingsComponent,
    BenefitsComponent,
    HowItWorksComponent,
    TestimonialsComponent,
    CtaBannerComponent
  ],
  template: `
    <div>
      <app-hero></app-hero>
      <app-quick-filters></app-quick-filters>
      <app-featured-listings></app-featured-listings>
      <app-benefits></app-benefits>
      <app-how-it-works></app-how-it-works>
      <app-testimonials></app-testimonials>
      <app-cta-banner></app-cta-banner>
    </div>
  `
})
export class HomePageComponent {}