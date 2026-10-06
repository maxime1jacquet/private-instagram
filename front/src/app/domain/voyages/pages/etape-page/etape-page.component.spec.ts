import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { EtapePageComponent } from './etape-page.component';
import { VoyagesService } from '../../services/voyages.service';
import { EtapeDetail, TravelState } from '../../models/voyage.model';

describe('EtapePageComponent', () => {
  it('sanitizes editor HTML and ignores stale responses after changing step', () => {
    const params = new BehaviorSubject(convertToParamMap({ voyageId: 'a', etapeId: 'one' }));
    const stale = new Subject<TravelState<EtapeDetail>>();
    const detail: EtapeDetail = {
      voyage: { id: 'a', title: 'Portugal', image: null },
      etape: {
        id: 'two',
        voyageId: 'a',
        title: 'Porto',
        image: null,
        created: '',
        description: '<p>Souvenir</p><img src="x" onerror="alert(1)"><script>alert(1)</script>',
      },
      images: [],
    };
    const service = {
      etape: vi
        .fn()
        .mockReturnValueOnce(stale)
        .mockReturnValue(of({ status: 'ready', data: detail, error: '' })),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: VoyagesService, useValue: service },
      ],
    });
    const fixture = TestBed.createComponent(EtapePageComponent);
    fixture.detectChanges();
    params.next(convertToParamMap({ voyageId: 'a', etapeId: 'two' }));
    fixture.detectChanges();
    stale.next({ status: 'error', data: null, error: 'Ancienne réponse' });
    fixture.detectChanges();
    expect(service.etape).toHaveBeenLastCalledWith('a', 'two');
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Porto');
    expect(fixture.nativeElement.querySelector('.travel-prose').innerHTML).not.toMatch(
      /onerror|<script/,
    );
    expect(fixture.nativeElement.textContent).not.toContain('Ancienne réponse');
  });
});
